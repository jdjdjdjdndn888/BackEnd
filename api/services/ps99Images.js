const axios = require("axios");
const sharp = require("sharp");

const BIG_GAMES_CATALOG = "https://biggamesapi.io/api/collection/Pets";
const BIG_GAMES_IMAGE = "https://biggamesapi.io/image";
const IMAGE_CACHE_LIMIT = 128;
const renderedImageCache = new Map();

// A clean, public PS99 image used when the catalog has no matching entry.
const CLEAN_FALLBACK_IMAGE = `${BIG_GAMES_IMAGE}/14976374906`;

let catalogPromise = null;

function normalizeName(itemName) {
  let name = String(itemName || "")
    .replace(/\.(png|jpg|jpeg|webp)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip all variant prefixes so all variants share one clean base image.
  name = name.replace(/^(?:(?:rainbow|gold(?:en)?|shiny|cosmic)\s+)+/i, "");

  // Also handle feeds that put the variant between the pet tier and name,
  // such as "Huge Golden Cat" or "Huge Cosmic Cat".
  name = name.replace(
    /^(Huge|Titanic|Gargantuan)\s+(?:(?:rainbow|gold(?:en)?|shiny|cosmic)\s+)+/i,
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

// ── Overlay SVGs ──────────────────────────────────────────────────────────────

function rainbowOverlay() {
  // Strong, vivid rainbow with multiple layered gradients and a prismatic sheen
  return Buffer.from(`
    <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#ff0040" stop-opacity=".82"/>
          <stop offset="16%"  stop-color="#ff6a00" stop-opacity=".78"/>
          <stop offset="33%"  stop-color="#ffe600" stop-opacity=".75"/>
          <stop offset="50%"  stop-color="#00e676" stop-opacity=".76"/>
          <stop offset="67%"  stop-color="#00b0ff" stop-opacity=".78"/>
          <stop offset="83%"  stop-color="#7c4dff" stop-opacity=".80"/>
          <stop offset="100%" stop-color="#ff4081" stop-opacity=".82"/>
        </linearGradient>
        <linearGradient id="rainbow2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#ff4081" stop-opacity=".35"/>
          <stop offset="50%"  stop-color="#00e5ff" stop-opacity=".28"/>
          <stop offset="100%" stop-color="#69f0ae" stop-opacity=".35"/>
        </linearGradient>
        <radialGradient id="rainbowSheen" cx="30%" cy="20%" r="70%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity=".45"/>
          <stop offset="40%"  stop-color="#ffffff" stop-opacity=".10"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="420" height="420" fill="url(#rainbow)"/>
      <rect width="420" height="420" fill="url(#rainbow2)"/>
      <rect width="420" height="420" fill="url(#rainbowSheen)"/>
    </svg>
  `);
}

function shinyOverlay() {
  // Very bright sparkle with large white highlight and multiple starburst points
  return Buffer.from(`
    <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="shine1" cx="22%" cy="16%" r="60%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity=".95"/>
          <stop offset="12%"  stop-color="#e8f7ff" stop-opacity=".72"/>
          <stop offset="35%"  stop-color="#b3ecff" stop-opacity=".38"/>
          <stop offset="65%"  stop-color="#7dd3fc" stop-opacity=".12"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="shine2" cx="75%" cy="78%" r="40%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity=".55"/>
          <stop offset="30%"  stop-color="#e0f2fe" stop-opacity=".22"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- Primary highlight -->
      <rect width="420" height="420" fill="url(#shine1)"/>
      <!-- Secondary highlight -->
      <rect width="420" height="420" fill="url(#shine2)"/>
      <!-- Large 4-point star burst top-left -->
      <path d="M88 108 L96 76 L104 108 L136 116 L104 124 L96 156 L88 124 L56 116 Z"
            fill="#ffffff" opacity=".92"/>
      <!-- Medium star top-right -->
      <path d="M318 58 L323 42 L328 58 L344 63 L328 68 L323 84 L318 68 L302 63 Z"
            fill="#ffffff" opacity=".82"/>
      <!-- Small star bottom-left -->
      <path d="M62 318 L66 306 L70 318 L82 322 L70 326 L66 338 L62 326 L50 322 Z"
            fill="#ffffff" opacity=".68"/>
      <!-- Tiny star bottom-right -->
      <path d="M354 294 L357 286 L360 294 L368 297 L360 300 L357 308 L354 300 L346 297 Z"
            fill="#ffffff" opacity=".60"/>
      <!-- Extra sparkle lines radiating from top-left star -->
      <path d="M96 76 L96 44 M136 116 L168 116 M104 84 L126 62 M88 108 L66 86"
            stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity=".70"/>
    </svg>
  `);
}

function goldenOverlay() {
  // Rich warm gold with metallic sheen
  return Buffer.from(`
    <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#fff8a0" stop-opacity=".72"/>
          <stop offset="25%"  stop-color="#ffd700" stop-opacity=".62"/>
          <stop offset="55%"  stop-color="#b8860b" stop-opacity=".52"/>
          <stop offset="80%"  stop-color="#cd9b00" stop-opacity=".58"/>
          <stop offset="100%" stop-color="#fffacd" stop-opacity=".68"/>
        </linearGradient>
        <radialGradient id="goldSheen" cx="28%" cy="22%" r="55%">
          <stop offset="0%"   stop-color="#fffde7" stop-opacity=".55"/>
          <stop offset="40%"  stop-color="#ffd740" stop-opacity=".18"/>
          <stop offset="100%" stop-color="#ffd700" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="420" height="420" fill="url(#gold)"/>
      <rect width="420" height="420" fill="url(#goldSheen)"/>
    </svg>
  `);
}

function cosmicOverlay() {
  // Deep space: dark purple/indigo with scattered stars and nebula glow
  return Buffer.from(`
    <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="nebula1" cx="25%" cy="30%" r="55%">
          <stop offset="0%"   stop-color="#7c3aed" stop-opacity=".68"/>
          <stop offset="45%"  stop-color="#4f46e5" stop-opacity=".42"/>
          <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="nebula2" cx="75%" cy="70%" r="50%">
          <stop offset="0%"   stop-color="#db2777" stop-opacity=".50"/>
          <stop offset="40%"  stop-color="#7c3aed" stop-opacity=".30"/>
          <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="nebula3" cx="60%" cy="20%" r="38%">
          <stop offset="0%"   stop-color="#0ea5e9" stop-opacity=".42"/>
          <stop offset="60%"  stop-color="#6d28d9" stop-opacity=".18"/>
          <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="cosmicBase" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#0f0c29" stop-opacity=".55"/>
          <stop offset="50%"  stop-color="#302b63" stop-opacity=".45"/>
          <stop offset="100%" stop-color="#24243e" stop-opacity=".55"/>
        </linearGradient>
      </defs>
      <!-- Dark cosmic base -->
      <rect width="420" height="420" fill="url(#cosmicBase)"/>
      <!-- Nebula clouds -->
      <rect width="420" height="420" fill="url(#nebula1)"/>
      <rect width="420" height="420" fill="url(#nebula2)"/>
      <rect width="420" height="420" fill="url(#nebula3)"/>
      <!-- Stars scattered across the image -->
      <circle cx="42"  cy="38"  r="2.0" fill="#ffffff" opacity=".90"/>
      <circle cx="118" cy="22"  r="1.5" fill="#e0e7ff" opacity=".85"/>
      <circle cx="205" cy="14"  r="2.5" fill="#ffffff" opacity=".95"/>
      <circle cx="310" cy="35"  r="1.5" fill="#c7d2fe" opacity=".80"/>
      <circle cx="378" cy="18"  r="2.0" fill="#ffffff" opacity=".88"/>
      <circle cx="28"  cy="140" r="1.5" fill="#ffffff" opacity=".78"/>
      <circle cx="88"  cy="195" r="2.0" fill="#e0e7ff" opacity=".82"/>
      <circle cx="160" cy="88"  r="1.5" fill="#ffffff" opacity=".70"/>
      <circle cx="260" cy="110" r="2.5" fill="#ffffff" opacity=".92"/>
      <circle cx="340" cy="90"  r="1.5" fill="#c7d2fe" opacity=".75"/>
      <circle cx="398" cy="155" r="2.0" fill="#ffffff" opacity=".85"/>
      <circle cx="55"  cy="280" r="1.5" fill="#e0e7ff" opacity=".72"/>
      <circle cx="140" cy="310" r="2.0" fill="#ffffff" opacity=".88"/>
      <circle cx="200" cy="250" r="1.5" fill="#c7d2fe" opacity=".68"/>
      <circle cx="295" cy="270" r="2.5" fill="#ffffff" opacity=".90"/>
      <circle cx="370" cy="250" r="1.5" fill="#e0e7ff" opacity=".78"/>
      <circle cx="410" cy="320" r="2.0" fill="#ffffff" opacity=".82"/>
      <circle cx="80"  cy="380" r="1.5" fill="#ffffff" opacity=".70"/>
      <circle cx="190" cy="395" r="2.0" fill="#c7d2fe" opacity=".80"/>
      <circle cx="320" cy="370" r="1.5" fill="#ffffff" opacity=".75"/>
      <!-- Bright star twinkles -->
      <path d="M205 14 L207 8 L209 14 L215 16 L209 18 L207 24 L205 18 L199 16 Z"
            fill="#ffffff" opacity=".88"/>
      <path d="M260 110 L262 104 L264 110 L270 112 L264 114 L262 120 L260 114 L254 112 Z"
            fill="#e0e7ff" opacity=".80"/>
    </svg>
  `);
}

// ── Variant detection ─────────────────────────────────────────────────────────

function variantForName(itemName) {
  const name = String(itemName || "");
  const rainbow = /\brainbow\b/i.test(name);
  const cosmic  = /\bcosmic\b/i.test(name);
  const golden  = /\bgolden\b/i.test(name);
  // "Gold" but not "Golden" (e.g. "Gold Trophy")
  const gold    = /\bgold\b/i.test(name) && !golden;
  const shiny   = /\bshiny\b/i.test(name);
  return { rainbow, cosmic, golden, gold, shiny };
}

// ── Image rendering ───────────────────────────────────────────────────────────

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

  // ── Colour grading pass ───────────────────────────────────────────────────
  let image = sharp(Buffer.from(source.data)).resize(420, 420, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  if (variant.rainbow) {
    // Very saturated, slightly brightened
    image = image.modulate({ saturation: 2.0, brightness: 1.06 });
  } else if (variant.cosmic) {
    // Cool-toned, slightly desaturated base to let the nebula overlay pop
    image = image.modulate({ saturation: 0.75, brightness: 0.92 });
  } else if (variant.golden || variant.gold) {
    image = image.modulate({ saturation: 1.25, brightness: 1.08 });
  }
  if (variant.shiny) {
    image = image.modulate({ saturation: 1.22, brightness: 1.14 }).sharpen({ sigma: 1.2 });
  }

  // ── Build composites ─────────────────────────────────────────────────────
  const composites = [];

  if (variant.rainbow) {
    composites.push({ input: rainbowOverlay(), blend: "screen" });
  }
  if (variant.cosmic) {
    composites.push({ input: cosmicOverlay(), blend: "screen" });
  }
  if (variant.golden || variant.gold) {
    composites.push({ input: goldenOverlay(), blend: "soft-light" });
  }
  if (variant.shiny) {
    composites.push({ input: shinyOverlay(), blend: "screen" });
  }

  const output = await (composites.length > 0
    ? image.composite(composites)
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
