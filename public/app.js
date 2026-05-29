const form = document.querySelector("#generateForm");
const gallery = document.querySelector("#gallery");
const statusEl = document.querySelector("#status");
const accessCode = document.querySelector("#accessCode");
const lockScreen = document.querySelector("#lockScreen");
const lockForm = document.querySelector("#lockForm");
const lockCode = document.querySelector("#lockCode");
const lockError = document.querySelector("#lockError");
const generateButton = document.querySelector("#generateButton");
const clearButton = document.querySelector("#clearButton");
const refreshButton = document.querySelector("#refreshButton");
const applyFrameworkButton = document.querySelector("#applyFrameworkButton");
const saveFrameworkButton = document.querySelector("#saveFrameworkButton");
const newFrameworkButton = document.querySelector("#newFrameworkButton");
const duplicateFrameworkButton = document.querySelector("#duplicateFrameworkButton");
const deleteFrameworkButton = document.querySelector("#deleteFrameworkButton");
const referencePreview = document.querySelector("#referencePreview");
const template = document.querySelector("#imageCardTemplate");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
const titleForm = document.querySelector("#titleForm");
const titleResults = document.querySelector("#titleResults");
const titleTemplate = document.querySelector("#titleCandidateTemplate");
const titleStatus = document.querySelector("#titleStatus");
const titleSummary = document.querySelector("#titleSummary");
const specificsOutput = document.querySelector("#specificsOutput");
const descriptionOpener = document.querySelector("#descriptionOpener");
const variantTitles = document.querySelector("#variantTitles");
const skuOptions = document.querySelector("#skuOptions");

const fields = {
  model: document.querySelector("#model"),
  framework: document.querySelector("#framework"),
  frameworkName: document.querySelector("#frameworkName"),
  frameworkCategory: document.querySelector("#frameworkCategory"),
  frameworkPrompt: document.querySelector("#frameworkPrompt"),
  size: document.querySelector("#size"),
  quality: document.querySelector("#quality"),
  outputFormat: document.querySelector("#outputFormat"),
  background: document.querySelector("#background"),
  inputFidelity: document.querySelector("#inputFidelity"),
  count: document.querySelector("#count"),
  prompt: document.querySelector("#prompt"),
  referenceImages: document.querySelector("#referenceImages")
};

const titleFields = {
  brand: document.querySelector("#titleBrand"),
  sku: document.querySelector("#titleSku"),
  type: document.querySelector("#titleType"),
  line: document.querySelector("#titleLine"),
  weight: document.querySelector("#titleWeight"),
  minSize: document.querySelector("#titleMinSize"),
  maxSize: document.querySelector("#titleMaxSize"),
  listingKind: document.querySelector("#titleListingKind"),
  pack: document.querySelector("#titlePack"),
  audience: document.querySelector("#titleAudience"),
  cut: document.querySelector("#titleCut")
};

let selectedReferences = [];
let frameworks = [];

const labels = {
  "gpt-image-1.5": "GPT Image 1.5",
  "gpt-image-1": "GPT Image 1",
  "gpt-image-1-mini": "GPT Image Mini",
  "1024x1024": "Square",
  "1024x1536": "Portrait",
  "1536x1024": "Landscape",
  auto: "Auto",
  low: "Low",
  medium: "Medium",
  high: "High",
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
  opaque: "Opaque",
  transparent: "Transparent"
};

const productTypes = [
  "T-Shirt",
  "Longsleeve",
  "Sweatshirt",
  "Hoodie",
  "Poloshirt",
  "Jogginghose",
  "Oxfordhemd",
  "Cap"
];

const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];

