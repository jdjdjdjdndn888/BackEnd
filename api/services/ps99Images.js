const axios = require("axios");
const sharp = require("sharp");

const BIG_GAMES_CATALOG = "https://biggamesapi.io/api/collection/Pets";
const BIG_GAMES_IMAGE   = "https://biggamesapi.io/image";
const IMAGE_CACHE_LIMIT = 256;
const renderedImageCache = new Map();

// Clean fallback when nothing matches the catalog.
const CLEAN_FALLBACK_IMAGE = `${BIG_GAMES_IMAGE}/14976374906`;

let catalogPromise = null;

// ── Catalog helpers ──────────────────────────────────────────────────────────

/** Cheap string normalisation: lower-case, collapse whitespace, drop extension. */
function cheapNorm(str) {
  return String(str || "")
    .replace(/\.(png|jpg|jpeg|webp)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Strip ALL leading variant keywords from a normalised name, handling both
 * plain ("Rainbow Cat") and size-prefixed ("Huge Rainbow Cat") forms.
 * Returns the stripped name, or the original if nothing changed.
 */
function stripVariants(name) {
  const VARIANTS = "rainbow|golden|gold|shiny|cosmic";
  const varBlock = `(?:(?:${VARIANTS})\\s+)+`;

  // "Huge Shiny Golden Cat" → "Huge Cat"
  const sizeFirst = name.replace(
    new RegExp(`^(huge|titanic|gargantuan)\\s+${varBlock}`, "i"),
    "$1 ",
  );
  if (sizeFirst !== name) return sizeFirst.replace(/\s+/g, " ").trim();

  // "Rainbow Shiny Cat" → "Cat"
  const leadingStrip = name.replace(new RegExp(`^${varBlock}`, "i"), "");
  if (leadingStrip !== name) return leadingStrip.replace(/\s+/g, " ").trim();

  return name;
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
          // Store by exact normalised name so "Rainbow Lucky Block" stays intact.
          map.set(cheapNorm(config.name), assetId);
        }
        return map;
      })
      .catch((err) => {
        catalogPromise = null;
        console.warn("[ps99Images] catalog unavailable:", err.message);
        return new Map();
      });
  }
  return catalogPromise;
}

/**
 * Resolve a catalog asset-id for an item name.
 * Strategy (in order):
 *   1. Exact normalised name       → "Titanic Rainbow Lucky Block" hits ✓
 *   2. One round of variant strip  → "Huge Rainbow Cat"  → "Huge Cat"   ✓
 *   3. Two rounds of variant strip → edge-cases like "Huge Shiny Golden X"
 */
async function resolveCatalogAssetId(itemName) {
  const catalog = await loadCatalog();
  const exact = cheapNorm(itemName);

  if (catalog.has(exact)) return catalog.get(exact);

  const once = stripVariants(exact);
  if (once !== exact && catalog.has(once)) return catalog.get(once);

  const twice = stripVariants(once);
  if (twice !== once && catalog.has(twice)) return catalog.get(twice);

  return null;
}

async function cleanImageUrl(itemName) {
  const assetId = await resolveCatalogAssetId(itemName);
  return assetId ? `${BIG_GAMES_IMAGE}/${assetId}` : CLEAN_FALLBACK_IMAGE;
}

// ── Cache ────────────────────────────────────────────────────────────────────

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

// ── SVG overlays ─────────────────────────────────────────────────────────────

function rainbowOverlay() {
  return Buffer.from(`
    <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rb1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#ff0040" stop-opacity=".82"/>
          <stop offset="16%"  stop-color="#ff6a00" stop-opacity=".78"/>
          <stop offset="33%"  stop-color="#ffe600" stop-opacity=".75"/>
          <stop offset="50%"  stop-color="#00e676" stop-opacity=".76"/>
          <stop offset="67%"  stop-color="#00b0ff" stop-opacity=".78"/>
          <stop offset="83%"  stop-color="#7c4dff" stop-opacity=".80"/>
          <stop offset="100%" stop-color="#ff4081" stop-opacity=".82"/>
        </linearGradient>
        <linearGradient id="rb2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#ff4081" stop-opacity=".35"/>
          <stop offset="50%"  stop-color="#00e5ff" stop-opacity=".28"/>
          <stop offset="100%" stop-color="#69f0ae" stop-opacity=".35"/>
        </linearGradient>
        <radialGradient id="rbSheen" cx="30%" cy="20%" r="70%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity=".45"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="420" height="420" fill="url(#rb1)"/>
      <rect width="420" height="420" fill="url(#rb2)"/>
      <rect width="420" height="420" fill="url(#rbSheen)"/>
    </svg>
  `);
}

