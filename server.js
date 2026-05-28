import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const rootDir = resolve(".");
const publicDir = join(rootDir, "public");
const dataDir = resolve(process.env.DATA_DIR || join(rootDir, "data"));
const generatedDir = join(dataDir, "generated");
const galleryFile = join(dataDir, "gallery.json");
const frameworksFile = join(dataDir, "frameworks.json");

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const apiKey = process.env.OPENAI_API_KEY || "";
const accessCode = process.env.FREELANCER_ACCESS_CODE || "";
const configuredModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";

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
