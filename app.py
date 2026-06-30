import os
import io
import base64
import requests
from flask import Flask, render_template, request, jsonify, send_from_directory
from PIL import Image
import pytesseract
from langdetect import detect, DetectorFactory
from deep_translator import GoogleTranslator
from werkzeug.utils import secure_filename

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

DetectorFactory.seed = 0 

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 

ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif'}

COUNTRY_TO_LANG = {
    'IR': 'fa', 'AF': 'fa', 'TJ': 'fa',
    'RU': 'ru', 'BY': 'ru', 'KZ': 'ru', 'KG': 'ru', 'UZ': 'ru',
    'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'IQ': 'ar', 'JO': 'ar', 'KW': 'ar',
    'CN': 'zh', 'TW': 'zh', 'HK': 'zh',
    'FR': 'fr', 'BE': 'fr',
    'DE': 'de', 'AT': 'de',
    'ES': 'es', 'MX': 'es', 'AR': 'es',
    'TR': 'tr',
    'JP': 'ja',
    'KR': 'ko',
    'IT': 'it',
    'PT': 'pt', 'BR': 'pt',
    'IN': 'hi',
}

TESSERACT_LANGS = "eng+fas+ara+rus+chi_sim+fra+deu+spa+ita+por+tur+jpn+kor+hin"


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT


def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr


def detect_country_from_ip(ip):
    try:
        r = requests.get('http://ip-api.com/json/?fields=countryCode', timeout=3)
        if r.status_code == 200:
            code = r.json().get('countryCode', '').strip().upper()
            if len(code) == 2:
                return code
    except Exception:
        pass
    return None


@app.after_request
def no_cache(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    return response


@app.route('/')
def index():
    return render_template('index.html', ui_lang='en', country='XX')


@app.route('/api/detect-lang')
def api_detect_lang():
    ip = get_client_ip()
    country = detect_country_from_ip(ip)
    ui_lang = COUNTRY_TO_LANG.get(country, 'en') if country else 'en'
    return jsonify({'ip': ip, 'country': country, 'ui_lang': ui_lang})


@app.route('/api/ocr', methods=['POST'])
def api_ocr():
    image = None

    if 'file' in request.files and request.files['file'].filename:
        f = request.files['file']
        if not allowed_file(f.filename):
            return jsonify({'ok': False, 'error': 'Unsupported file type'}), 400
        try:
            image = Image.open(f.stream)
        except Exception as e:
            return jsonify({'ok': False, 'error': f'Cannot open image: {e}'}), 400

    elif request.form.get('image_url'):
        url = request.form.get('image_url').strip()
        try:
            resp = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
            resp.raise_for_status()
            image = Image.open(io.BytesIO(resp.content))
        except Exception as e:
            return jsonify({'ok': False, 'error': f'Cannot fetch URL: {e}'}), 400

    elif request.form.get('image_b64'):
        try:
            b64 = request.form.get('image_b64')
            if ',' in b64:
                b64 = b64.split(',', 1)[1]
            image = Image.open(io.BytesIO(base64.b64decode(b64)))
        except Exception as e:
            return jsonify({'ok': False, 'error': f'Invalid base64 image: {e}'}), 400
    else:
        return jsonify({'ok': False, 'error': 'No image provided'}), 400

    if image.mode != 'RGB':
        image = image.convert('RGB')

    try:
        raw_text = pytesseract.image_to_string(image, lang=TESSERACT_LANGS)
    except pytesseract.TesseractError as e:
        try:
            raw_text = pytesseract.image_to_string(image, lang='eng')
        except Exception as e2:
            return jsonify({'ok': False, 'error': f'OCR engine error: {e2}'}), 500

    raw_text = (raw_text or '').strip()

    detected_lang = None
    if raw_text:
        try:
            detected_lang = detect(raw_text)
        except Exception:
            detected_lang = None

    return jsonify({
        'ok': True,
        'text': raw_text,
        'detected_lang': detected_lang,
        'char_count': len(raw_text),
        'word_count': len(raw_text.split()) if raw_text else 0,
    })


@app.route('/api/translate', methods=['POST'])
def api_translate():
    data = request.get_json(silent=True) or {}
    text = (data.get('text') or '').strip()
    target = (data.get('target') or 'en').strip()
    source = (data.get('source') or 'auto').strip()

    if not text:
        return jsonify({'ok': False, 'error': 'Empty text'}), 400

    try:
        chunks = [text[i:i+4500] for i in range(0, len(text), 4500)]
        translated_parts = []
        for ch in chunks:
            tr = GoogleTranslator(source=source, target=target).translate(ch)
            translated_parts.append(tr or '')
        translated = '\n'.join(translated_parts)
        return jsonify({'ok': True, 'translated': translated, 'target': target, 'source': source})
    except Exception as e:
        return jsonify({'ok': False, 'error': f'Translation failed: {e}'}), 500


@app.route('/health')
def health():
    try:
        ver = str(pytesseract.get_tesseract_version())
    except Exception:
        ver = 'unavailable'
    return jsonify({'status': 'ok', 'tesseract': ver})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