function shinyOverlay() {
  return Buffer.from(`
    <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sh1" cx="22%" cy="16%" r="60%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity=".95"/>
          <stop offset="12%"  stop-color="#e8f7ff" stop-opacity=".72"/>
          <stop offset="35%"  stop-color="#b3ecff" stop-opacity=".38"/>
          <stop offset="65%"  stop-color="#7dd3fc" stop-opacity=".12"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="sh2" cx="75%" cy="78%" r="40%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity=".55"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="420" height="420" fill="url(#sh1)"/>
      <rect width="420" height="420" fill="url(#sh2)"/>
      <!-- 4-point starburst top-left -->
      <path d="M88 108 L96 76 L104 108 L136 116 L104 124 L96 156 L88 124 L56 116 Z" fill="#ffffff" opacity=".92"/>
      <!-- Rays from top-left star -->
      <path d="M96 76 L96 44 M136 116 L168 116 M104 84 L126 62 M88 108 L66 86"
            stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity=".70"/>
      <!-- Medium star top-right -->
      <path d="M318 58 L323 42 L328 58 L344 63 L328 68 L323 84 L318 68 L302 63 Z" fill="#ffffff" opacity=".82"/>
      <!-- Small stars -->
      <path d="M62 318 L66 306 L70 318 L82 322 L70 326 L66 338 L62 326 L50 322 Z" fill="#ffffff" opacity=".68"/>
      <path d="M354 294 L357 286 L360 294 L368 297 L360 300 L357 308 L354 300 L346 297 Z" fill="#ffffff" opacity=".60"/>
    </svg>
  `);
}

function goldenOverlay() {
  return Buffer.from(`
    <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gd1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#fff8a0" stop-opacity=".72"/>
          <stop offset="25%"  stop-color="#ffd700" stop-opacity=".62"/>
          <stop offset="55%"  stop-color="#b8860b" stop-opacity=".52"/>
          <stop offset="80%"  stop-color="#cd9b00" stop-opacity=".58"/>
          <stop offset="100%" stop-color="#fffacd" stop-opacity=".68"/>
        </linearGradient>
        <radialGradient id="gdSheen" cx="28%" cy="22%" r="55%">
          <stop offset="0%"   stop-color="#fffde7" stop-opacity=".55"/>
          <stop offset="40%"  stop-color="#ffd740" stop-opacity=".18"/>
          <stop offset="100%" stop-color="#ffd700" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="420" height="420" fill="url(#gd1)"/>
      <rect width="420" height="420" fill="url(#gdSheen)"/>
    </svg>
  `);
}

