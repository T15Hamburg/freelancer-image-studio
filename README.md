# Freelancer Image Studio

A small private image-generation app for a freelancer. Your OpenAI and Gemini API keys stay on the server; the browser only sends prompts, settings, and uploaded images.

This uses the OpenAI Images API. The current OpenAI image-generation docs list GPT Image models such as `gpt-image-1.5`, `gpt-image-1`, and `gpt-image-1-mini` for image generation.

## Run locally

```bash
cd /Users/christophhaas/Documents/freelancer-image-studio
OPENAI_API_KEY="sk-..." GEMINI_API_KEY="..." FREELANCER_ACCESS_CODE="choose-a-code" node server.js
```

Then open:

```text
http://localhost:4173
```

## Environment variables

- `OPENAI_API_KEY`: Required for real image generation.
- `GEMINI_API_KEY`: Required for the `Gemini Image` tab.
- `FREELANCER_ACCESS_CODE`: Optional. When set, the freelancer must enter this code in the app.
- `OPENAI_IMAGE_MODEL`: Optional. Defaults to `gpt-image-1.5`.
- `GEMINI_IMAGE_MODEL`: Optional. Defaults to `gemini-3-pro-image-preview` for Nano Banana Pro.
- `GEMINI_FALLBACK_IMAGE_MODEL`: Optional. Defaults to `gemini-3.1-flash-image` for Nano Banana 2.
- `GEMINI_API_VERSION`: Optional. Defaults to `v1beta` for preview image models.
- `PORT`: Optional. Defaults to `4173`.
- `HOST`: Optional. Defaults to `127.0.0.1`.

## Files

- Generated images are saved in `data/generated/`.
- Gallery metadata is saved in `data/gallery.json`.
- If Google Drive backup is configured, each new generated image is also uploaded to the configured Drive folder.

## Reference images and frameworks

- Pick a framework, click `Apply`, then replace the bracketed placeholders in the prompt.
- Upload up to 5 PNG, JPEG, or WebP reference images.
- With no reference images, the app creates a new image from the prompt.
- With reference images, the app uses OpenAI's image edit/reference endpoint.
- Use `Input fidelity: High` when product details, logos, faces, or style consistency matter.

## Gemini image tab

Open the `Gemini Image` tab for a simple image-to-image workflow: upload one PNG/JPEG/WebP image, write one prompt, and generate with Nano Banana Pro (`gemini-3-pro-image-preview`). If that model is not enabled for the project, the server retries with Nano Banana 2 (`gemini-3.1-flash-image`). Results are saved into the same gallery history.

## Google Drive backup

Set these environment variables to copy every newly generated image into Google Drive:

- `GOOGLE_DRIVE_FOLDER_ID`: Target folder ID. Defaults to `18ZjRl0dPhuAKL9vXsVutNgLuDLWYnHGm`.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Google service account JSON key. Do not commit this value.

Share the Drive folder with the service account `client_email` as Editor.

## eBay title generator

Open the `eBay Titles` tab to create 80-character eBay.de titles for basic apparel.

- Start with brand, SKU, product type, line, weight, sizes, gender, pack, and audience.
- Known SKUs like `F140`, `F182`, `F324`, and `F421` prefill from the product master.
- The tool generates ranked title candidates, dropped tokens, item specifics, a 250-character opener, and pack-variant titles.
- Character counts use browser grapheme counting, so German characters count as one visible character.

## Important

Do not share your ChatGPT password with the freelancer. Use an OpenAI API key with billing limits instead, and rotate the key after the project if needed.

For cloud hosting independent from your computer, see [DEPLOYMENT.md](/Users/christophhaas/Documents/freelancer-image-studio/DEPLOYMENT.md).
