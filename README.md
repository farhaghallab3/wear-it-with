# Wear It With

**Before you buy a new piece, see where it fits in your closet.**

Wear It With is a purchase-decision assistant for clothes. Add a few pieces you already own and the item you're considering. The app shows the outfits it makes with your closet, explains every pairing, and lets you preview the new piece — or the whole look — on yourself with the **YouCam Clothes API**.

Built for the [YouCam API Skin AI & eCommerce VTO Hackathon](https://youcam-api-skin-ai-ecommerce.devpost.com/).

## Features

- **Closet** — add, edit and delete pieces with a photo, type, main color and occasions. A clearly labeled sample closet is included for first-time visitors.
- **Pieces you're considering** — product photo, price and optional budget; compare up to two options.
- **Looks** — up to three complete outfits built from your closet, each with plain-language reasons. The app also shows:
  - how many combinations the piece unlocks;
  - price per combination and budget fit;
  - which closet pieces it doesn't pair with, and why.
- **Try-on (YouCam Clothes V4)** — preview the new piece on a photo of yourself, or the **full look** layered bottom → top → outerwear.
- **Compare** — two options side by side under the same rules. The app summarizes the differences and does not tell you to buy either one.

### Declared outfit rules (no invented scores)

1. A complete look is a top with a bottom, or a dress. Outerwear layers over a complete look; shoes are added when they fit the rules.
2. Every piece shares at least one occasion (casual, work, evening, active).
3. At most one statement color per look. Neutrals go with anything, and repeating the same color counts as one.

The rules live in [`frontend/src/lib/rules.ts`](frontend/src/lib/rules.ts) and are covered by unit tests.

## How YouCam is used

The backend calls the YouCam Clothes V4 API ([docs](https://docs.perfectcorp.com/reference/ai_clothes/v4.0)):

1. `POST /s2s/v2.0/file` registers each image. The image is then uploaded to the returned signed URL.
2. `POST /s2s/v2.0/task/cloth-v4` creates a task with `src_file_id`, `ref_file_id` and `garment_category` (`upper_body`, `lower_body`, `outer` or `full_body`).
3. `GET /s2s/v2.0/task/cloth-v4/{task_id}` is polled until the task reaches `success` or `error`.

V4 handles one garment category per request. The full look is therefore a chain: each result becomes the source photo for the next layer. Previews are labeled as AI approximations; they don't guarantee size or fit.

## Privacy and safety

- The **YouCam API key stays on the server** (environment variable) and is never sent to the browser.
- The **closet is stored only in your browser** (IndexedDB). The person photo stays in memory and is not saved by the app.
- Images are re-encoded before upload, which strips EXIF metadata such as location.
- **Explicit consent** is required before any photo is sent to YouCam. YouCam documents keeping files for up to 30 days ([file retention](https://docs.perfectcorp.com/develop/file_retention_period)).
- **Spend guards:**
  - one running task per session;
  - per-session and daily limits;
  - no automatic resubmission after an ambiguous network failure.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, idb-keyval, Vitest. All UI copy lives in [`frontend/src/i18n/en.ts`](frontend/src/i18n/en.ts), and the layout uses logical CSS properties so Arabic/RTL can be added.
- **Backend:** Python, Django, Django REST Framework, Pillow, SQLite (stores task references only — no photos).

## Run locally

Requirements: Python 3.12+, Node.js 20+, and a YouCam API key ([API console](https://yce.perfectcorp.com/api-console/en/api-keys/)).

```bash
# 1. Configuration — copy the example and fill in YOUCAM_API_KEY and DJANGO_SECRET_KEY
cp .env.local.example .env.local

# 2. Backend (http://127.0.0.1:8000)
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements.txt   # macOS/Linux: .venv/bin/python
cd backend
../.venv/Scripts/python manage.py migrate
../.venv/Scripts/python manage.py runserver 127.0.0.1:8000

# 3. Frontend (http://localhost:5173) — in a second terminal
cd frontend
npm install
npm run dev
```

Without an API key, everything works except try-on, and the try-on page says so.

## Tests

```bash
cd frontend && npx vitest run                    # outfit rules
cd backend && ../.venv/Scripts/python manage.py test tryon   # API endpoints, with YouCam mocked
```

The backend tests mock the provider; they verify our own logic (consent, limits, validation, no silent retries), not YouCam's output.

## Development timeline

- **September 28, 2026 (before the submission period):** research, API probe, and the initial prototype — closet, outfit rules, single-piece and layered try-on. Recorded in the first commit.
- **From September 29, 2026 (submission period):** see the commit history.

## Credits

- Virtual try-on by the [YouCam API](https://yce.perfectcorp.com/) (Perfect Corp.).
- Sample closet illustrations are original SVG artwork made for this project.

## License

[MIT](LICENSE)
