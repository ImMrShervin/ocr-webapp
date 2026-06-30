set -e

echo "🔧 Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  tesseract-ocr \
  tesseract-ocr-eng \
  tesseract-ocr-fas \
  tesseract-ocr-ara \
  tesseract-ocr-rus \
  tesseract-ocr-chi-sim \
  tesseract-ocr-fra \
  tesseract-ocr-deu \
  tesseract-ocr-spa \
  tesseract-ocr-ita \
  tesseract-ocr-por \
  tesseract-ocr-tur \
  tesseract-ocr-jpn \
  tesseract-ocr-kor \
  tesseract-ocr-hin

echo "🐍 Installing Python dependencies..."
pip install --quiet --no-input -r requirements.txt

echo "✅ Done... Run with:  python3 app.py"
