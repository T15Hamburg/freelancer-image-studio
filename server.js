import { createServer } from "node:http";
import { appendFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const rootDir = resolve(".");
const publicDir = join(rootDir, "public");
const bundledDataDir = join(rootDir, "data");
const dataDir = resolve(process.env.DATA_DIR || join(rootDir, "data"));
const generatedDir = join(dataDir, "generated");
const galleryFile = join(dataDir, "gallery.json");
const frameworksFile = join(dataDir, "frameworks.json");
const tokensFile = join(dataDir, "tokens.json");
const productsFile = join(dataDir, "products.json");
const blocklistFile = join(dataDir, "blocklist.json");
const titleHistoryFile = join(dataDir, "title-history.jsonl");
const bundledTokensFile = join(bundledDataDir, "tokens.json");
const bundledProductsFile = join(bundledDataDir, "products.json");
const bundledBlocklistFile = join(bundledDataDir, "blocklist.json");

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const apiKey = process.env.OPENAI_API_KEY || "";
const accessCode = process.env.FREELANCER_ACCESS_CODE || "";
const configuredModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
const visionModel = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";

const allowedModels = new Set(["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"]);
const defaultModel = allowedModels.has(configuredModel) ? configuredModel : "gpt-image-1.5";
const allowedSizes = new Set(["auto", "1024x1024", "1024x1536", "1536x1024"]);
const allowedQuality = new Set(["auto", "low", "medium", "high"]);
const allowedFormats = new Set(["png", "jpeg", "webp"]);
const allowedBackgrounds = new Set(["auto", "opaque", "transparent"]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

await mkdir(generatedDir, { recursive: true });

const titleSlotOrder = ["BRAND", "LINE", "TYPE", "GENDER", "WEIGHT", "MATERIAL", "SIZE", "PACK", "MODIFIER", "CUT", "SKU"];
const fallbackProductTypes = ["T-Shirt", "Longsleeve", "Sweatshirt", "Hoodie", "Poloshirt", "Jogginghose", "Oxfordhemd", "Cap"];
const fallbackBrands = ["Fruit of the Loom", "Gildan", "B&C", "SOL'S", "Russell", "Neutral", "James & Nicholson", "Stedman", "Hanes", "Tee Jays"];
const fallbackSizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
const tokenSlots = ["BRAND", "LINE", "TYPE", "GENDER", "WEIGHT", "SIZE", "MATERIAL", "CUT", "PACK", "MODIFIER"];

const defaultFrameworks = [
  {
    id: "fotl-ebay-hero",
    name: "eBay Hero",
    category: "Fruit of the Loom",
    prompt: "Create a square 1:1 ecommerce marketplace hero image for Fruit of the Loom [PRODUCT TYPE], [PACK SIZE], for the German market. Use the reference product image as the source for garment shape, fit, fabric, color, and brand accuracy. Show [MODEL OR NO MODEL]. Clean white background, bright professional ecommerce lighting, high contrast, sharp edges. Composition: product/model fills most of the frame, leave top-right area clean for marketplace icons. Add clear visual space for badges: \"[PACK BADGE]\", \"[SIZE RANGE]\", \"[SHIPPING MESSAGE]\". Show available colors: [COLOR LIST]. Make it look trustworthy, clean, modern, and suitable for basic wear. Do not add fake logos, fake trust seals, prices, watermarks, unreadable tiny text, distorted clothing, extra products, or wrong brand labels.",
    builtIn: true
  },
  {
    id: "fotl-color-overview",
    name: "Color Overview",
    category: "Fruit of the Loom",
    prompt: "Create a clean ecommerce color overview image for Fruit of the Loom [PRODUCT TYPE]. Show one main [PRODUCT TYPE] large in the center and a neat grid or fan arrangement of available colors around it. Use these colors: [COLOR LIST]. White background, realistic fabric texture, consistent lighting, clean shadows. Make it very readable on mobile. Keep the top-right area empty for marketplace icons. No prices, no watermark, no fake trust seals, no tiny text.",
    builtIn: true
  },
  {
    id: "fotl-lifestyle-model",
    name: "Lifestyle Model",
    category: "Fruit of the Loom",
    prompt: "Create a realistic lifestyle ecommerce image for Fruit of the Loom [PRODUCT TYPE] worn by a friendly adult [MODEL DESCRIPTION], German/European market style. The garment should look plain, clean, basic, and comfortable. Use the reference image to preserve product shape, sleeve length, collar or hood details, fit, fabric, and color. Use a neutral studio or simple everyday background, natural pose, realistic body proportions. Focus on fit and everyday wear. No luxury fashion look, no exaggerated body, no invented logos, no generated text, no price, no watermark.",
    builtIn: true
  },
  {
    id: "fotl-feature-detail",
    name: "Feature Detail",
    category: "Fruit of the Loom",
    prompt: "Create a clean product feature image for Fruit of the Loom [PRODUCT TYPE]. Show the garment clearly with visual focus on [FEATURES: cotton fabric, collar, cuffs, hood, drawstrings, stitching, fit, pack value]. Minimal ecommerce layout, white or light grey background, large clean areas where text labels can be added later. Do not generate small text. Leave empty label spaces instead. Keep the garment realistic and brand/product accurate.",
    builtIn: true
  },
  {
    id: "fotl-pack-bundle",
    name: "Pack Bundle",
    category: "Fruit of the Loom",
    prompt: "Create a square ecommerce bundle image for Fruit of the Loom [PRODUCT TYPE] [PACK SIZE]. Show multiple folded or fanned garments to communicate pack value, with one hero garment or model if useful. White background, bright lighting, clean shadows, high contrast. Include clear badge areas for \"[PACK BADGE]\" and \"[SIZE RANGE]\" but do not render tiny text. Show these colors if relevant: [COLOR LIST]. No prices, no fake logos, no watermark, no crowded layout.",
    builtIn: true
  },
  {
    id: "fotl-background-swap",
    name: "Background Swap",
    category: "Fruit of the Loom",
    prompt: "Keep the Fruit of the Loom [PRODUCT TYPE] from the reference image accurate and replace the surroundings with [NEW BACKGROUND]. Preserve garment edges, proportions, fabric texture, color, lighting direction, and all important details. Make the final image look naturally photographed, not pasted. No fake logos, no prices, no watermark, no tiny text.",
    builtIn: true
  }
];

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

function countChars(text) {
  return Array.from(String(text)).length;
}

function normalizeToken(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/t[\s-]?shirt/g, "t-shirt")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function cleanText(value, max = 120) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function detectProductTypeFromText(text) {
  const raw = ` ${String(text || "").toLowerCase()} `;
  const checks = [
    ["Sweatshirt", /\bsweat\s*shirt\b|\bsweatshirt\b/],
    ["Longsleeve", /\blongsleeve\b|\blangarmshirt\b/],
    ["Jogginghose", /\bjogginghose\b|\bsweatpants\b/],
    ["Oxfordhemd", /\boxfordhemd\b|\boxford\s*hemd\b/],
    ["Poloshirt", /\bpolo\s*shirt\b|\bpoloshirt\b|\bpolo\b/],
    ["Hoodie", /\bhoodie\b|\bkapuzenpullover\b/],
    ["Cap", /\bbasecap\b|\bcap\b/],
    ["T-Shirt", /\bt[\s-]?shirt\b|\btshirt\b/]
  ];
  return checks.find(([, regex]) => regex.test(raw))?.[0] || "";
}

function detectBrandFromText(text) {
  const normalized = normalizeToken(text);
  return fallbackBrands.find((brand) => normalizeToken(brand) && normalized.includes(normalizeToken(brand))) || "";
}

function isAuthorized(req, body = {}) {
  if (!accessCode) return true;
  const headerCode = req.headers["x-access-code"];
  return headerCode === accessCode || body.accessCode === accessCode;
}

async function readRequestJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 90_000_000) {
      throw new Error("Request is too large. Use fewer or smaller reference images.");
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("The browser sent malformed data. Re-add the reference image and try again.");
  }
}