function cosmicOverlay() {
  return Buffer.from(`
    <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cosmicBase" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#0f0c29" stop-opacity=".55"/>
          <stop offset="50%"  stop-color="#302b63" stop-opacity=".45"/>
          <stop offset="100%" stop-color="#24243e" stop-opacity=".55"/>
        </linearGradient>
        <radialGradient id="neb1" cx="25%" cy="30%" r="55%">
          <stop offset="0%"   stop-color="#7c3aed" stop-opacity=".68"/>
          <stop offset="45%"  stop-color="#4f46e5" stop-opacity=".42"/>
          <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="neb2" cx="75%" cy="70%" r="50%">
          <stop offset="0%"   stop-color="#db2777" stop-opacity=".50"/>
          <stop offset="40%"  stop-color="#7c3aed" stop-opacity=".30"/>
          <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="neb3" cx="60%" cy="20%" r="38%">
          <stop offset="0%"   stop-color="#0ea5e9" stop-opacity=".42"/>
          <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="420" height="420" fill="url(#cosmicBase)"/>
      <rect width="420" height="420" fill="url(#neb1)"/>
      <rect width="420" height="420" fill="url(#neb2)"/>
      <rect width="420" height="420" fill="url(#neb3)"/>
      <!-- Stars -->
      <circle cx="42"  cy="38"  r="2.0" fill="#fff" opacity=".90"/>
      <circle cx="118" cy="22"  r="1.5" fill="#e0e7ff" opacity=".85"/>
      <circle cx="205" cy="14"  r="2.5" fill="#fff" opacity=".95"/>
      <circle cx="310" cy="35"  r="1.5" fill="#c7d2fe" opacity=".80"/>
      <circle cx="378" cy="18"  r="2.0" fill="#fff" opacity=".88"/>
      <circle cx="28"  cy="140" r="1.5" fill="#fff" opacity=".78"/>
      <circle cx="88"  cy="195" r="2.0" fill="#e0e7ff" opacity=".82"/>
      <circle cx="160" cy="88"  r="1.5" fill="#fff" opacity=".70"/>
      <circle cx="260" cy="110" r="2.5" fill="#fff" opacity=".92"/>
      <circle cx="340" cy="90"  r="1.5" fill="#c7d2fe" opacity=".75"/>
      <circle cx="55"  cy="280" r="1.5" fill="#e0e7ff" opacity=".72"/>
      <circle cx="140" cy="310" r="2.0" fill="#fff" opacity=".88"/>
      <circle cx="295" cy="270" r="2.5" fill="#fff" opacity=".90"/>
      <circle cx="370" cy="250" r="1.5" fill="#e0e7ff" opacity=".78"/>
      <circle cx="80"  cy="380" r="1.5" fill="#fff" opacity=".70"/>
      <circle cx="320" cy="370" r="1.5" fill="#fff" opacity=".75"/>
      <!-- Twinkle starbursts -->
      <path d="M205 14 L207 8 L209 14 L215 16 L209 18 L207 24 L205 18 L199 16 Z" fill="#fff" opacity=".88"/>
      <path d="M260 110 L262 104 L264 110 L270 112 L264 114 L262 120 L260 114 L254 112 Z" fill="#e0e7ff" opacity=".80"/>
    </svg>
  `);
}

// ── Variant detection ────────────────────────────────────────────────────────

function variantForName(itemName) {
  const n = String(itemName || "");
  const rainbow = /\brainbow\b/i.test(n);
  const cosmic  = /\bcosmic\b/i.test(n);
  const golden  = /\bgolden\b/i.test(n);
  // "Gold X" but not "Golden X"
  const gold    = /\bgold\b/i.test(n) && !golden;
  const shiny   = /\bshiny\b/i.test(n);
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

  // Colour-grading pass
  let image = sharp(Buffer.from(source.data)).resize(420, 420, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  if (variant.rainbow) {
    image = image.modulate({ saturation: 2.0, brightness: 1.06 });
  } else if (variant.cosmic) {
    image = image.modulate({ saturation: 0.75, brightness: 0.92 });
  } else if (variant.golden || variant.gold) {
    image = image.modulate({ saturation: 1.25, brightness: 1.08 });
  }
  if (variant.shiny) {
    image = image.modulate({ saturation: 1.22, brightness: 1.14 }).sharpen({ sigma: 1.2 });
  }

  // Build composite stack (order matters: base effects first, shiny last)
  const composites = [];
  if (variant.rainbow) composites.push({ input: rainbowOverlay(), blend: "screen"     });
  if (variant.cosmic)  composites.push({ input: cosmicOverlay(),  blend: "screen"     });
  if (variant.golden || variant.gold)
                       composites.push({ input: goldenOverlay(),  blend: "soft-light" });
  if (variant.shiny)   composites.push({ input: shinyOverlay(),   blend: "screen"     });

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
    const match = parsed.pathname.match(
      /\/Admin\/Image\/Value\/(.+?)(?:\.(?:png|jpg|jpeg|webp))?$/i,
    );
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

// Keep normalizeName exported for any callers that still use it,
// but point it at the same cheap normaliser (no variant stripping).
function normalizeName(itemName) {
  return cheapNorm(itemName);
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
