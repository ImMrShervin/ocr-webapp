(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const initialLang = document.documentElement.getAttribute('data-ui-lang') || 'en';
  $('#uiLangSelect').value = initialLang;
  applyI18n(initialLang);

  fetch('http://ip-api.com/json/?fields=countryCode').then(r=>r.json()).then(data=>{
    const COUNTRY_TO_LANG = {
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
    };
    const code = data.countryCode;
    const lang = COUNTRY_TO_LANG[code];
    if(lang){
      $('#uiLangSelect').value = lang;
      applyI18n(lang);
      document.documentElement.lang = lang;
    }
  }).catch(()=>{});

  $('#uiLangSelect').addEventListener('change', e=>{
    const lang = e.target.value;
    applyI18n(lang);
    document.documentElement.lang = lang;
  });

  const savedTheme = localStorage.getItem('lenstext-theme') || 'light';
  if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme','dark');
  $('#themeToggle').addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    if (cur === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('lenstext-theme', cur);
  });

  $$('.tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      $$('.tab').forEach(x=>x.classList.remove('active'));
      $$('.tab-panel').forEach(p=>p.classList.remove('active'));
      t.classList.add('active');
      $(`.tab-panel[data-panel="${t.dataset.tab}"]`).classList.add('active');
    });
  });

  function toast(msg){
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>t.classList.remove('show'), 1800);
  }

  function showOverlay(show){
    $('#overlay').hidden = !show;
  }

  function showPreview(src){
    $('#preview').src = src;
    $('#previewWrap').hidden = false;
  }
  $('#clearBtn').addEventListener('click', ()=>{
    $('#preview').src = '';
    $('#previewWrap').hidden = true;
    $('#results').hidden = true;
    $('#fileInput').value = '';
    $('#urlInput').value = '';
  });

  const dz = $('#dropzone');
  const fileInput = $('#fileInput');
  fileInput.addEventListener('change', e=>{
    const f = e.target.files[0];
    if (f) handleFile(f);
  });
  ;['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev, e=>{
    e.preventDefault(); dz.classList.add('drag');
  }));
  ;['dragleave','drop'].forEach(ev=>dz.addEventListener(ev, e=>{
    e.preventDefault(); dz.classList.remove('drag');
  }));
  dz.addEventListener('drop', e=>{
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  const pasteArea = $('#pasteArea');
  pasteArea.addEventListener('paste', e=>{
    const items = e.clipboardData?.items || [];
    for (const it of items){
      if (it.type.startsWith('image/')){
        const f = it.getAsFile();
        if (f) handleFile(f);
        break;
      }
    }
  });

  window.addEventListener('paste', e=>{
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    const items = e.clipboardData?.items || [];
    for (const it of items){
      if (it.type.startsWith('image/')){
        const f = it.getAsFile();
        if (f) handleFile(f);
        break;
      }
    }
  });
  ;['dragenter','dragover'].forEach(ev=>pasteArea.addEventListener(ev, e=>{
    e.preventDefault(); pasteArea.classList.add('drag');
  }));
  ;['dragleave','drop'].forEach(ev=>pasteArea.addEventListener(ev, e=>{
    e.preventDefault(); pasteArea.classList.remove('drag');
  }));
  pasteArea.addEventListener('drop', e=>{
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  $('#urlGoBtn').addEventListener('click', async ()=>{
    const url = $('#urlInput').value.trim();
    if (!url) return;
    showPreview(url);
    await runOCR({ image_url: url });
  });
  $('#urlInput').addEventListener('keydown', e=>{
    if (e.key === 'Enter') $('#urlGoBtn').click();
  });

  function handleFile(file){
    const reader = new FileReader();
    reader.onload = ev=>{
      showPreview(ev.target.result);
      runOCR({ file });
    };
    reader.readAsDataURL(file);
  }

  async function runOCR(opts){
    showOverlay(true);
    try{
      const fd = new FormData();
      if (opts.file) fd.append('file', opts.file);
      else if (opts.image_url) fd.append('image_url', opts.image_url);
      else if (opts.image_b64) fd.append('image_b64', opts.image_b64);

      const r = await fetch('/api/ocr', { method:'POST', body: fd });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || 'OCR failed');

      $('#extractedText').value = data.text || '';
      $('#translatedText').value = '';
      $('#detectedLang').textContent = data.detected_lang || '—';
      $('#charCount').textContent = data.char_count || 0;
      $('#wordCount').textContent = data.word_count || 0;

      $('#results').hidden = false;

      const uiLang = $('#uiLangSelect').value;
      const targetSelect = $('#targetLangSelect');
      const map = { zh: 'zh-CN' };
      const targetCandidate = map[uiLang] || uiLang;
      if ([...targetSelect.options].some(o=>o.value===targetCandidate)){
        targetSelect.value = targetCandidate;
      }
      $('#results').scrollIntoView({behavior:'smooth', block:'start'});
      if (!data.text){
        const dict = I18N[$('#uiLangSelect').value] || I18N.en;
        toast(dict.toast_no_text);
      }
    } catch(err){
      console.error(err);
      const dict = I18N[$('#uiLangSelect').value] || I18N.en;
      toast(dict.toast_error + ': ' + err.message);
    } finally {
      showOverlay(false);
    }
  }

  $('#translateBtn').addEventListener('click', async ()=>{
    const text = $('#extractedText').value.trim();
    const target = $('#targetLangSelect').value;
    if (!text){
      const dict = I18N[$('#uiLangSelect').value] || I18N.en;
      toast(dict.toast_no_text);
      return;
    }
    showOverlay(true);
    try{
      const r = await fetch('/api/translate', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text, target, source: 'auto' })
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || 'translation failed');
      $('#translatedText').value = data.translated;
    } catch(err){
      const dict = I18N[$('#uiLangSelect').value] || I18N.en;
      toast(dict.toast_error + ': ' + err.message);
    } finally {
      showOverlay(false);
    }
  });

  $$('[data-copy]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-copy');
      const v = $('#'+id).value;
      if (!v) return;
      navigator.clipboard.writeText(v).then(()=>{
        const dict = I18N[$('#uiLangSelect').value] || I18N.en;
        toast(dict.toast_copied);
      });
    });
  });
  $$('[data-download]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-download');
      const v = $('#'+id).value;
      if (!v) return;
      const blob = new Blob([v], {type:'text/plain;charset=utf-8'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = id === 'extractedText' ? 'extracted.txt' : 'translated.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  });

})();