async function readGallery() {
  if (!existsSync(galleryFile)) return [];
  try {
    return JSON.parse(await readFile(galleryFile, "utf8"));
  } catch {
    return [];
  }
}

async function writeGallery(items) {
  await writeFile(galleryFile, JSON.stringify(items.slice(0, 200), null, 2));
}

function cleanFramework(raw, fallback = {}) {
  const id = String(raw.id || fallback.id || `framework-${randomUUID()}`)
    .trim()
    .replace(/[^\w-]/g, "-")
    .slice(0, 80);
  const name = String(raw.name || fallback.name || "Untitled framework").trim().slice(0, 80);
  const category = String(raw.category || fallback.category || "Custom").trim().slice(0, 80);
  const prompt = String(raw.prompt || fallback.prompt || "").trim().slice(0, 8000);
  const builtIn = Boolean(raw.builtIn || fallback.builtIn);

  if (!name) throw new Error("Framework name is required.");
  if (!prompt) throw new Error("Framework prompt is required.");

  return { id, name, category, prompt, builtIn };
}

async function readFrameworks() {
  if (!existsSync(frameworksFile)) {
    await writeFrameworks(defaultFrameworks);
    return defaultFrameworks;
  }

  try {
    const saved = JSON.parse(await readFile(frameworksFile, "utf8"));
    if (!Array.isArray(saved)) throw new Error("Framework file is not an array.");

    const savedById = new Map(saved.map((framework) => [framework.id, framework]));
    const mergedDefaults = defaultFrameworks.map((framework) => ({
      ...framework,
      ...(savedById.get(framework.id) || {}),
      builtIn: true
    }));
    const custom = saved.filter((framework) => !defaultFrameworks.some((item) => item.id === framework.id));
    return [...mergedDefaults, ...custom].map((framework) => cleanFramework(framework));
  } catch {
    await writeFrameworks(defaultFrameworks);
    return defaultFrameworks;
  }
}

async function writeFrameworks(frameworks) {
  const cleaned = frameworks.map((framework) => cleanFramework(framework));
  await writeFile(frameworksFile, JSON.stringify(cleaned, null, 2));
  return cleaned;
}

