const axios = require("axios");
const cheerio = require("cheerio");

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const BASE_URL = "https://petsimulatorvalues.com";
const PAGE_URL = (page) =>
  `${BASE_URL}/values.php?category=all&page=${page}&sort=id&order=ASC`;

async function getSessionCookie() {
  const res = await axios.get(BASE_URL, {
    headers: BROWSER_HEADERS,
    timeout: 15000,
    validateStatus: () => true,
  });
  const setCookie = res.headers["set-cookie"];
  if (!setCookie) return "";
  return setCookie.map((c) => c.split(";")[0]).join("; ");
}

async function fetchPageHtml(page, cookie, retries = 3) {
  const url = PAGE_URL(page);
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: { ...BROWSER_HEADERS, Cookie: cookie, Referer: `${BASE_URL}/` },
        timeout: 20000,
        validateStatus: () => true,
      });
      if (res.status === 200) return res.data;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  return null;
}

function detectLastPage(html) {
  const $ = cheerio.load(html);
  let maxPage = 1;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/[?&]page=(\d+)/);
    if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    const text = $(el).text().trim();
    if (/^\d+$/.test(text)) maxPage = Math.max(maxPage, parseInt(text, 10));
  });
  return maxPage;
}

function toProperCase(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function unformatValue(str) {
  if (!str) return 0;
  const clean = str.trim();
  const num = parseFloat(clean);
  if (Number.isNaN(num)) return 0;
  const suffix = clean.slice(-1).toUpperCase();
  const suffixes = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, Q: 1e15 };
  if (suffixes[suffix]) return Math.round(num * suffixes[suffix]);
  return Math.round(num);
}

function parseItemsFromHtml(html) {
  const $ = cheerio.load(html);
  const results = [];
  $(".cards-groups a").each((_, el) => {
    const nameEl = $(el).find(".item-name").first();
    if (!nameEl.length) return;
    const name = toProperCase(nameEl.text().trim());
    if (!name) return;
    const valueSpan = $(el).find(".value-container").children("span").last();
    const value = valueSpan.length ? unformatValue(valueSpan.text().trim()) : 0;
    results.push({ name, value });
  });
  return results;
}

let petIconsCache = null;
let petIconsCacheTime = 0;

async function getPetIcons() {
  const now = Date.now();
  if (petIconsCache && now - petIconsCacheTime < 10 * 60 * 1000) return petIconsCache;
  const res = await axios.get("https://biggamesapi.io/api/collection/Pets", { timeout: 15000 });
  petIconsCache = res.data?.data || [];
  petIconsCacheTime = now;
  return petIconsCache;
}

function resolveImage(itemName, petIcons) {
  let checkName = itemName.toLowerCase();
  let golden = false;

  if (checkName.startsWith("golden ")) {
    checkName = checkName.replace("golden ", "");
    golden = true;
  }
  if (checkName.startsWith("rainbow ")) {
    checkName = checkName.replace("rainbow ", "");
  }
  if (checkName.startsWith("shiny ")) {
    checkName = checkName.replace("shiny ", "");
  }

  const match = petIcons.find(
    (p) => (p.configData?.name || "").toLowerCase() === checkName
  );
  if (!match) return null;

  let icon = golden ? match.configData.goldenThumbnail : match.configData.thumbnail;
  if (!icon) icon = match.configData.thumbnail;
  if (!icon) return null;

  icon = icon.replace("rbxassetid://", "");
  return `https://biggamesapi.io/image/${icon}`;
}

const CONCURRENCY = 8;

async function scrapePetSimulatorValues({ onProgress } = {}) {
  const cookie = await getSessionCookie();
  const firstPageHtml = await fetchPageHtml(1, cookie);
  if (!firstPageHtml) {
    throw new Error("Unable to reach petsimulatorvalues.com (blocked or unreachable)");
  }
  const lastPage = detectLastPage(firstPageHtml);
  const petIcons = await getPetIcons();

  const itemsByName = new Map();
  const firstPageItems = parseItemsFromHtml(firstPageHtml);
  for (const it of firstPageItems) itemsByName.set(it.name, it);

  const pages = [];
  for (let p = 2; p <= lastPage; p++) pages.push(p);

  let completed = 1;
  let idx = 0;
  async function worker() {
    while (idx < pages.length) {
      const page = pages[idx++];
      const html = await fetchPageHtml(page, cookie);
      if (html) {
        const pageItems = parseItemsFromHtml(html);
        for (const it of pageItems) itemsByName.set(it.name, it);
      }
      completed++;
      if (onProgress) onProgress(completed, lastPage);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const scraped = [];
  for (const { name, value } of itemsByName.values()) {
    const image = resolveImage(name, petIcons);
    scraped.push({
      itemname: name,
      itemvalue: value,
      itemimage: image,
      game: "PS99",
    });
  }

  return { items: scraped, totalPages: lastPage };
}

module.exports = { scrapePetSimulatorValues };
