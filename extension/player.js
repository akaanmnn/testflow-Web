// Her sayfada yüklenir; background'a "koşumda mıyım?" diye sorar.
// Evetse kaldığı adımdan devam eder. Sayfa geçişlerinde yeniden yüklenip
// background'daki index'ten sürdüğü için navigasyonlara dayanıklıdır.

(async () => {
  let state;
  try {
    state = await chrome.runtime.sendMessage({ type: 'GET_PLAY_STATE' });
  } catch { return; }
  if (!state || !state.playing) return;

  const { steps } = state;
  let index = state.index;

  // ---------- Koşum çubuğu ----------
  const barEl = document.createElement('div');
  barEl.style.cssText = `
    position: fixed; top: 12px; right: 12px; z-index: 2147483647;
    background: #181b23; color: #e6e8ee; border: 1px solid #34c98e;
    border-radius: 10px; padding: 10px 14px; font: 13px system-ui;
    box-shadow: 0 4px 20px rgba(0,0,0,.4);
  `;
  document.documentElement.appendChild(barEl);
  const setBar = (text) => { barEl.textContent = `▶ TestFlow koşuyor — ${text}`; };
  setBar(`adım ${index + 1}/${steps.length}`);

  // ---------- Element bulma (self-healing) ----------
  function findByCandidate(c) {
    try {
      switch (c.strategy) {
        case 'id': return document.getElementById(c.value);
        case 'data-testid': return document.querySelector(`[data-testid="${CSS.escape(c.value)}"]`);
        case 'name': return document.querySelector(`[name="${CSS.escape(c.value)}"]`);
        case 'aria-label': return document.querySelector(`[aria-label="${CSS.escape(c.value)}"]`);
        case 'placeholder': return document.querySelector(`[placeholder="${CSS.escape(c.value)}"]`);
        case 'text': {
          const nodes = [...document.querySelectorAll('button, a, label, span, div, [role="button"]')]
            .filter((n) => (n.innerText || '').trim().slice(0, 60) === c.value);
          if (nodes.length === 0) return null;
          // Öncelik: gerçekten tıklanabilir olanlar (button/a/role=button)
          const clickable = nodes.filter((n) =>
            ['BUTTON', 'A'].includes(n.tagName) || n.getAttribute('role') === 'button');
          const pool = clickable.length ? clickable : nodes;
          // En derin eşleşme: içinde başka eşleşme barındırmayan
          // (butonu saran div yerine butonun kendisi seçilir)
          return pool.find((n) => !pool.some((m) => m !== n && n.contains(m))) || pool[0];
        }
        case 'css': return document.querySelector(c.value);
        default: return null;
      }
    } catch { return null; }
  }

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // Adayları skorla dener; 5sn boyunca 250ms'de bir yeniden dener (sayfa yükleniyor olabilir).
  // validate: bulunan elemanın adım için uygunluğunu doğrular (yanlış elemana
  // "iyileşme" adı altında işlem yapılmasını engeller).
  async function findElement(candidates, validate) {
    const sorted = [...candidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      for (let i = 0; i < sorted.length; i++) {
        const el = findByCandidate(sorted[i]);
        if (isVisible(el) && (!validate || validate(el))) {
          return { el, usedIndex: i, strategy: sorted[i].strategy };
        }
      }
      await sleep(250);
    }
    return null;
  }

  // Adım türüne göre eleman doğrulayıcı üret
  function validatorFor(step) {
    let meta = {};
    try { meta = JSON.parse(step.meta || '{}'); } catch {}
    if (step.action === 'fill') {
      return (el) => {
        if (!['INPUT', 'TEXTAREA'].includes(el.tagName)) return false;
        // Kayıtta input türü biliniyorsa koşumda da aynı olmalı
        // (password adımı asla text alana yazamaz, tersi de geçerli)
        if (meta.inputType && el.tagName === 'INPUT' && el.type !== meta.inputType) return false;
        return true;
      };
    }
    if (step.action === 'select') {
      return (el) => el.tagName === 'SELECT';
    }
    return null; // click/assert: tür kısıtı yok
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Gerçek kullanıcı tıklamasını taklit eder: bazı siteler click yerine
  // pointer/mouse olaylarını dinler, salt el.click() onlarda işe yaramaz.
  function realisticClick(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    try { el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, isPrimary: true })); } catch {}
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    try { el.focus(); } catch {}
    try { el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, isPrimary: true })); } catch {}
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  function setNativeValue(el, value) {
    // React/Vue kontrollü inputlar için native setter kullan
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : el.tagName === 'SELECT'
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---------- Adım çalıştırma ----------
  // reportResult: sonucu background'a yazar (index ilerler)
  async function reportResult(stepIndex, step, result) {
    await chrome.runtime.sendMessage({
      type: 'STEP_RESULT',
      result: { orderIndex: stepIndex, stepId: step.id ?? null, ...result },
    });
  }

  async function captureScreenshot() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'CAPTURE' });
      return res?.screenshot || null;
    } catch { return null; }
  }

  async function executeStep(step, stepIndex) {
    const candidates = JSON.parse(step.candidates || '[]');
    const found = await findElement(candidates, validatorFor(step));
    if (!found) {
      const r = { status: 'failed', healed: false,
        errorMessage: 'Element bulunamadı (tüm locator adayları denendi; tür uyumsuz eşleşmeler reddedildi).',
        screenshot: await captureScreenshot() };
      await reportResult(stepIndex, step, r);
      return r;
    }
    const healed = found.usedIndex > 0;
    const healedStrategy = healed ? found.strategy : null;

    try {
      if (step.action === 'click') {
        found.el.scrollIntoView({ block: 'center' });
        await sleep(100);
        // ÖNEMLİ: sonucu TIKLAMADAN ÖNCE raporla. Tıklama sayfa geçişi
        // başlatırsa bu script ölür ve rapor kaybolur; yeni sayfada aynı
        // adım tekrar aranıp yanlış fail üretirdi.
        const r = { status: 'passed', healed, healedStrategy, screenshot: await captureScreenshot() };
        await reportResult(stepIndex, step, r);
        realisticClick(found.el);
        return r;
      } else if (step.action === 'fill') {
        if (step.value === '***' || step.value == null) {
          const first = candidates[0] ? `${candidates[0].strategy}=${candidates[0].value}` : 'bilinmiyor';
          const r = { status: 'failed', healed, healedStrategy, screenshot: await captureScreenshot(),
                   errorMessage: `Gizli/boş değer (eleman: ${first}) — senaryoda bu adımı 📎 ile bir test verisi anahtarına bağlayıp Kaydet'e basın. Not: aynı alan için birden fazla fill adımı oluşmuş olabilir, fazlasını silin.` };
          await reportResult(stepIndex, step, r);
          return r;
        }
        found.el.focus();
        setNativeValue(found.el, step.value);
        const r = { status: 'passed', healed, healedStrategy, screenshot: await captureScreenshot() };
        await reportResult(stepIndex, step, r);
        return r;
      } else if (step.action === 'select') {
        setNativeValue(found.el, step.value);
        const r = { status: 'passed', healed, healedStrategy, screenshot: await captureScreenshot() };
        await reportResult(stepIndex, step, r);
        return r;
      } else if (step.action === 'assert-visible') {
        // Element bulunduysa (findElement görünürlük kontrolü yapıyor) geçer
        const r = { status: 'passed', healed, healedStrategy, screenshot: await captureScreenshot() };
        await reportResult(stepIndex, step, r);
        return r;
      } else if (step.action === 'assert-text') {
        const actual = (found.el.innerText || found.el.value || '').trim();
        const expected = (step.value || '').trim();
        if (expected && actual.includes(expected)) {
          const r = { status: 'passed', healed, healedStrategy, screenshot: await captureScreenshot() };
          await reportResult(stepIndex, step, r);
          return r;
        }
        const r = { status: 'failed', healed, healedStrategy, screenshot: await captureScreenshot(),
                 errorMessage: `Metin doğrulaması başarısız — beklenen: "${expected.slice(0,80)}", bulunan: "${actual.slice(0,80)}"` };
        await reportResult(stepIndex, step, r);
        return r;
      } else {
        const r = { status: 'skipped', healed: false, errorMessage: `Desteklenmeyen aksiyon: ${step.action}` };
        await reportResult(stepIndex, step, r);
        return r;
      }
    } catch (e) {
      const r = { status: 'failed', healed, healedStrategy, errorMessage: String(e).slice(0, 300) };
      await reportResult(stepIndex, step, r);
      return r;
    }
  }

  // ---------- Ana döngü ----------
  while (index < steps.length) {
    const step = steps[index];
    setBar(`adım ${index + 1}/${steps.length} (${step.action})`);

    const result = await executeStep(step, index); // sonuç executeStep içinde raporlanır

    if (result.status === 'failed') {
      // Kalan adımları skipped işaretle
      for (let j = index + 1; j < steps.length; j++) {
        await chrome.runtime.sendMessage({
          type: 'STEP_RESULT',
          result: { orderIndex: j, stepId: steps[j].id ?? null, status: 'skipped', healed: false },
        });
      }
      break;
    }

    index += 1;
    // Tıklama navigasyona yol açtıysa bu script ölür; yeni sayfada player
    // yeniden yüklenir ve background'daki index'ten devam eder.
    await sleep(400);
  }

  setBar('tamamlandı, sonuçlar gönderiliyor…');
  await chrome.runtime.sendMessage({ type: 'PLAY_DONE' });
})();