async function handleFrameworks(req, res) {
  if (req.method === "GET") {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: "Access code is incorrect." });
    return sendJson(res, 200, { frameworks: await readFrameworks() });
  }

  if (req.method !== "PUT") return sendText(res, 405, "Method not allowed");

  let body;
  try {
    body = await readRequestJson(req);
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }

  if (!isAuthorized(req, body)) return sendJson(res, 401, { error: "Access code is incorrect." });
  if (!Array.isArray(body.frameworks)) return sendJson(res, 400, { error: "Frameworks must be an array." });
  if (body.frameworks.length > 80) return sendJson(res, 400, { error: "Keep frameworks under 80 items." });

  try {
    const saved = await writeFrameworks(body.frameworks);
    return sendJson(res, 200, { frameworks: saved });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

async function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function readSeededJson(runtimeFile, seedFile, fallback) {
  if (existsSync(runtimeFile)) {
    return readJsonFile(runtimeFile, fallback);
  }

  const data = existsSync(seedFile) ? await readJsonFile(seedFile, fallback) : fallback;
  try {
    await writeFile(runtimeFile, JSON.stringify(data, null, 2));
  } catch {
    // Read-only deployments can still use the bundled seed files.
  }
  return data;
}

async function readTokenLibrary() {
  const data = await readSeededJson(tokensFile, bundledTokensFile, { version: "local", tokens: [] });
  return {
    version: data.version || "local",
    tokens: Array.isArray(data.tokens) ? data.tokens : []
  };
}

async function readProductMaster() {
  const data = await readSeededJson(productsFile, bundledProductsFile, { version: "local", products: [] });
  return {
    version: data.version || "local",
    products: Array.isArray(data.products) ? data.products : []
  };
}

async function readBlocklist() {
  const data = await readSeededJson(blocklistFile, bundledBlocklistFile, { blocklist: [] });
  return new Set((Array.isArray(data.blocklist) ? data.blocklist : []).map(normalizeToken));
}

async function writeTokenLibrary(library) {
  const payload = {
    version: new Date().toISOString().slice(0, 10),
    tokens: Array.isArray(library.tokens) ? library.tokens : []
  };
  await writeFile(tokensFile, JSON.stringify(payload, null, 2));
  return payload;
}

function tokenScore(token) {
  if (!token) return 0;
  return Number(token.search_volume_score ?? token.score ?? 0) || 0;
}

function tokenFromText(text, slot, score, extra = {}) {
  const clean = cleanText(text);
  return {
    id: extra.id || `${slot.toLowerCase()}_${normalizeToken(clean)}`,
    text: clean,
    slot,
    language: extra.language || "NEUTRAL",
    search_volume_score: score,
    char_count: countChars(clean),
    ...extra
  };
}

function tokenIdFor(text, slot) {
  return `${String(slot || "MODIFIER").toLowerCase()}_${normalizeToken(text)}`.slice(0, 90);
}

function isApplicable(token, data) {
  const brands = Array.isArray(token.applicable_brands) ? token.applicable_brands : ["*"];
  const types = Array.isArray(token.applicable_types) ? token.applicable_types : ["*"];
  return (brands.includes("*") || brands.includes(data.brand))
    && (types.includes("*") || types.includes(data.type));
}

function titleCaseSizeRange(minSize, maxSize) {
  if (!minSize || !maxSize) return "";
  return minSize === maxSize ? minSize : `${minSize}-${maxSize}`;
}

function findProduct(products, data) {
  const sku = normalizeToken(data.sku);
  if (!sku) return null;
  return products.find((product) => product.brand === data.brand && normalizeToken(product.sku) === sku) || null;
}

function cleanTitleRequest(raw, products) {
  const base = {
    brand: cleanText(raw.brand || fallbackBrands[0]),
    sku: cleanText(raw.sku),
    type: cleanText(raw.type || "T-Shirt"),
    line: cleanText(raw.line),
    weight: cleanText(raw.weight).replace(/\s+/g, ""),
    minSize: cleanText(raw.minSize || ""),
    maxSize: cleanText(raw.maxSize || ""),
    sizeRange: cleanText(raw.sizeRange || titleCaseSizeRange(raw.minSize, raw.maxSize)),
    genders: Array.isArray(raw.genders) ? raw.genders.map((item) => cleanText(item, 40)).filter(Boolean) : [],
    listingKind: ["single", "pack", "variant"].includes(raw.listingKind) ? raw.listingKind : "single",
    pack: cleanText(raw.pack),
    audience: ["general", "print", "workwear", "fashion"].includes(raw.audience) ? raw.audience : "general",
    cut: cleanText(raw.cut),
    material: cleanText(raw.material),
    fit: cleanText(raw.fit),
    sleeve: cleanText(raw.sleeve),
    neck: cleanText(raw.neck),
    mpn: cleanText(raw.mpn || raw.sku)
  };

  const master = findProduct(products, base);
  return {
    ...base,
    line: base.line || master?.line || "",
    type: base.type || master?.type || "T-Shirt",
    weight: base.weight || master?.weight || "",
    minSize: base.minSize || master?.minSize || "S",
    maxSize: base.maxSize || master?.maxSize || "5XL",
    sizeRange: base.sizeRange || titleCaseSizeRange(master?.minSize, master?.maxSize),
    genders: base.genders.length ? base.genders : (master?.genders || ["Herren", "Damen"]),
    material: base.material || master?.material || "",
    fit: base.fit || master?.fit || "",
    sleeve: base.sleeve || master?.sleeve || "",
    neck: base.neck || master?.neck || base.cut || "",
    mpn: base.mpn || master?.mpn || base.sku
  };
}

function requiredTokenScore(tokens, data, slot, text, fallbackScore) {
  const matching = tokens
    .filter((token) => token.slot === slot && normalizeToken(token.text) === normalizeToken(text) && isApplicable(token, data))
    .map(tokenScore);
  return matching.length ? Math.max(...matching) : fallbackScore;
}

function isTruthfullyConfirmed(token, data) {
  if (!token.must_be_truthful) return true;
  const confirmed = [
    data.line,
    data.material,
    data.cut,
    data.fit,
    data.neck,
    data.sleeve
  ].map(normalizeToken).filter(Boolean);
  return confirmed.includes(normalizeToken(token.text));
}

function materialMatchesProduct(token, data) {
  if (token.slot !== "MATERIAL" || !data.material) return true;
  const productMaterial = normalizeToken(data.material);
  const tokenMaterial = normalizeToken(token.text);
  if (productMaterial === tokenMaterial) return true;
  return productMaterial === "baumwolle" && tokenMaterial === "cotton";
}

function buildTitleTokens(libraryTokens, blocklist, data) {
  const packRequired = data.listingKind === "pack" && data.pack
    ? tokenFromText(data.pack, "PACK", requiredTokenScore(libraryTokens, data, "PACK", data.pack, 10), { required: true })
    : null;
  const required = [
    tokenFromText(data.brand, "BRAND", requiredTokenScore(libraryTokens, data, "BRAND", data.brand, 10), { required: true }),
    data.line ? tokenFromText(data.line, "LINE", requiredTokenScore(libraryTokens, data, "LINE", data.line, 7), { required: true }) : null,
    tokenFromText(data.type, "TYPE", requiredTokenScore(libraryTokens, data, "TYPE", data.type, 10), { required: true }),
    packRequired
  ].filter(Boolean);

  const genderSet = new Set(data.genders.map(normalizeToken));

  const dynamic = [
    data.weight ? tokenFromText(data.weight.endsWith("g") ? data.weight : `${data.weight}g`, "WEIGHT", requiredTokenScore(libraryTokens, data, "WEIGHT", data.weight, 7)) : null,
    data.sizeRange ? tokenFromText(data.sizeRange, "SIZE", requiredTokenScore(libraryTokens, data, "SIZE", data.sizeRange, 8)) : null,
    data.cut ? tokenFromText(data.cut, "CUT", data.cut === "Rundhals" ? 3 : 6, { must_be_truthful: true }) : null,
    data.sku ? tokenFromText(data.sku, "SKU", data.brand === "Gildan" ? 7 : 5) : null
  ].filter(Boolean);

  const optional = libraryTokens
    .filter((token) => isApplicable(token, data))
    .filter((token) => !["BRAND", "LINE", "TYPE", "WEIGHT", "SIZE"].includes(token.slot))
    .filter((token) => !blocklist.has(normalizeToken(token.text)))
    .filter((token) => materialMatchesProduct(token, data))
    .filter((token) => token.slot !== "GENDER" || genderSet.has(normalizeToken(token.text)))
    .filter((token) => {
      if (token.slot !== "PACK") return true;
      if (data.listingKind !== "pack") return false;
      return data.pack ? normalizeToken(token.text) === normalizeToken(data.pack) : true;
    })
    .filter((token) => isTruthfullyConfirmed(token, data))
    .map((token) => ({ ...token, required: false }));

  return {
    required: dedupeTokens(required),
    optional: dedupeTokens([...dynamic, ...optional])
  };
}

function dedupeTokens(tokens) {
  const seen = new Set();
  const result = [];
  for (const token of tokens) {
    const key = normalizeToken(token.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(token);
  }
  return result;
}

function orderedTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const left = titleSlotOrder.indexOf(a.slot);
    const right = titleSlotOrder.indexOf(b.slot);
    const slotDelta = (left === -1 ? 999 : left) - (right === -1 ? 999 : right);
    if (slotDelta !== 0) return slotDelta;
    return tokenScore(b) - tokenScore(a);
  });
}

function titleFromTokens(tokens) {
  return orderedTokens(tokens).map((token) => token.text).join(" ").replace(/\s+/g, " ").trim();
}

function readabilityScore(title) {
  let score = 88;
  if (!fallbackBrands.some((brand) => title.startsWith(brand))) score -= 20;
  if (/\d$/.test(title)) score -= 6;
  if (/\d+[a-z]*\s+[XSML\d-]+\s+\d+er/i.test(title)) score -= 7;
  if (countChars(title) < 70) score -= 10;
  if (countChars(title) > 80) score -= 50;
  if (/[★!*@]{2,}|L@@K|NEU/i.test(title)) score -= 30;
  return Math.max(0, Math.min(100, score));
}

