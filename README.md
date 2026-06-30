# LensText

A simple multilingual OCR web app Upload an image and get the text instantly.

## Features

- Upload, paste, or drag an image
- OCR for 14 languages (English, Persian, Russian, Chinese, French, German, Spanish, Italian, Portuguese, Turkish, Japanese, Korean, Hindi, Arabic)
- Auto language detection
- Translation via Google Translate
- UI language auto-switches based on user IP
- Light/Dark theme

## Quick Start

```bash
pip install -r requirements.txt
python app.py
```

Open http://localhost:5000

## Project Structure

```
ocr-site/
├── app.py
├── requirements.txt
├── install.sh
├── templates/
│   └── index.html
└── static/
    ├── css/style.css
    └── js/
        ├── i18n.js
        └── app.js
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Web UI |
| GET | `/api/detect-lang` | Detect UI language from IP |
| POST | `/api/ocr` | Extract text from image |
| POST | `/api/translate` | Translate text |
| GET | `/health` | Health check |

## Stack

- Flask + pytesseract + Pillow + langdetect + deep-translator
- Vanilla HTML/CSS/JS
- Tesseract 5