const productMaster = [
  { brand: "Fruit of the Loom", sku: "F140", line: "Valueweight", type: "T-Shirt", weight: "165g", minSize: "S", maxSize: "5XL", genders: ["Herren", "Damen"], material: "Baumwolle", fit: "Regular Fit", sleeve: "Kurzarm", neck: "Rundhals", mpn: "F140", scores: { line: 8, type: 10, weight: 7, size: 8 } },
  { brand: "Fruit of the Loom", sku: "F182", line: "Heavy Cotton", type: "T-Shirt", weight: "190g", minSize: "S", maxSize: "3XL", genders: ["Herren", "Damen", "Unisex"], material: "Baumwolle", fit: "Regular Fit", sleeve: "Kurzarm", neck: "Rundhals", mpn: "F182", scores: { line: 9, type: 10, weight: 8, size: 7 } },
  { brand: "Fruit of the Loom", sku: "F110", line: "Original", type: "T-Shirt", weight: "145g", minSize: "S", maxSize: "5XL", genders: ["Herren", "Damen"], material: "Baumwolle", fit: "Regular Fit", sleeve: "Kurzarm", neck: "Rundhals", mpn: "F110", scores: { line: 7, type: 10, weight: 5, size: 8 } },
  { brand: "Fruit of the Loom", sku: "F130", line: "Iconic", type: "T-Shirt", weight: "150g", minSize: "S", maxSize: "5XL", genders: ["Herren", "Damen"], material: "Baumwolle", fit: "Regular Fit", sleeve: "Kurzarm", neck: "Rundhals", mpn: "F130", scores: { line: 7, type: 10, weight: 5, size: 8 } },
  { brand: "Fruit of the Loom", sku: "F288", line: "Premium", type: "Poloshirt", weight: "180g", minSize: "S", maxSize: "3XL", genders: ["Herren"], material: "Baumwolle", fit: "Regular Fit", sleeve: "Kurzarm", neck: "Polokragen", mpn: "F288", scores: { line: 7, type: 9, weight: 5, size: 6 } },
  { brand: "Fruit of the Loom", sku: "F324", line: "Set-in", type: "Sweatshirt", weight: "280g", minSize: "S", maxSize: "3XL", genders: ["Herren", "Damen", "Unisex"], material: "Baumwolle", fit: "Regular Fit", sleeve: "Langarm", neck: "Rundhals", mpn: "F324", scores: { line: 7, type: 10, weight: 8, size: 6 } },
  { brand: "Fruit of the Loom", sku: "F421", line: "Classic", type: "Hoodie", weight: "280g", minSize: "S", maxSize: "3XL", genders: ["Herren", "Damen", "Unisex"], material: "Baumwolle", fit: "Regular Fit", sleeve: "Langarm", neck: "Kapuze", mpn: "F421", scores: { line: 6, type: 10, weight: 7, size: 6 } },
  { brand: "Fruit of the Loom", sku: "F490", line: "Premium", type: "Hoodie", weight: "280g", minSize: "S", maxSize: "3XL", genders: ["Herren", "Damen"], material: "Baumwolle", fit: "Regular Fit", sleeve: "Langarm", neck: "Kapuze", mpn: "F490", scores: { line: 7, type: 10, weight: 7, size: 6 } },
  { brand: "Gildan", sku: "G64000", line: "Softstyle", type: "T-Shirt", weight: "153g", minSize: "S", maxSize: "5XL", genders: ["Herren"], material: "Ringspun", fit: "Regular Fit", sleeve: "Kurzarm", neck: "Rundhals", mpn: "64000", scores: { line: 9, type: 10, weight: 5, size: 8 } },
  { brand: "B&C", sku: "BCTU03T", line: "E190", type: "T-Shirt", weight: "185g", minSize: "S", maxSize: "5XL", genders: ["Herren", "Damen"], material: "Baumwolle", fit: "Regular Fit", sleeve: "Kurzarm", neck: "Rundhals", mpn: "BCTU03T", scores: { line: 7, type: 10, weight: 6, size: 8 } }
];

const brands = ["Fruit of the Loom", "Gildan", "B&C", "SOL'S", "Russell", "Neutral", "James & Nicholson", "Stedman", "Hanes", "Tee Jays"];

const audienceModifiers = {
  general: [
    { text: "Original", slot: "MODIFIER", score: 5 },
    { text: "Basic", slot: "MODIFIER", score: 4 },
    { text: "Blanko", slot: "MODIFIER", score: 6 }
  ],
  print: [
    { text: "zum Bedrucken", slot: "MODIFIER", score: 10 },
    { text: "Bedruckbar", slot: "MODIFIER", score: 8 },
    { text: "Blanko", slot: "MODIFIER", score: 9 }
  ],
  workwear: [
    { text: "Arbeitskleidung", slot: "MODIFIER", score: 10 },
    { text: "Workwear", slot: "MODIFIER", score: 8 },
    { text: "Basic", slot: "MODIFIER", score: 4 }
  ],
  fashion: [
    { text: "Basic", slot: "MODIFIER", score: 8 },
    { text: "Unifarben", slot: "MODIFIER", score: 7 },
    { text: "Blanko", slot: "MODIFIER", score: 6 }
  ]
};