function effectiveScore(token, strategy, data) {
  let score = tokenScore(token);
  if (strategy === "audience_focused" && token.audience_boost === data.audience) score += 6;
  if (strategy === "audience_focused" && token.slot === "MODIFIER") score += 2;
  if (strategy === "long_tail_safe" && ["SKU", "MATERIAL", "CUT"].includes(token.slot)) score += 4;
  if (strategy === "balanced" && ["GENDER", "SIZE", "PACK"].includes(token.slot)) score += 2;
  if (strategy === "maximize_volume") score += score / Math.max(1, countChars(token.text));
  return score;
}

function stateRank(tokens, strategy, data) {
  const title = titleFromTokens(tokens);
  const chars = countChars(title);
  const seo = tokens.reduce((sum, token) => sum + tokenScore(token), 0);
  const effective = tokens.reduce((sum, token) => sum + effectiveScore(token, strategy, data), 0);
  const targetBonus = chars >= 75 && chars <= 80 ? 10 : Math.max(0, chars - 62) / 3;
  return effective + seo * 0.5 + readabilityScore(title) / 10 + targetBonus;
}

function packTitle(data, libraryTokens, blocklist, strategy) {
  const { required, optional } = buildTitleTokens(libraryTokens, blocklist, data);
  const requiredTitle = titleFromTokens(required);
  if (countChars(requiredTitle) > 80) {
    throw new Error("Brand, line, and product type are already longer than 80 characters.");
  }

  const sortedOptional = optional
    .filter((token) => !required.some((item) => normalizeToken(item.text) === normalizeToken(token.text)))
    .map((token) => ({ ...token, _effectiveScore: effectiveScore(token, strategy, data) }))
    .sort((a, b) => {
      if (strategy === "maximize_volume") return b._effectiveScore - a._effectiveScore;
      if (strategy === "long_tail_safe") return (b._effectiveScore / Math.max(1, countChars(b.text))) - (a._effectiveScore / Math.max(1, countChars(a.text)));
      return b._effectiveScore - a._effectiveScore;
    });

  let states = [{ tokens: required, keys: new Set(required.map((token) => normalizeToken(token.text))) }];

  for (const token of sortedOptional) {
    const nextStates = [...states];
    for (const state of states) {
      const key = normalizeToken(token.text);
      if (state.keys.has(key)) continue;
      const nextTokens = dedupeTokens([...state.tokens, token]);
      const title = titleFromTokens(nextTokens);
      if (countChars(title) <= 80) {
        nextStates.push({
          tokens: nextTokens,
          keys: new Set([...state.keys, key])
        });
      }
    }

    states = nextStates
      .sort((a, b) => stateRank(b.tokens, strategy, data) - stateRank(a.tokens, strategy, data))
      .slice(0, 260);
  }

  const selected = orderedTokens(states[0].tokens).map(({ _effectiveScore, ...token }) => token);
  const selectedKeys = new Set(selected.map((token) => normalizeToken(token.text)));
  const dropped = sortedOptional
    .filter((token) => !selectedKeys.has(normalizeToken(token.text)))
    .slice(0, 18)
    .map(({ _effectiveScore, ...token }) => token);
  const title = titleFromTokens(selected);
  const charCount = countChars(title);
  const seoScore = selected.reduce((sum, token) => sum + tokenScore(token), 0);
  const ctrScore = readabilityScore(title);

  return {
    strategy,
    title,
    charCount,
    seoScore,
    ctrScore,
    warning: charCount < 70 ? "Below 70 chars: some title space is unused." : "",
    selected,
    dropped,
    why: explainTitle(strategy, selected, dropped, charCount)
  };
}

function explainTitle(strategy, selected, dropped, charCount) {
  const messages = {
    maximize_volume: "Highest raw token score while staying under 80 characters.",
    balanced: "Balances high-volume tokens with natural German readability.",
    audience_focused: "Boosts the selected buyer intent while preserving the core formula.",
    long_tail_safe: "Keeps more specific detail terms for lower-competition searches."
  };
  const kept = selected.filter((token) => ["PACK", "MODIFIER", "SIZE", "SKU"].includes(token.slot)).map((token) => token.text).slice(0, 3);
  return `${messages[strategy]} Uses ${charCount}/80 chars${kept.length ? ` and keeps ${kept.join(", ")}` : ""}. ${dropped.length ? "Lower-priority tokens were dropped for space." : "No relevant tokens were dropped."}`;
}

function generateTitleCandidates(data, libraryTokens, blocklist) {
  const strategies = ["balanced", "maximize_volume", "audience_focused", "long_tail_safe"];
  const seen = new Set();
  return strategies
    .map((strategy) => packTitle(data, libraryTokens, blocklist, strategy))
    .filter((candidate) => {
      const key = normalizeToken(candidate.title);
      if (!candidate.title || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.seoScore + b.ctrScore) - (a.seoScore + a.ctrScore));
}

function inferSlot(text, brand, productType) {
  const normalized = normalizeToken(text);
  const typeWords = new Set(["t-shirt", "tshirt", "shirt", "longsleeve", "langarmshirt", "sweatshirt", "hoodie", "kapuzenpullover", "poloshirt", "polo", "jogginghose", "sweatpants", "oxfordhemd", "hemd", "cap", "basecap"]);
  if (typeWords.has(normalized)) return "TYPE";
  if (/heavycotton|valueweight|superpremium|softstyle|ultracotton|heavyblend|dryblend|setin|ladyfit|e190|e150|regent|imperial|sporty|iconic|original|classic/.test(normalized)) return "LINE";
  if (normalizeToken(brand) && normalized === normalizeToken(brand)) return "BRAND";
  if (normalizeToken(productType) && normalized.includes(normalizeToken(productType))) return "TYPE";
  if (/^(herren|damen|unisex|kinder|jungen|maedchen)$/.test(normalized)) return "GENDER";
  if (/^\d{2,3}g$/.test(normalized)) return "WEIGHT";
  if (/^(xs|s|m|l|xl|xxl|\dxl)(xs|s|m|l|xl|xxl|\dxl)?$/.test(normalized) && /xl|xxl|s|m|l/.test(normalized)) return "SIZE";
  if (/\d+erpack/.test(normalized)) return "PACK";
  if (/baumwolle|cotton|ringspun|bio|fairtrade/.test(normalized)) return "MATERIAL";
  if (/vneck|vausschnitt|rundhals|slimfit|regularfit|oversize|tailliert|crewneck/.test(normalized)) return "CUT";
  return "MODIFIER";
}

function scoreForPosition(position) {
  const numeric = Number(position) || 10;
  return Math.max(3, Math.min(10, 11 - numeric));
}

function parseJsonArrayText(text) {
  const raw = String(text || "").trim();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.suggestions || [];
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      return JSON.parse(match[0]);
    } catch {
      return [];
    }
  }
}

