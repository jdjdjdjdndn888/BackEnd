const axios = require("axios");
const cheerio = require("cheerio");

// Categories to scrape — only Huges, Titanics, and Gargantuans
const CATEGORIES = ["huges", "titanics", "gargantuans"];

// Headers that match a real Chrome browser and bypass the site's bot detection
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  Referer: "https://petsimulatorvalues.com/",
};

const BASE_URL = "https://petsimulatorvalues.com";

// Values treated as 0
const ZERO_VALUES = new Set(["N/A", "SOON", "O/C", "PRICELESS"]);

/**
 * Build the direct image URL for an item from petsimulatorvalues.com.
 * Each item has its own image at /Admin/Image/Value/{Item Name}.png
 */
function buildImageUrl(itemName) {
  // Use the proper-cased name directly; the site uses it as-is in the path
  return `${BASE_URL}/Admin/Image/Value/${encodeURIComponent(itemName)}.png`;
}

/**
 * Convert "15.97B", "35B", "750M", "N/A", "SOON", etc. to a number.
 * Returns 0 for any non-numeric or special string.
 */
function parseValue(str) {
  if (!str) return 0;
  const clean = str.trim();
  if (ZERO_VALUES.has(clean.toUpperCase())) return 0;
  const upper = clean.toUpperCase();
  const num = parseFloat(upper);
  if (Number.isNaN(num)) return 0;
  const suffixes = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, Q: 1e15 };
  const suffix = upper.slice(-1);
  if (suffixes[suffix]) return Math.round(num * suffixes[suffix]);
  return Math.round(num);
}

/**
 * Fetch a single category page with retries.
 */
async function fetchPage(category, page, retries = 3) {
  const url = `${BASE_URL}/values.php?category=${category}&page=${page}&sort=id&order=ASC`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: BROWSER_HEADERS,
        timeout: 30000,
        decompress: true,
        validateStatus: () => true,
      });
      if (res.status === 200 && typeof res.data === "string" && res.data.length > 10000) {
        return res.data;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return null;
}

/**
 * Detect the last page number from the pagination links in the HTML.
 */
function detectLastPage(html) {
  const $ = cheerio.load(html);
  let maxPage = 1;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/[?&]page=(\d+)/);
    if (m) {
      const p = parseInt(m[1], 10);
      // page=99 or very high numbers are "last" placeholders — skip them
      if (p <= 50) maxPage = Math.max(maxPage, p);
    }
    const text = $(el).text().trim();
    if (/^\d+$/.test(text)) {
      const p = parseInt(text, 10);
      if (p <= 50) maxPage = Math.max(maxPage, p);
    }
  });
  return maxPage;
}

/**
 * Parse all item cards from a page's HTML.
 * Returns an array of { name, value, image } objects.
 */
function parseItems(html) {
  const $ = cheerio.load(html);
  const results = [];

  $(".card-box").each((_, el) => {
    // Item name from h5.item-name (site stores it in ALL CAPS)
    const rawName = $(el).find(".item-name").first().text().trim();
    if (!rawName) return;

    // Proper-case: "HUGE CAT" → "Huge Cat"
    const name = rawName
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    // Image directly from the site — each item has its own PNG
    const imgSrc = $(el).find("img").first().attr("src") || "";
    // Prefer the site's own URL; fall back to building it from the name
    const image = imgSrc && imgSrc.includes("petsimulatorvalues.com")
      ? imgSrc
      : buildImageUrl(name);

    // Value: last non-separator, non-change-indicator span inside .value-container
    let value = 0;
    const vc = $(el).find(".value-container");
    if (vc.length) {
      // The actual value is the last <span> that is NOT .value-change and NOT .value-separator
      const spans = vc.find("span").toArray();
      for (let i = spans.length - 1; i >= 0; i--) {
        const span = $(spans[i]);
        if (span.hasClass("value-change") || span.hasClass("value-separator") || span.hasClass("percentage")) continue;
        const text = span.text().trim();
        if (text) {
          value = parseValue(text);
          break;
        }
      }
    }

    results.push({ name, value, image });
  });

  return results;
}

const CONCURRENCY = 6;

/**
 * Scrape all Huge, Titanic, and Gargantuan items from petsimulatorvalues.com.
 * Returns { items: [{ itemname, itemvalue, itemimage, game }], totalPages }
 */
async function scrapePetSimulatorValues({ onProgress } = {}) {
  const allItems = new Map(); // name → { name, value, image }
  let grandTotalPages = 0;
  let grandCompleted = 0;

  for (const category of CATEGORIES) {
    // Fetch first page to detect pagination
    const firstHtml = await fetchPage(category, 1);
    if (!firstHtml) {
      console.warn(`[psvScraper] Could not fetch category "${category}" page 1 — skipping`);
      continue;
    }

    const lastPage = detectLastPage(firstHtml);
    grandTotalPages += lastPage;

    // Parse first page
    const firstItems = parseItems(firstHtml);
    for (const it of firstItems) allItems.set(it.name, it);
    grandCompleted++;
    if (onProgress) onProgress(grandCompleted, grandTotalPages);

    // Remaining pages
    const pages = [];
    for (let p = 2; p <= lastPage; p++) pages.push(p);

    let idx = 0;
    async function worker() {
      while (idx < pages.length) {
        const page = pages[idx++];
        const html = await fetchPage(category, page);
        if (html) {
          const pageItems = parseItems(html);
          for (const it of pageItems) allItems.set(it.name, it);
        }
        grandCompleted++;
        if (onProgress) onProgress(grandCompleted, grandTotalPages);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  }

  const items = [];
  for (const { name, value, image } of allItems.values()) {
    items.push({
      itemname: name,
      itemvalue: value,      // 0 if N/A / SOON / O/C / PRICELESS
      itemimage: image,      // direct URL from petsimulatorvalues.com
      game: "PS99",
    });
  }

  return { items, totalPages: grandTotalPages };
}

module.exports = { scrapePetSimulatorValues };