const antiTokens = new Set(["Top", "Mega", "Super", "Sale", "NEU", "L@@K", "!!!", "★"]);
const slotOrder = ["BRAND", "LINE", "TYPE", "GENDER", "CUT", "MATERIAL", "WEIGHT", "SIZE", "PACK", "MODIFIER", "SKU"];

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function savedAccessCode() {
  return localStorage.getItem("freelancerImageStudioAccessCode") || "";
}

function currentAccessCode() {
  return accessCode.value || lockCode.value || savedAccessCode();
}

function populateSelect(select, options, preferred) {
  select.innerHTML = "";
  for (const option of options) {
    const node = document.createElement("option");
    node.value = option;
    node.textContent = labels[option] || option;
    select.append(node);
  }
  if (preferred && options.includes(preferred)) select.value = preferred;
}

function countChars(text) {
  if (window.Intl?.Segmenter) {
    return Array.from(new Intl.Segmenter("de", { granularity: "grapheme" }).segment(text)).length;
  }
  return Array.from(text).length;
}

function normalizeToken(text) {
  return String(text)
    .toLowerCase()
    .replace(/t[\s-]?shirt/g, "t-shirt")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function titleCaseSizeRange(minSize, maxSize) {
  if (!minSize || !maxSize) return "";
  return minSize === maxSize ? minSize : `${minSize}-${maxSize}`;
}

function token(text, slot, score, required = false) {
  return {
    id: `${slot}-${normalizeToken(text)}`,
    text: String(text || "").trim(),
    slot,
    score,
    required
  };
}

function selectedGenderTokens() {
  return Array.from(document.querySelectorAll("input[name='titleGender']:checked")).map((input) => input.value);
}

function setGenderTokens(genders) {
  for (const input of document.querySelectorAll("input[name='titleGender']")) {
    input.checked = genders.includes(input.value);
  }
}

function currentProductMaster() {
  const sku = titleFields.sku.value.trim().toLowerCase();
  const brand = titleFields.brand.value;
  return productMaster.find((product) => product.brand === brand && product.sku.toLowerCase() === sku);
}

function collectTitleData(packOverride = null) {
  const master = currentProductMaster();
  const sizeRange = titleCaseSizeRange(titleFields.minSize.value, titleFields.maxSize.value);
  const listingKind = titleFields.listingKind.value;
  const pack = packOverride ?? (listingKind === "single" ? "" : titleFields.pack.value);

  return {
    brand: titleFields.brand.value,
    sku: titleFields.sku.value.trim(),
    type: titleFields.type.value,
    line: titleFields.line.value.trim(),
    weight: titleFields.weight.value.trim(),
    genders: selectedGenderTokens(),
    sizeRange,
    listingKind,
    pack,
    audience: titleFields.audience.value,
    cut: titleFields.cut.value,
    material: master?.material || "",
    fit: master?.fit || "",
    sleeve: master?.sleeve || "",
    neck: master?.neck || "",
    mpn: master?.mpn || titleFields.sku.value.trim(),
    scores: master?.scores || {}
  };
}

function buildTitleTokens(data) {
  const required = [
    token(data.brand, "BRAND", 10, true),
    token(data.line, "LINE", data.scores.line || 7, true),
    token(data.type, "TYPE", data.scores.type || 10, true)
  ].filter((item) => item.text);

  const genderScores = { Herren: 10, Damen: 9, Unisex: 5, Kinder: 7 };
  const optional = [
    ...data.genders.map((gender) => token(gender, "GENDER", genderScores[gender] || 4)),
    token(data.weight, "WEIGHT", data.scores.weight || 6),
    token(data.sizeRange, "SIZE", data.scores.size || 7),
    token(data.pack, "PACK", data.pack ? 10 : 0),
    token(data.cut, "CUT", data.cut && data.cut !== "Rundhals" ? 6 : 2),
    token(data.material, "MATERIAL", data.type === "Sweatshirt" || data.type === "Hoodie" ? 7 : 3),
    token(data.sku, "SKU", 5),
    ...(audienceModifiers[data.audience] || audienceModifiers.general).map((item) => token(item.text, item.slot, item.score))
  ].filter((item) => item.text && !antiTokens.has(item.text));

  return { required, optional };
}

function orderedTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const slotDelta = slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot);
    if (slotDelta !== 0) return slotDelta;
    return b.score - a.score;
  });
}