function outputTextFromResponse(result) {
  if (typeof result.output_text === "string") return result.output_text;
  return (result.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n");
}

function cleanResearchImage(image) {
  const name = String(image?.name || "autocomplete-screenshot.jpg").replace(/[^\w.-]/g, "_");
  const type = String(image?.type || "");
  const data = String(image?.data || "");

  if (!["image/png", "image/jpeg", "image/webp"].includes(type)) {
    throw new Error("Screenshot must be PNG, JPEG, or WebP.");
  }

  const match = data.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || match[1] !== type) {
    throw new Error("Screenshot could not be read.");
  }

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 8_000_000) {
    throw new Error("Screenshot must be smaller than 8 MB.");
  }

  return { name, type, data };
}

function suggestionToToken(suggestion, context, existingTokens) {
  const text = cleanText(suggestion.text || suggestion.keyword || "", 120);
  const position = Number(suggestion.position || 10);
  const slot = tokenSlots.includes(suggestion.slot) ? suggestion.slot : inferSlot(text, context.brand, context.productType);
  const existing = existingTokens.find((token) => normalizeToken(token.text) === normalizeToken(text) && token.slot === slot);
  const proposedScore = Number(suggestion.search_volume_score) || scoreForPosition(position);
  const existingScore = tokenScore(existing);
  const score = Math.max(existingScore, proposedScore);

  return {
    id: existing?.id || tokenIdFor(text, slot),
    text,
    slot,
    language: suggestion.language || (/^[\w\s&.'-]+$/.test(text) ? "NEUTRAL" : "DE"),
    search_volume_score: score,
    applicable_brands: context.brand ? [context.brand] : ["*"],
    applicable_types: context.productType ? [context.productType] : ["*"],
    char_count: countChars(text),
    last_verified: new Date().toISOString().slice(0, 10),
    source: "ebay_autocomplete_screenshot",
    source_query: context.query,
    position,
    exists: Boolean(existing),
    existing_score: existingScore,
    proposed_score: proposedScore,
    change_type: existing ? (proposedScore > existingScore ? "score_boost" : "unchanged") : "new",
    verified_count: existing?.verified_count || 0
  };
}

function keywordPiecesFromSuggestion(suggestion, context) {
  const original = cleanText(suggestion.text || suggestion.keyword || "", 120);
  if (!original) return [];

  let working = ` ${original.toLowerCase()} `;
  for (const removable of [context.brand, context.productType, "t-shirt", "tshirt", "t shirt"]) {
    const clean = cleanText(removable).toLowerCase();
    if (!clean) continue;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    working = working.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  }
  working = working.replace(/\s+/g, " ").trim();

  const pieces = [];
  const patterns = [
    { regex: /\bt[\s-]?shirt\b/i, text: "T-Shirt", slot: "TYPE" },
    { regex: /\bsweatshirt\b/i, text: "Sweatshirt", slot: "TYPE" },
    { regex: /\bjogginghose\b/i, text: "Jogginghose", slot: "TYPE" },
    { regex: /\bpoloshirt\b/i, text: "Poloshirt", slot: "TYPE" },
    { regex: /\bhoodie\b/i, text: "Hoodie", slot: "TYPE" },
    { regex: /\bheavy\s+cotton\b/i, text: "Heavy Cotton", slot: "LINE" },
    { regex: /\bvalueweight\b/i, text: "Valueweight", slot: "LINE" },
    { regex: /\bsuper\s+premium\b/i, text: "Super Premium", slot: "LINE" },
    { regex: /\bsoftstyle\b/i, text: "Softstyle", slot: "LINE" },
    { regex: /\bultra\s+cotton\b/i, text: "Ultra Cotton", slot: "LINE" },
    { regex: /\bheavy\s+blend\b/i, text: "Heavy Blend", slot: "LINE" },
    { regex: /\b10er\s*pack\b/i, text: "10er Pack", slot: "PACK" },
    { regex: /\b5er\s*pack\b/i, text: "5er Pack", slot: "PACK" },
    { regex: /\b3er\s*pack\b/i, text: "3er Pack", slot: "PACK" },
    { regex: /\b2er\s*pack\b/i, text: "2er Pack", slot: "PACK" },
    { regex: /\bherren\b/i, text: "Herren", slot: "GENDER" },
    { regex: /\bdamen\b/i, text: "Damen", slot: "GENDER" },
    { regex: /\bunisex\b/i, text: "Unisex", slot: "GENDER" },
    { regex: /\bkinder\b/i, text: "Kinder", slot: "GENDER" },
    { regex: /\bbaumwolle\b/i, text: "Baumwolle", slot: "MATERIAL" },
    { regex: /\bcotton\b/i, text: "Cotton", slot: "MATERIAL" },
    { regex: /\bringspun\b/i, text: "Ringspun", slot: "MATERIAL" },
    { regex: /\bblanko\b/i, text: "Blanko", slot: "MODIFIER" },
    { regex: /\bbedruckbar\b/i, text: "Bedruckbar", slot: "MODIFIER" },
    { regex: /\bzum\s+bedrucken\b/i, text: "zum Bedrucken", slot: "MODIFIER" },
    { regex: /\barbeitskleidung\b/i, text: "Arbeitskleidung", slot: "MODIFIER" },
    { regex: /\bworkwear\b/i, text: "Workwear", slot: "MODIFIER" },
    { regex: /\bunifarben\b/i, text: "Unifarben", slot: "MODIFIER" },
    { regex: /\bbasic\b/i, text: "Basic", slot: "MODIFIER" }
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(working)) {
      pieces.push({ ...suggestion, text: pattern.text, slot: pattern.slot });
      working = working.replace(pattern.regex, " ");
    }
  }

  const remainder = cleanText(working, 80);
  if (remainder && normalizeToken(remainder) !== normalizeToken(context.brand)) {
    pieces.push({ ...suggestion, text: remainder, slot: inferSlot(remainder, context.brand, context.productType) });
  }
  return pieces;
}

function buildManualSuggestions(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line, index) => cleanText(line.replace(/^\d+[.)]\s*/, ""), 120))
    .filter(Boolean)
    .map((line, index) => ({ position: index + 1, text: line }));
}

function validateResearchContext(context, rawSuggestions) {
  const selectedType = context.productType;
  const queryType = detectProductTypeFromText(context.query);
  if (queryType && selectedType && queryType !== selectedType) {
    throw new Error(`Product type mismatch: your query says "${queryType}", but the dropdown is "${selectedType}". Switch product type to "${queryType}" before extracting.`);
  }

  const suggestionTypes = new Set(
    rawSuggestions
      .map((item) => detectProductTypeFromText(item.text || item.keyword || ""))
      .filter(Boolean)
  );
  if (!queryType && suggestionTypes.size === 1) {
    const [onlyType] = Array.from(suggestionTypes);
    if (onlyType !== selectedType) {
      throw new Error(`Product type mismatch: this screenshot looks like "${onlyType}", but the dropdown is "${selectedType}". Switch product type to "${onlyType}" before extracting.`);
    }
  }

  const selectedBrand = context.brand;
  const detectedBrand = detectBrandFromText(context.query)
    || rawSuggestions.map((item) => detectBrandFromText(item.text || item.keyword || "")).find(Boolean)
    || "";
  if (detectedBrand && selectedBrand && detectedBrand !== selectedBrand) {
    throw new Error(`Brand mismatch: the research looks like "${detectedBrand}", but the dropdown is "${selectedBrand}". Switch brand to "${detectedBrand}" before extracting.`);
  }
}

