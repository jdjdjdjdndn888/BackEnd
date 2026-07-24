const axios = require("axios");
const sharp = require("sharp");

const BIG_GAMES_CATALOG = "https://biggamesapi.io/api/collection/Pets";
const BIG_GAMES_IMAGE = "https://biggamesapi.io/image";
const IMAGE_CACHE_LIMIT = 128;
const renderedImageCache = new Map();

// A clean, public PS99 image used when the catalog has no matching entry.
// This is intentionally not an image from the values site.
const CLEAN_FALLBACK_IMAGE = `${BIG_GAMES_IMAGE}/14976374906`;

let catalogPromise = null;

function normalizeName(itemName) {
  let name = String(itemName || "")
    .replace(/\.(png|jpg|jpeg|webp)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // PSV prefixes variants before the pet name. Strip those prefixes so all
  // six variants share one clean base image.
  name = name.replace(/^(?:(?:rainbow|gold(?:en)?|shiny)\s+)+/i, "");

  // Also handle feeds that put the variant between the pet tier and name,
  // such as "Huge Golden Cat".
  name = name.replace(
    /^(Huge|Titanic|Gargantuan)\s+(?:(?:rainbow|gold(?:en)?|shiny)\s+)+/i,
    "$1 ",
  );

  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

async function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = axios
      .get(BIG_GAMES_CATALOG, { timeout: 30000 })
      .then((response) => {
        const map = new Map();
        for (const entry of response.data?.data || []) {
          const config = entry?.configData;
          if (!config?.name) continue;

          const assetId = String(config.thumbnail || config.goldenThumbnail || "")
            .replace(/^rbxassetid:\/\//i, "")
            .trim();
          if (!assetId) continue;

          map.set(normalizeName(config.name), assetId);
        }
        return map;
      })
      .catch((error) => {
        catalogPromise = null;
        console.warn("[ps99Images] BigGames catalog unavailable:", error.message);
        return new Map();
      });
  }

  return catalogPromise;
}

async function cleanImageUrl(itemName) {
  const catalog = await loadCatalog();
  const assetId = catalog.get(normalizeName(itemName));
  return assetId ? `${BIG_GAMES_IMAGE}/${assetId}` : CLEAN_FALLBACK_IMAGE;
}

function getCacheKey(itemName) {
  return String(itemName || "").trim().toLowerCase();
}

function rememberImage(key, image) {
  renderedImageCache.delete(key);
  renderedImageCache.set(key, image);
  while (renderedImageCache.size > IMAGE_CACHE_LIMIT) {
    renderedImageCache.delete(renderedImageCache.keys().next().value);
  }
}

function variantOverlay(variant) {
  if (variant.rainbow) {
    return Buffer.from(`
      <svg width="420" height="420" viewBox="0 0 420 420">
        <defs>
          <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff4d6d" stop-opacity=".45"/>
            <stop offset="22%" stop-color="#ffb703" stop-opacity=".38"/>
            <stop offset="45%" stop-color="#80ed99" stop-opacity=".36"/>
            <stop offset="68%" stop-color="#4cc9f0" stop-opacity=".42"/>
            <stop offset="100%" stop-color="#c77dff" stop-opacity=".46"/>
          </linearGradient>
        </defs>
        <rect width="420" height="420" fill="url(#rainbow)"/>
      </svg>
    `);
  }

  if (variant.gold) {
    return Buffer.from(`
      <svg width="420" height="420" viewBox="0 0 420 420">
        <defs>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fff1a8" stop-opacity=".42"/>
            <stop offset="38%" stop-color="#f6bd36" stop-opacity=".30"/>
            <stop offset="70%" stop-color="#b86b00" stop-opacity=".26"/>
            <stop offset="100%" stop-color="#fff3a3" stop-opacity=".42"/>
          </linearGradient>
        </defs>
        <rect width="420" height="420" fill="url(#gold)"/>
      </svg>
    `);
  }

  if (variant.shiny) {
    return Buffer.from(`
      <svg width="420" height="420" viewBox="0 0 420 420">
        <defs>
          <radialGradient id="shine" cx="25%" cy="18%" r="85%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity=".62"/>
            <stop offset="18%" stop-color="#dff8ff" stop-opacity=".22"/>
            <stop offset="54%" stop-color="#8be9ff" stop-opacity=".08"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="420" height="420" fill="url(#shine)"/>
        <path d="M74 94h62M105 63v62M344 292h42M365 271v42" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".58"/>
      </svg>
    `);
  }

  return null;
}

async function renderItemImage(itemName) {
  const name = String(itemName || "").trim();
  if (!name) throw new Error("Item name is required");

  const cacheKey = getCacheKey(name);
  const cached = renderedImageCache.get(cacheKey);
  if (cached) return cached;

  const sourceUrl = await cleanImageUrl(name);
  const source = await axios.get(sourceUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
  });

  const variant = variantForName(name);
  const overlay = variantOverlay(variant);
  let image = sharp(Buffer.from(source.data)).resize(420, 420, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  if (variant.gold) {
    image = image.modulate({ saturation: 1.18, brightness: 1.04 });
  } else if (variant.rainbow) {
    image = image.modulate({ saturation: 1.42, brightness: 1.03 });
  } else if (variant.shiny) {
    image = image.modulate({ saturation: 1.15, brightness: 1.08 }).sharpen();
  }

  const output = await (overlay
    ? image.composite([{ input: overlay, blend: variant.rainbow ? "screen" : "soft-light" }])
    : image
  ).png().toBuffer();

  rememberImage(cacheKey, output);
  return output;
}

async function sendItemImage(res, itemName) {
  const image = await renderItemImage(itemName);
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Length", image.length);
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.send(image);
}

function variantForName(itemName) {
  const name = String(itemName || "");
  return {
    rainbow: /\brainbow\b/i.test(name),
    gold: /\b(?:gold|golden)\b/i.test(name),
    shiny: /\bshiny\b/i.test(name),
  };
}

function itemNameFromPsvUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const match = parsed.pathname.match(/\/Admin\/Image\/Value\/(.+?)(?:\.(?:png|jpg|jpeg|webp))?$/i);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

module.exports = {
  BIG_GAMES_IMAGE,
  CLEAN_FALLBACK_IMAGE,
  cleanImageUrl,
  itemNameFromPsvUrl,
  normalizeName,
  renderItemImage,
  sendItemImage,
  variantForName,
};