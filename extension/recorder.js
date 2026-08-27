// Her sayfada yüklenir; background'a "kayıtta mıyım?" diye sorar,
// evet ise dinleyicileri kurar ve durdurma çubuğunu gösterir.

(async () => {
  let response;
  try {
    response = await chrome.runtime.sendMessage({ type: 'AM_I_RECORDING' });
  } catch { return; }
  if (!response || !response.recording) return;

  let stepCount = 0;

  // ---------- Locator aday üretimi (self-healing temeli) ----------
  function cssPath(el) {
    if (!(el instanceof Element)) return null;
    const parts = [];
    while (el && el.nodeType === Node.ELEMENT_NODE && parts.length < 6) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        parts.unshift(`${selector}#${CSS.escape(el.id)}`);
        break;
      }
      const parent = el.parentNode;
      if (parent) {
        const siblings = [...parent.children].filter((c) => c.nodeName === el.nodeName);
        if (siblings.length > 1) {
          selector += `:nth-of-type(${siblings.indexOf(el) + 1})`;
        }
      }
      parts.unshift(selector);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }

  function buildCandidates(el) {
    const candidates = [];
    // Yapısal/anlamsal adaylar önce — metin EN SON çare (skoru en düşük):
    // buton/link metinleri sık değişir ("Giriş" → "Oturum Aç") ve otomasyonu kırar.
    if (el.id) candidates.push({ strategy: 'id', value: el.id, score: 1.0 });
    if (el.getAttribute('data-testid'))
      candidates.push({ strategy: 'data-testid', value: el.getAttribute('data-testid'), score: 0.98 });
    if (el.name) candidates.push({ strategy: 'name', value: el.name, score: 0.9 });
    if (el.getAttribute('aria-label'))
      candidates.push({ strategy: 'aria-label', value: el.getAttribute('aria-label'), score: 0.85 });
    if (el.placeholder) candidates.push({ strategy: 'placeholder', value: el.placeholder, score: 0.8 });
    // Link adresi metinden çok daha stabildir
    if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href') !== '#')
      candidates.push({ strategy: 'href', value: el.getAttribute('href'), score: 0.75 });
    const css = cssPath(el);
    if (css) candidates.push({ strategy: 'css', value: css, score: 0.6 });
    const text = (el.innerText || '').trim().slice(0, 60);
    if (text && text.length >= 2 && ['BUTTON', 'A', 'LABEL', 'SPAN', 'DIV'].includes(el.tagName))
      candidates.push({ strategy: 'text', value: text, score: 0.45 });
    return candidates;
  }

  function isSensitive(el) {
    return el.type === 'password' ||
      /passw|sifre|şifre|secret|pin/i.test(el.name || '') ||
      /passw|sifre|şifre|secret|pin/i.test(el.id || '');
  }

  async function sendStep(step) {
    stepCount += 1;
    updateBar();
    await chrome.runtime.sendMessage({ type: 'STEP', step });
  }

  // ---------- Olay dinleyicileri ----------

  let assertMode = false;

  // Tıklama (capture fazında — preventDefault yapan sitelerde de yakalar)
  document.addEventListener('click', (e) => {
    const rawTarget = e.target;
    if (barEl.contains(rawTarget)) return; // kendi çubuğumuzu kaydetme

    // ---- Doğrulama modu: tıklanan eleman için assert adımı ekle ----
    if (assertMode) {
      e.preventDefault();
      e.stopPropagation();
      const el = rawTarget;
      const text = (el.innerText || el.value || '').trim().slice(0, 80);
      sendStep({
        action: text ? 'assert-text' : 'assert-visible',
        candidates: JSON.stringify(buildCandidates(el)),
        value: text || null,
        sensitive: false,
        meta: JSON.stringify({ tag: el.tagName.toLowerCase(), url: location.href, assertion: true }),
      });
      exitAssertMode();
      return;
    }

    const el = rawTarget.closest('button, a, input, select, [role="button"], label') || rawTarget;
    sendStep({
      action: 'click',
      candidates: JSON.stringify(buildCandidates(el)),
      value: null,
      sensitive: false,
      meta: JSON.stringify({ tag: el.tagName.toLowerCase(), url: location.href }),
    });
  }, true);

  // Doğrulama modunda üzerine gelinen elemanı vurgula
  let hoverEl = null;
  document.addEventListener('mouseover', (e) => {
    if (!assertMode || barEl.contains(e.target)) return;
    if (hoverEl) hoverEl.style.outline = hoverEl.__tfOldOutline || '';
    hoverEl = e.target;
    hoverEl.__tfOldOutline = hoverEl.style.outline;
    hoverEl.style.outline = '3px solid #34c98e';
  }, true);

  function exitAssertMode() {
    assertMode = false;
    if (hoverEl) { hoverEl.style.outline = hoverEl.__tfOldOutline || ''; hoverEl = null; }
    updateAssertButton();
  }

  // Input değerleri — yazma bitince (change) kaydet, her tuşta değil.
  // Aynı elemana üst üste change gelirse önceki adımın üzerine yazılır (tekilleştirme).
  let lastFillKey = null;
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;

    // Dosya seçimi: içerik kaydedilmez (koşumda test verisinden gelir),
    // sadece upload adımı + seçilen dosyanın adı not edilir.
    if (el.type === 'file') {
      const fileName = el.files && el.files[0] ? el.files[0].name : null;
      sendStep({
        action: 'upload',
        candidates: JSON.stringify(buildCandidates(el)),
        value: null,
        sensitive: false,
        meta: JSON.stringify({ tag: 'input', inputType: 'file', fileName, url: location.href }),
      });
      return;
    }

    const sensitive = isSensitive(el);
    const fillKey = el.id || el.name || cssPath(el);
    const replacePrev = fillKey && fillKey === lastFillKey;
    lastFillKey = fillKey;
    sendStep({
      action: el.tagName === 'SELECT' ? 'select' : 'fill',
      candidates: JSON.stringify(buildCandidates(el)),
      value: sensitive ? '***' : el.value,
      sensitive,
      meta: JSON.stringify({ tag: el.tagName.toLowerCase(), inputType: el.type || null, url: location.href }),
      replacePrev,
    });
  }, true);

  // Tıklama olunca fill zinciri kırılır (araya tıklama girdiyse yeni fill ayrı adımdır)
  document.addEventListener('click', () => { lastFillKey = null; }, true);

  // ---------- Kayıt çubuğu ----------
  const barEl = document.createElement('div');
  barEl.id = '__testflow_bar';
  barEl.style.cssText = `
    position: fixed; top: 12px; right: 12px; z-index: 2147483647;
    background: #181b23; color: #e6e8ee; border: 1px solid #4f7cff;
    border-radius: 10px; padding: 10px 14px; font: 13px system-ui;
    display: flex; gap: 12px; align-items: center;
    box-shadow: 0 4px 20px rgba(0,0,0,.4);
  `;
  barEl.innerHTML = `
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f0556a;animation:__tf_pulse 1.2s infinite"></span>
    <span>TestFlow kaydediyor — <b id="__tf_count">0</b> adım</span>
    <button id="__tf_assert" style="background:#34c98e;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font:13px system-ui">✓ Doğrula</button>
    <button id="__tf_stop" style="background:#4f7cff;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font:13px system-ui">Kaydı Bitir</button>
  `;
  const style = document.createElement('style');
  style.textContent = '@keyframes __tf_pulse { 0%,100%{opacity:1} 50%{opacity:.3} }';
  document.documentElement.appendChild(style);
  document.documentElement.appendChild(barEl);

  function updateBar() {
    const el = document.getElementById('__tf_count');
    if (el) el.textContent = String(stepCount);
  }

  function updateAssertButton() {
    const btn = document.getElementById('__tf_assert');
    if (!btn) return;
    btn.textContent = assertMode ? 'Vazgeç' : '✓ Doğrula';
    btn.style.background = assertMode ? '#e8b93e' : '#34c98e';
  }

  document.getElementById('__tf_assert').addEventListener('click', (e) => {
    e.stopPropagation();
    if (assertMode) { exitAssertMode(); return; }
    assertMode = true;
    updateAssertButton();
  });

  document.getElementById('__tf_stop').addEventListener('click', async (e) => {
    e.stopPropagation();
    await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  });
})();