async function extractAutocompleteSuggestions(image, context) {
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set on the server.");

  const prompt = `You are a strict data extraction tool for eBay.de autocomplete screenshots.
Return only valid JSON. Extract every autocomplete suggestion visible in order from top to bottom.
Then classify each suggestion as a useful eBay keyword for blank/basic apparel titles.
Use slots only from: ${tokenSlots.join(", ")}.
Return this JSON array shape:
[
  {"position":1,"text":"fruit of the loom t-shirt","is_keyword":true,"slot":"MODIFIER","reason":"autocomplete suggestion"}
]
Reject browser UI text, ads, menus, addresses, and unrelated words by setting is_keyword false.
Context brand: ${context.brand || "unknown"}
Context product type: ${context.productType || "unknown"}
Probe query: ${context.query || "unknown"}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: visionModel,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: image.data, detail: "high" }
        ]
      }]
    })
  });

  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = { error: { message: text || "OpenAI returned a non-JSON response." } };
  }

  if (!response.ok) {
    throw new Error(result?.error?.message || `OpenAI vision request failed with status ${response.status}.`);
  }

  return parseJsonArrayText(outputTextFromResponse(result));
}

async function handleTokenExtract(req, res) {
  let body;
  try {
    body = await readRequestJson(req);
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }

  if (!isAuthorized(req, body)) return sendJson(res, 401, { error: "Access code is incorrect." });

  try {
    const library = await readTokenLibrary();
    const context = {
      brand: cleanText(body.brand),
      productType: cleanText(body.productType),
      query: cleanText(body.query, 180)
    };
    const rawSuggestions = body.manualText
      ? buildManualSuggestions(body.manualText)
      : await extractAutocompleteSuggestions(cleanResearchImage(body.image), context);

    validateResearchContext(context, rawSuggestions);

    const suggestions = rawSuggestions
      .filter((item) => item && item.text && item.is_keyword !== false)
      .flatMap((item) => keywordPiecesFromSuggestion(item, context))
      .map((item) => suggestionToToken(item, context, library.tokens))
      .filter((item) => item.text && !["https", "www", "ebay"].includes(normalizeToken(item.text)))
      .filter((item, index, items) => items.findIndex((other) => normalizeToken(other.text) === normalizeToken(item.text) && other.slot === item.slot) === index)
      .slice(0, 30);

    return sendJson(res, 200, { suggestions });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

function cleanSavedToken(raw) {
  const text = cleanText(raw.text, 120);
  const slot = tokenSlots.includes(raw.slot) ? raw.slot : "MODIFIER";
  if (!text) throw new Error("Token text is required.");
  return {
    id: cleanText(raw.id || tokenIdFor(text, slot), 90).replace(/[^\w-]/g, "_"),
    text,
    slot,
    language: ["DE", "EN", "NEUTRAL"].includes(raw.language) ? raw.language : "NEUTRAL",
    search_volume_score: Math.max(1, Math.min(10, Number(raw.search_volume_score) || 5)),
    applicable_brands: Array.isArray(raw.applicable_brands) && raw.applicable_brands.length ? raw.applicable_brands.map((item) => cleanText(item, 80)) : ["*"],
    applicable_types: Array.isArray(raw.applicable_types) && raw.applicable_types.length ? raw.applicable_types.map((item) => cleanText(item, 80)) : ["*"],
    char_count: countChars(text),
    last_verified: cleanText(raw.last_verified || new Date().toISOString().slice(0, 10), 20),
    source: cleanText(raw.source || "manual_token_research", 80),
    source_query: cleanText(raw.source_query || "", 180),
    source_queries: Array.isArray(raw.source_queries) ? raw.source_queries.map((item) => cleanText(item, 180)).filter(Boolean) : [],
    verified_count: Math.max(0, Number(raw.verified_count) || 0),
    position: Number(raw.position) || undefined
  };
}

function tokenMatchesResearchContext(token, brand, productType) {
  const brands = Array.isArray(token.applicable_brands) ? token.applicable_brands : ["*"];
  const types = Array.isArray(token.applicable_types) ? token.applicable_types : ["*"];
  return (brands.includes("*") || brands.includes(brand))
    && (types.includes("*") || types.includes(productType));
}

function tokenMatchesResetScope(token, brand, productType, scope) {
  const brands = Array.isArray(token.applicable_brands) ? token.applicable_brands : ["*"];
  const types = Array.isArray(token.applicable_types) ? token.applicable_types : ["*"];
  const brandMatches = brands.includes("*") || brands.includes(brand);
  if (scope === "brand") return brandMatches;
  return brandMatches && (types.includes("*") || types.includes(productType));
}

async function handleResearchTokens(req, res, url) {
  if (!isAuthorized(req)) return sendJson(res, 401, { error: "Access code is incorrect." });

  const brand = cleanText(url.searchParams.get("brand") || "");
  const productType = cleanText(url.searchParams.get("productType") || "");
  const library = await readTokenLibrary();
  const tokens = library.tokens
    .filter((token) => !brand || !productType || tokenMatchesResearchContext(token, brand, productType))
    .sort((a, b) => {
      const scoreDelta = tokenScore(b) - tokenScore(a);
      if (scoreDelta !== 0) return scoreDelta;
      return titleSlotOrder.indexOf(a.slot) - titleSlotOrder.indexOf(b.slot);
    })
    .slice(0, 120)
    .map((token) => ({
      id: token.id,
      text: token.text,
      slot: token.slot,
      search_volume_score: tokenScore(token),
      applicable_brands: token.applicable_brands || ["*"],
      applicable_types: token.applicable_types || ["*"],
      last_verified: token.last_verified || "",
      source_queries: token.source_queries || (token.source_query ? [token.source_query] : []),
      verified_count: token.verified_count || 0
    }));

  return sendJson(res, 200, {
    tokens,
    tokenCount: tokens.length,
    tokensVersion: library.version
  });
}

async function handleResearchReset(req, res) {
  let body;
  try {
    body = await readRequestJson(req);
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }

  if (!isAuthorized(req, body)) return sendJson(res, 401, { error: "Access code is incorrect." });

  const brand = cleanText(body.brand || "");
  const productType = cleanText(body.productType || "");
  const scope = body.scope === "brand" ? "brand" : "brand-type";
  if (!brand || (scope === "brand-type" && !productType)) return sendJson(res, 400, { error: "Brand and product type are required." });

  try {
    const library = await readTokenLibrary();
    let reset = 0;
    const tokens = library.tokens.map((token) => {
      if (!tokenMatchesResetScope(token, brand, productType, scope)) return token;
      const next = { ...token };
      if (next.verified_count || next.last_verified || next.first_verified || next.source_queries || next.source_query) reset += 1;
      delete next.verified_count;
      delete next.last_verified;
      delete next.first_verified;
      delete next.source_queries;
      delete next.source_query;
      delete next.position;
      return next;
    });

    const next = await writeTokenLibrary({ tokens });
    return sendJson(res, 200, { reset, tokensVersion: next.version, tokenCount: next.tokens.length });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

async function handleTokenSave(req, res) {
  let body;
  try {
    body = await readRequestJson(req);
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }

  if (!isAuthorized(req, body)) return sendJson(res, 401, { error: "Access code is incorrect." });
  if (!Array.isArray(body.tokens)) return sendJson(res, 400, { error: "Tokens must be an array." });

  try {
    const library = await readTokenLibrary();
    const byKey = new Map(library.tokens.map((token) => [`${normalizeToken(token.text)}:${token.slot}`, token]));
    let saved = 0;

    for (const raw of body.tokens.slice(0, 60)) {
      const token = cleanSavedToken(raw);
      const key = `${normalizeToken(token.text)}:${token.slot}`;
      const existing = byKey.get(key);
      const applicableBrands = new Set([
        ...((existing?.applicable_brands || []).filter(Boolean)),
        ...token.applicable_brands
      ]);
      const applicableTypes = new Set([
        ...((existing?.applicable_types || []).filter(Boolean)),
        ...token.applicable_types
      ]);
      const sourceQueries = new Set([
        ...((existing?.source_queries || []).filter(Boolean)),
        ...(existing?.source_query ? [existing.source_query] : []),
        ...token.source_queries,
        ...(token.source_query ? [token.source_query] : [])
      ]);
      byKey.set(key, {
        ...(existing || {}),
        ...token,
        search_volume_score: Math.max(token.search_volume_score, tokenScore(existing)),
        applicable_brands: Array.from(applicableBrands),
        applicable_types: Array.from(applicableTypes),
        char_count: countChars(token.text),
        source_queries: Array.from(sourceQueries).slice(-20),
        verified_count: (Number(existing?.verified_count) || 0) + 1,
        first_verified: existing?.first_verified || token.last_verified,
        last_verified: token.last_verified
      });
      saved += 1;
    }

    const next = await writeTokenLibrary({ tokens: Array.from(byKey.values()) });
    return sendJson(res, 200, { saved, tokensVersion: next.version, tokenCount: next.tokens.length });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

function itemSpecifics(data) {
  return {
    Marke: data.brand,
    Produktart: data.type,
    Produktlinie: data.line,
    Material: data.material || "Baumwolle",
    Stoffgewicht: data.weight,
    Ausschnitt: data.neck || data.cut || "",
    "Ärmellänge": data.sleeve || "",
    Passform: data.fit || "Regular Fit",
    Abteilung: data.genders.join(", "),
    "Größe": data.sizeRange,
    Farbe: "Varianten / siehe Auswahl",
    Stil: data.type,
    Anlass: data.audience === "workwear" ? "Arbeitskleidung" : "Freizeit",
    Pflegehinweise: "Maschinenwäsche",
    Herstellernummer: data.mpn || data.sku
  };
}

function descriptionOpener(data, droppedTokens) {
  const packText = data.pack ? ` als ${data.pack}` : "";
  const useCase = data.audience === "print"
    ? "zum Bedrucken"
    : data.audience === "workwear"
      ? "Arbeitskleidung und Teams"
      : "Alltag, Freizeit und Promotion";
  const extras = droppedTokens.map((token) => token.text).filter(Boolean).slice(0, 4).join(", ");
  return `${data.brand} ${data.line} ${data.type}${packText} fuer ${data.genders.join(", ")}. ${data.material || "Baumwolle"}, ${data.weight}, ${data.sizeRange}. Ideal fuer ${useCase}.${extras ? ` Weitere Merkmale: ${extras}.` : ""}`.slice(0, 250);
}

function variantTitleRows(data, libraryTokens, blocklist) {
  if (data.listingKind !== "variant") return [];
  return ["", "3er Pack", "5er Pack", "10er Pack"].map((pack) => {
    const variantData = { ...data, listingKind: pack ? "pack" : "single", pack };
    const best = generateTitleCandidates(variantData, libraryTokens, blocklist)[0];
    return {
      label: pack || "Single",
      title: best?.title || "",
      charCount: best?.charCount || 0
    };
  }).filter((row) => row.title);
}

async function logTitleGeneration(session) {
  const line = `${JSON.stringify(session)}\n`;
  try {
    await appendFile(titleHistoryFile, line);
  } catch {
    // Logging should never block title generation.
  }
}

async function handleTitleData(req, res) {
  if (!isAuthorized(req)) return sendJson(res, 401, { error: "Access code is incorrect." });

  const [library, master] = await Promise.all([readTokenLibrary(), readProductMaster()]);
  const brands = [...new Set([
    ...fallbackBrands,
    ...master.products.map((product) => product.brand),
    ...library.tokens.filter((token) => token.slot === "BRAND").map((token) => token.text)
  ].filter(Boolean))];
  const productTypes = [...new Set([
    ...fallbackProductTypes,
    ...master.products.map((product) => product.type),
    ...library.tokens.filter((token) => token.slot === "TYPE").flatMap((token) => token.applicable_types || [token.text]).filter((item) => item !== "*")
  ].filter(Boolean))];

  return sendJson(res, 200, {
    tokensVersion: library.version,
    productsVersion: master.version,
    products: master.products,
    brands,
    productTypes,
    sizes: fallbackSizes
  });
}

async function handleTitleGenerate(req, res) {
  let body;
  try {
    body = await readRequestJson(req);
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }

  if (!isAuthorized(req, body)) return sendJson(res, 401, { error: "Access code is incorrect." });

  try {
    const [library, master, blocklist] = await Promise.all([readTokenLibrary(), readProductMaster(), readBlocklist()]);
    const data = cleanTitleRequest(body, master.products);
    const candidates = generateTitleCandidates(data, library.tokens, blocklist);
    const dropped = candidates.flatMap((candidate) => candidate.dropped);
    const sessionId = randomUUID();

    await logTitleGeneration({
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      brand: data.brand,
      product_type: data.type,
      sku: data.sku,
      line: data.line,
      weight: data.weight,
      min_size: data.minSize,
      max_size: data.maxSize,
      gender_tokens: data.genders,
      listing_kind: data.listingKind,
      pack_size: data.pack,
      audience: data.audience,
      generated_titles: candidates.map((candidate) => candidate.title)
    });

    return sendJson(res, 200, {
      sessionId,
      candidates,
      itemSpecifics: itemSpecifics(data),
      descriptionOpener: descriptionOpener(data, dropped),
      variantTitles: variantTitleRows(data, library.tokens, blocklist)
    });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

function cleanGenerationRequest(body) {
  const prompt = String(body.prompt || "").trim();
  if (prompt.length < 3) throw new Error("Write a longer prompt before generating.");
  if (prompt.length > 4000) throw new Error("Prompt is too long. Keep it under 4000 characters.");

  const model = allowedModels.has(body.model) ? body.model : defaultModel;
  const size = allowedSizes.has(body.size) ? body.size : "1024x1024";
  const quality = allowedQuality.has(body.quality) ? body.quality : "auto";
  const output_format = allowedFormats.has(body.outputFormat) ? body.outputFormat : "png";
  const background = allowedBackgrounds.has(body.background) ? body.background : "auto";
  const n = Math.min(Math.max(Number.parseInt(body.count || "1", 10) || 1, 1), 4);
  const input_fidelity = body.inputFidelity === "high" ? "high" : "low";
  const framework = String(body.framework || "Custom").trim().slice(0, 80) || "Custom";
  const referenceImages = cleanReferenceImages(body.referenceImages);

  return { prompt, model, size, quality, output_format, background, n, input_fidelity, framework, referenceImages };
}

function cleanReferenceImages(images) {
  if (!Array.isArray(images)) return [];
  if (images.length > 5) throw new Error("Upload 5 reference images or fewer.");

  return images.map((image, index) => {
    const name = String(image.name || `reference-${index + 1}.png`).replace(/[^\w.-]/g, "_");
    const type = String(image.type || "");
    const data = String(image.data || "");

    if (!["image/png", "image/jpeg", "image/webp"].includes(type)) {
      throw new Error("Reference images must be PNG, JPEG, or WebP.");
    }

    const match = data.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match || match[1] !== type) {
      throw new Error("A reference image could not be read.");
    }

    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 8_000_000) {
      throw new Error("Each reference image must be smaller than 8 MB.");
    }

    return { name, type, bytes };
  });
}

function fileNameFor(format, index) {
  const safeFormat = format === "jpeg" ? "jpg" : format;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${stamp}-${randomUUID().slice(0, 8)}-${index + 1}.${safeFormat}`;
}