function titleFromTokens(tokens) {
  return orderedTokens(tokens).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
}

function dedupeTokens(tokens) {
  const seen = new Set();
  const result = [];
  for (const item of tokens) {
    const key = normalizeToken(item.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function readabilityScore(title) {
  let score = 88;
  if (!brands.some((brand) => title.startsWith(brand))) score -= 25;
  if (/\d$/.test(title)) score -= 7;
  if (/\d+[a-zA-Z]*\s+[XSML\d-]+\s+\d+er/.test(title)) score -= 8;
  if (countChars(title) < 70) score -= 10;
  if (countChars(title) > 80) score -= 50;
  if (/[★!*@]{2,}|L@@K|NEU/.test(title)) score -= 30;
  return Math.max(0, Math.min(100, score));
}

function packTitle(data, strategy) {
  const { required, optional } = buildTitleTokens(data);
  const selected = dedupeTokens(required);
  const selectedKeys = new Set(selected.map((item) => normalizeToken(item.text)));
  const scoredOptional = optional
    .filter((item) => !selectedKeys.has(normalizeToken(item.text)))
    .map((item) => {
      let boost = 0;
      if (strategy === "audience_focused" && item.slot === "MODIFIER") boost += 5;
      if (strategy === "long_tail_safe" && ["SKU", "MATERIAL", "CUT"].includes(item.slot)) boost += 4;
      if (strategy === "balanced" && ["GENDER", "SIZE", "PACK"].includes(item.slot)) boost += 2;
      if (strategy === "maximize_volume") boost += item.score / 10;
      return { ...item, effectiveScore: item.score + boost };
    })
    .sort((a, b) => b.effectiveScore - a.effectiveScore);

  const dropped = [];
  for (const item of scoredOptional) {
    const next = dedupeTokens([...selected, item]);
    const title = titleFromTokens(next);
    if (countChars(title) <= 80) {
      selected.push(item);
    } else {
      dropped.push(item);
    }
  }

  const title = titleFromTokens(selected);
  const seoScore = selected.reduce((sum, item) => sum + item.score, 0);
  const ctrScore = readabilityScore(title);
  const charCount = countChars(title);
  const warning = charCount < 70 ? "Below 70 chars: some title space is unused." : "";

  return {
    strategy,
    title,
    charCount,
    seoScore,
    ctrScore,
    warning,
    selected: orderedTokens(selected),
    dropped,
    why: explainTitle(strategy, selected, dropped, charCount)
  };
}

function explainTitle(strategy, selected, dropped, charCount) {
  const labelsByStrategy = {
    maximize_volume: "Highest raw token score while staying under 80 characters.",
    balanced: "Balances search volume with natural German scan readability.",
    audience_focused: "Boosts the selected buyer intent modifier.",
    long_tail_safe: "Keeps more specific SKU/material/detail terms for lower-competition searches."
  };
  const important = selected.filter((item) => ["PACK", "MODIFIER", "SIZE"].includes(item.slot)).map((item) => item.text).slice(0, 3);
  return `${labelsByStrategy[strategy]} Uses ${charCount}/80 chars${important.length ? ` and keeps ${important.join(", ")}` : ""}. ${dropped.length ? "Lower-priority tokens were dropped for space." : "No relevant tokens were dropped."}`;
}

function generateTitleCandidates(data) {
  const strategies = ["balanced", "maximize_volume", "audience_focused", "long_tail_safe"];
  const seen = new Set();
  return strategies
    .map((strategy) => packTitle(data, strategy))
    .filter((candidate) => {
      const key = normalizeToken(candidate.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return candidate.title;
    })
    .sort((a, b) => (b.seoScore + b.ctrScore) - (a.seoScore + a.ctrScore));
}

function renderTitleCandidates(candidates) {
  titleResults.innerHTML = "";
  for (const candidate of candidates) {
    const card = titleTemplate.content.cloneNode(true);
    card.querySelector(".title-text").textContent = candidate.title;
    card.querySelector(".title-stats").innerHTML = [
      `${candidate.charCount}/80 chars`,
      `SEO ${candidate.seoScore}`,
      `CTR ${candidate.ctrScore}`,
      candidate.warning
    ].filter(Boolean).map((item) => `<span>${item}</span>`).join("");
    card.querySelector(".title-breakdown").innerHTML = candidate.selected.map((item) => {
      const kind = item.required ? "required" : "optional";
      return `<span class="token-pill ${kind}">${item.slot}: ${item.text}</span>`;
    }).join("");
    card.querySelector(".why-title").textContent = candidate.why;
    card.querySelector(".dropped-tokens").innerHTML = candidate.dropped.length
      ? candidate.dropped.map((item) => `<span>${item.text}</span>`).join("")
      : "<span>None</span>";
    card.querySelector(".copy-title").addEventListener("click", () => copyText(candidate.title));
    titleResults.append(card);
  }
}

function itemSpecifics(data) {
  return {
    Marke: data.brand,
    Produktart: data.type,
    Produktlinie: data.line,
    Material: data.material || "Baumwolle",
    Stoffgewicht: data.weight,
    Abteilung: data.genders.join(", "),
    Groesse: data.sizeRange,
    Passform: data.fit || "Regular Fit",
    Ausschnitt: data.neck || data.cut || "",
    Aermellaenge: data.sleeve || "",
    Stil: data.type,
    Herstellernummer: data.mpn,
    Farbe: "Varianten / siehe Auswahl",
    Anlass: data.audience === "workwear" ? "Arbeitskleidung" : "Freizeit"
  };
}

function renderSpecifics(data) {
  const specifics = itemSpecifics(data);
  specificsOutput.innerHTML = Object.entries(specifics)
    .filter(([, value]) => value)
    .map(([key, value]) => `<div class="specific-item"><span>${key}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderOpener(data, droppedTokens) {
  const dropped = droppedTokens.map((item) => item.text).slice(0, 5).join(", ");
  const packText = data.pack ? ` als ${data.pack}` : "";
  descriptionOpener.value = `${data.brand} ${data.line} ${data.type}${packText}: hochwertiges Basic Wear fuer ${data.genders.join(", ")} in ${data.sizeRange}. Ideal als Blanko-Shirt, Arbeitskleidung oder zum Bedrucken.${dropped ? ` Weitere Merkmale: ${dropped}.` : ""}`.slice(0, 250);
}

function renderVariantTitles(data) {
  const packs = ["", "3er Pack", "5er Pack", "10er Pack"];
  variantTitles.innerHTML = "";
  for (const pack of packs) {
    const candidate = generateTitleCandidates({ ...data, pack })[0];
    const row = document.createElement("div");
    row.className = "variant-row";
    row.innerHTML = `<strong>${pack || "Single"}</strong><code>${candidate.title}</code><button class="secondary compact" type="button">Copy</button>`;
    row.querySelector("button").addEventListener("click", () => copyText(candidate.title));
    variantTitles.append(row);
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    titleStatus.textContent = "Copied";
  } catch {
    titleStatus.textContent = text;
  }
}

function populateTitleInputs() {
  populateSelect(titleFields.brand, brands, "Fruit of the Loom");
  populateSelect(titleFields.type, productTypes, "T-Shirt");
  populateSelect(titleFields.minSize, sizeOrder, "S");
  populateSelect(titleFields.maxSize, sizeOrder, "5XL");
  skuOptions.innerHTML = productMaster.map((product) => (
    `<option value="${product.sku}">${product.brand} ${product.line} ${product.type}</option>`
  )).join("");
}

function applyMasterProduct(product) {
  if (!product) return;
  titleFields.brand.value = product.brand;
  titleFields.sku.value = product.sku;
  titleFields.type.value = product.type;
  titleFields.line.value = product.line;
  titleFields.weight.value = product.weight;
  titleFields.minSize.value = product.minSize;
  titleFields.maxSize.value = product.maxSize;
  setGenderTokens(product.genders);
  titleFields.cut.value = product.neck === "Rundhals" ? "Rundhals" : "";
}

function autoFillBySku() {
  const sku = titleFields.sku.value.trim().toLowerCase();
  const product = productMaster.find((item) => item.brand === titleFields.brand.value && item.sku.toLowerCase() === sku);
  if (product) applyMasterProduct(product);
}

function resetTitleForm() {
  applyMasterProduct(productMaster[0]);
  titleFields.listingKind.value = "single";
  titleFields.pack.value = "";
  titleFields.audience.value = "general";
  titleResults.innerHTML = "";
  specificsOutput.innerHTML = "";
  descriptionOpener.value = "";
  variantTitles.innerHTML = "";
  titleSummary.textContent = "Pick product data first.";
  titleStatus.textContent = "80-char optimizer";
}

function populateFrameworks() {
  fields.framework.innerHTML = "";
  const categories = [...new Set(frameworks.map((framework) => framework.category || "Custom"))];

  for (const category of categories) {
    const group = document.createElement("optgroup");
    group.label = category;
    for (const framework of frameworks.filter((item) => (item.category || "Custom") === category)) {
      const node = document.createElement("option");
      node.value = framework.id;
      node.textContent = framework.name;
      group.append(node);
    }
    fields.framework.append(group);
  }

  syncFrameworkEditor();
}

function selectedFramework() {
  return frameworks.find((framework) => framework.id === fields.framework.value) || frameworks[0];
}

function frameworkLabel(framework) {
  return framework ? framework.name : "Custom";
}

function syncFrameworkEditor() {
  const framework = selectedFramework();
  if (!framework) return;
  fields.frameworkName.value = framework.name;
  fields.frameworkCategory.value = framework.category || "Custom";
  fields.frameworkPrompt.value = framework.prompt || "";
  saveFrameworkButton.textContent = framework.builtIn ? "Save copy" : "Save";
  deleteFrameworkButton.disabled = Boolean(framework.builtIn);
}

async function loadFrameworks() {
  const data = await api("/api/frameworks");
  frameworks = data.frameworks || [];
  populateFrameworks();
}

function editedFrameworkFromFields(existing = {}) {
  return {
    ...existing,
    id: existing.id || `framework-${crypto.randomUUID()}`,
    name: fields.frameworkName.value.trim(),
    category: fields.frameworkCategory.value.trim() || "Custom",
    prompt: fields.frameworkPrompt.value.trim(),
    builtIn: Boolean(existing.builtIn)
  };
}

async function saveFrameworks(nextFrameworks, selectedId) {
  const data = await api("/api/frameworks", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ frameworks: nextFrameworks })
  });
  frameworks = data.frameworks || [];
  populateFrameworks();
  if (selectedId && frameworks.some((framework) => framework.id === selectedId)) {
    fields.framework.value = selectedId;
  }
  syncFrameworkEditor();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function dataUrlByteSize(dataUrl) {
  const base64 = String(dataUrl).split(",")[1] || "";
  return Math.floor((base64.length * 3) / 4);
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A reference image could not be previewed."));
    image.src = dataUrl;
  });
}

function canvasToDataUrl(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("A reference image could not be compressed."));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("A compressed reference image could not be read."));
      reader.readAsDataURL(blob);
    }, type, quality);
  });
}

async function prepareReferenceImage(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Reference images must be PNG, JPEG, or WebP.");
  }

  if (file.size > 25_000_000) {
    throw new Error(`${file.name} is too large. Use images under 25 MB.`);
  }

  const originalData = await readFileAsDataUrl(file);
  const image = await loadImage(originalData);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let data = await canvasToDataUrl(canvas, "image/jpeg", 0.88);
  if (dataUrlByteSize(data) > 5_500_000) {
    data = await canvasToDataUrl(canvas, "image/jpeg", 0.72);
  }
  if (dataUrlByteSize(data) > 8_000_000) {
    throw new Error(`${file.name} is still too large after compression.`);
  }

  const safeName = file.name.replace(/\.[^.]+$/, "") || "reference";
  return {
    id: crypto.randomUUID(),
    name: `${safeName}.jpg`,
    type: "image/jpeg",
    data,
    originalName: file.name
  };
}

function renderReferencePreview() {
  referencePreview.innerHTML = "";
  if (!selectedReferences.length) return;

  for (const reference of selectedReferences) {
    const item = document.createElement("div");
    item.className = "reference-thumb";
    item.innerHTML = `
      <img src="${reference.data}" alt="${reference.name}">
      <button type="button" aria-label="Remove ${reference.name}" data-id="${reference.id}">x</button>
    `;
    referencePreview.append(item);
  }
}

async function api(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (options.withAccess !== false) {
    const code = currentAccessCode();
    if (code) headers["x-access-code"] = code;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function renderEmpty(message) {
  gallery.innerHTML = `<div class="empty">${message}</div>`;
}

function renderGallery(items) {
  gallery.innerHTML = "";
  if (!items.length) {
    renderEmpty("Generated images will appear here.");
    return;
  }

  for (const item of items) {
    const card = template.content.cloneNode(true);
    const img = card.querySelector("img");
    const link = card.querySelector(".image-link");
    const prompt = card.querySelector(".card-prompt");
    const meta = card.querySelector(".meta");
    const download = card.querySelector(".download");

    img.src = item.url;
    img.alt = item.prompt || "Generated image";
    link.href = item.url;
    prompt.textContent = item.prompt || "Untitled image";
    download.href = item.url;
    download.download = item.url.split("/").pop();

    const date = new Date(item.createdAt);
    const bits = [
      item.model,
      item.framework,
      item.referenceCount ? `${item.referenceCount} refs` : "",
      labels[item.size] || item.size,
      labels[item.quality] || item.quality,
      date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    ];
    meta.innerHTML = bits.filter(Boolean).map((bit) => `<span>${bit}</span>`).join("");

    gallery.append(card);
  }
}

async function loadGallery() {
  try {
    const data = await api("/api/gallery");
    renderGallery(data.items || []);
  } catch (error) {
    renderEmpty(error.message);
  }
}

async function boot() {
  try {
    const config = await api("/api/config", { withAccess: false });
    accessCode.value = savedAccessCode();
    lockCode.value = savedAccessCode();
    lockScreen.hidden = !config.accessRequired || Boolean(savedAccessCode());
    populateTitleInputs();
    resetTitleForm();
    await loadFrameworks();
    populateSelect(fields.model, config.models, config.defaultModel);
    populateSelect(fields.size, config.sizes, "1024x1024");
    populateSelect(fields.quality, config.qualities, "auto");
    populateSelect(fields.outputFormat, config.formats, "png");
    populateSelect(fields.background, config.backgrounds, "auto");
    setStatus(config.hasApiKey ? "Ready" : "Missing API key", !config.hasApiKey);
    await loadGallery();
  } catch (error) {
    setStatus(error.message, true);
    renderEmpty("Server is not reachable.");
  }
}

async function unlockApp() {
  const code = lockCode.value.trim();
  if (!code) return;
  accessCode.value = code;
  localStorage.setItem("freelancerImageStudioAccessCode", code);

  try {
    await api("/api/gallery");
    lockError.textContent = "";
    lockScreen.hidden = true;
    setStatus("Ready");
    await loadGallery();
  } catch {
    localStorage.removeItem("freelancerImageStudioAccessCode");
    accessCode.value = "";
    lockError.textContent = "Password is incorrect.";
    lockScreen.hidden = false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  generateButton.disabled = true;
  setStatus("Generating");

  const code = accessCode.value.trim();
  if (code) localStorage.setItem("freelancerImageStudioAccessCode", code);

  try {
    const payload = {
      prompt: fields.prompt.value,
      framework: frameworkLabel(selectedFramework()),
      model: fields.model.value,
      size: fields.size.value,
      quality: fields.quality.value,
      outputFormat: fields.outputFormat.value,
      background: fields.background.value,
      inputFidelity: fields.inputFidelity.value,
      count: fields.count.value,
      referenceImages: selectedReferences.map(({ name, type, data }) => ({ name, type, data }))
    };
    await api("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    await loadGallery();
    setStatus("Done");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    generateButton.disabled = false;
  }
});

lockForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await unlockApp();
});

clearButton.addEventListener("click", () => {
  fields.prompt.value = "";
  fields.prompt.focus();
});

applyFrameworkButton.addEventListener("click", () => {
  const framework = selectedFramework();
  if (!framework.prompt) return;
  fields.prompt.value = framework.prompt;
  fields.prompt.focus();
});

fields.framework.addEventListener("change", syncFrameworkEditor);

saveFrameworkButton.addEventListener("click", async () => {
  const existing = selectedFramework();
  if (!existing) return;

  try {
    const edited = editedFrameworkFromFields(existing);
    if (existing.builtIn) {
      const copy = {
        ...edited,
        id: `framework-${crypto.randomUUID()}`,
        name: edited.name === existing.name ? `${edited.name} Custom` : edited.name,
        builtIn: false
      };
      await saveFrameworks([...frameworks, copy], copy.id);
    } else {
      const nextFrameworks = frameworks.map((framework) => framework.id === existing.id ? edited : framework);
      await saveFrameworks(nextFrameworks, edited.id);
    }
    setStatus("Framework saved");
  } catch (error) {
    setStatus(error.message, true);
  }
});

newFrameworkButton.addEventListener("click", async () => {
  try {
    const framework = {
      id: `framework-${crypto.randomUUID()}`,
      name: "New Framework",
      category: "Custom",
      prompt: "Create a reusable prompt framework for [PRODUCT TYPE]. Use [REFERENCE IMAGE] as the source for product accuracy. Define the background, composition, style, required details, and things to avoid.",
      builtIn: false
    };
    await saveFrameworks([...frameworks, framework], framework.id);
    setStatus("Framework created");
  } catch (error) {
    setStatus(error.message, true);
  }
});

duplicateFrameworkButton.addEventListener("click", async () => {
  const existing = selectedFramework();
  if (!existing) return;

  try {
    const duplicate = {
      ...existing,
      id: `framework-${crypto.randomUUID()}`,
      name: `${existing.name} Copy`,
      builtIn: false
    };
    await saveFrameworks([...frameworks, duplicate], duplicate.id);
    setStatus("Framework duplicated");
  } catch (error) {
    setStatus(error.message, true);
  }
});

deleteFrameworkButton.addEventListener("click", async () => {
  const existing = selectedFramework();
  if (!existing || existing.builtIn) return;

  try {
    const nextFrameworks = frameworks.filter((framework) => framework.id !== existing.id);
    await saveFrameworks(nextFrameworks, nextFrameworks[0]?.id);
    setStatus("Framework deleted");
  } catch (error) {
    setStatus(error.message, true);
  }
});

fields.referenceImages.addEventListener("change", async () => {
  setStatus("Reading images");
  try {
    const files = Array.from(fields.referenceImages.files || []).slice(0, 5);
    selectedReferences = await Promise.all(files.map(prepareReferenceImage));
    renderReferencePreview();
    setStatus(selectedReferences.length ? `${selectedReferences.length} reference image${selectedReferences.length === 1 ? "" : "s"}` : "Ready");
  } catch (error) {
    selectedReferences = [];
    fields.referenceImages.value = "";
    renderReferencePreview();
    setStatus(error.message, true);
  }
});

referencePreview.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  selectedReferences = selectedReferences.filter((reference) => reference.id !== button.dataset.id);
  fields.referenceImages.value = "";
  renderReferencePreview();
  setStatus(selectedReferences.length ? `${selectedReferences.length} reference image${selectedReferences.length === 1 ? "" : "s"}` : "Ready");
});

refreshButton.addEventListener("click", loadGallery);

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.tab;
    tabButtons.forEach((item) => item.classList.toggle("active", item === button));
    tabPanels.forEach((panel) => {
      const active = panel.id === target;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  });
});

titleFields.sku.addEventListener("change", autoFillBySku);
titleFields.sku.addEventListener("blur", autoFillBySku);
titleFields.brand.addEventListener("change", autoFillBySku);

titleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = collectTitleData();
  const candidates = generateTitleCandidates(data);
  renderTitleCandidates(candidates);
  renderSpecifics(data);
  renderOpener(data, candidates.flatMap((candidate) => candidate.dropped));
  renderVariantTitles(data);
  titleSummary.textContent = `${candidates.length} candidates generated. Best uses ${candidates[0]?.charCount || 0}/80 chars.`;
  titleStatus.textContent = candidates[0]?.warning || "Ready";
});

document.querySelector("#resetTitleButton").addEventListener("click", resetTitleForm);

boot();
