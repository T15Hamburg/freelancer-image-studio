# Cloud Deployment

This app can run independently from your computer as a small Node service.

## Recommended Simple Setup

Use a managed container host with a persistent disk:

- Render Web Service + Disk
- Railway Service + Volume
- Fly.io app + Volume
- Small VPS with Docker

Do not use Cloudflare Pages for this version. The app needs private server-side API keys and persistent storage for generated images, gallery metadata, saved frameworks, and token research.

## Required Environment Variables

```text
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
FREELANCER_ACCESS_CODE=choose-a-private-code
HOST=0.0.0.0
PORT=4173
DATA_DIR=/data
GOOGLE_DRIVE_FOLDER_ID=18ZjRl0dPhuAKL9vXsVutNgLuDLWYnHGm
```

Optional:

```text
OPENAI_IMAGE_MODEL=gpt-image-1.5
GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview
GEMINI_FALLBACK_IMAGE_MODEL=gemini-3.1-flash-image
GEMINI_API_VERSION=v1beta
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

## Persistent Storage

Mount a persistent disk/volume at:

```text
/data
```

The app stores:

```text
/data/generated
/data/gallery.json
/data/frameworks.json
```

Without a persistent disk, generated images and saved prompt frameworks may disappear when the service restarts.

## Google Drive Backup

To upload every newly generated image to Google Drive:

1. In Google Cloud, create a service account for the project.
2. Enable the Google Drive API for that project.
3. Create a JSON key for the service account.
4. Share the target Google Drive folder with the service account `client_email` as Editor.
5. In Render, add `GOOGLE_SERVICE_ACCOUNT_JSON` with the full JSON key as the value.
6. Set `GOOGLE_DRIVE_FOLDER_ID` to the folder ID.

The app still saves locally first. If a Drive upload fails, generation still completes and the gallery item records `driveError`.

## Docker

Build locally:

```bash
docker build -t freelancer-image-studio .
```

Run locally:

```bash
docker run --rm -p 4173:4173 \
  -e OPENAI_API_KEY="sk-..." \
  -e FREELANCER_ACCESS_CODE="choose-a-code" \
  -v "$(pwd)/cloud-data:/data" \
  freelancer-image-studio
```

Open:

```text
http://127.0.0.1:4173
```

## Cloudflare Domain

After the app is deployed, point your Cloudflare DNS to the cloud host:

- If the host gives you a hostname, create a `CNAME`, for example:
  - `images.yourdomain.com` -> `your-app.onrender.com`
- If the host gives you an IP address, create an `A` record:
  - `images.yourdomain.com` -> server IP

Keep Cloudflare proxy enabled if the host supports it.

## Health Check

Use:

```text
/healthz
```

Expected response:

```json
{"ok":true}
```