async function imageFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenAI returned an image URL that could not be downloaded (${response.status}).`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function callOpenAIImageApi(payload) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set on the server.");
  }

  const hasReferences = payload.referenceImages.length > 0;
  const response = hasReferences
    ? await callOpenAIImageEditApi(payload)
    : await callOpenAIImageGenerationApi(payload);

  return response;
}

async function callOpenAIImageGenerationApi(payload) {
  const { referenceImages, input_fidelity, framework, ...requestPayload } = payload;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(requestPayload)
  });

  return parseOpenAIResponse(response);
}

async function callOpenAIImageEditApi(payload) {
  const form = new FormData();
  form.append("model", payload.model);
  form.append("prompt", payload.prompt);
  form.append("size", payload.size);
  form.append("quality", payload.quality);
  form.append("output_format", payload.output_format);
  form.append("background", payload.background);
  form.append("n", String(payload.n));
  form.append("input_fidelity", payload.input_fidelity);

  for (const image of payload.referenceImages) {
    const blob = new Blob([image.bytes], { type: image.type });
    form.append("image", blob, image.name);
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  return parseOpenAIResponse(response);
}

async function parseOpenAIResponse(response) {
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = { error: { message: text || "OpenAI returned a non-JSON response." } };
  }

  if (!response.ok) {
    const message = result?.error?.message || `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return result;
}

async function handleGenerate(req, res) {
  let body;
  try {
    body = await readRequestJson(req);
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }

  if (!isAuthorized(req, body)) {
    return sendJson(res, 401, { error: "Access code is incorrect." });
  }

  let payload;
  try {
    payload = cleanGenerationRequest(body);
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }

  try {
    const result = await callOpenAIImageApi(payload);
    const gallery = await readGallery();
    const created = [];

    for (const [index, image] of (result.data || []).entries()) {
      const fileName = fileNameFor(payload.output_format, index);
      const filePath = join(generatedDir, fileName);
      const bytes = image.b64_json
        ? Buffer.from(image.b64_json, "base64")
        : await imageFromUrl(image.url);

      await writeFile(filePath, bytes);
      const item = {
        id: randomUUID(),
        prompt: payload.prompt,
        revisedPrompt: image.revised_prompt || "",
        model: payload.model,
        size: payload.size,
        quality: payload.quality,
        outputFormat: payload.output_format,
        background: payload.background,
        framework: payload.framework,
        referenceCount: payload.referenceImages.length,
        createdAt: new Date().toISOString(),
        url: `/generated/${fileName}`
      };
      created.push(item);
    }

    await writeGallery([...created.reverse(), ...gallery]);
    return sendJson(res, 200, { items: created.reverse() });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

async function handleGallery(req, res) {
  if (!isAuthorized(req)) {
    return sendJson(res, 401, { error: "Access code is incorrect." });
  }
  const gallery = await readGallery();
  return sendJson(res, 200, { items: gallery });
}

async function serveStatic(req, res, pathname) {
  const targetBase = pathname.startsWith("/generated/") ? dataDir : publicDir;
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const filePath = normalize(join(targetBase, relativePath));

  if (!filePath.startsWith(targetBase)) {
    return sendText(res, 403, "Forbidden");
  }

  try {
    const content = await readFile(filePath);
    const type = mimeTypes[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "cache-control": pathname.startsWith("/generated/") ? "public, max-age=31536000, immutable" : "no-store"
    });
    res.end(content);
  } catch {
    sendText(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/healthz") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    return sendJson(res, 200, {
      accessRequired: Boolean(accessCode),
      hasApiKey: Boolean(apiKey),
      defaultModel,
      models: Array.from(allowedModels),
      sizes: Array.from(allowedSizes),
      qualities: Array.from(allowedQuality),
      formats: Array.from(allowedFormats),
      backgrounds: Array.from(allowedBackgrounds)
    });
  }

  if (req.method === "GET" && url.pathname === "/api/gallery") {
    return handleGallery(req, res);
  }

  if (url.pathname === "/api/frameworks") {
    return handleFrameworks(req, res);
  }

  if (req.method === "GET" && url.pathname === "/api/title-data") {
    return handleTitleData(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/titles/generate") {
    return handleTitleGenerate(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/token-research/extract") {
    return handleTokenExtract(req, res);
  }

  if (req.method === "GET" && url.pathname === "/api/token-research/tokens") {
    return handleResearchTokens(req, res, url);
  }

  if (req.method === "POST" && url.pathname === "/api/token-research/reset") {
    return handleResearchReset(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/tokens/save") {
    return handleTokenSave(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/generate") {
    return handleGenerate(req, res);
  }

  if (req.method === "GET") {
    return serveStatic(req, res, url.pathname);
  }

  sendText(res, 405, "Method not allowed");
});

server.listen(port, host, () => {
  console.log(`Freelancer Image Studio running at http://${host}:${port}`);
});
