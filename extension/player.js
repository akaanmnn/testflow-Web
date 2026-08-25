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
          const nodes = document.querySelectorAll('button, a, label, span, div, [role="button"]');
          for (const n of nodes) {
            if ((n.innerText || '').trim().slice(0, 60) === c.value) return n;
          }
          return null;
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

  // Adayları skorla dener; 5sn boyunca 250ms'de bir yeniden dener (sayfa yükleniyor olabilir)
  async function findElement(candidates) {
    const sorted = [...candidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      for (let i = 0; i < sorted.length; i++) {
        const el = findByCandidate(sorted[i]);
        if (isVisible(el)) {
          return { el, usedIndex: i, strategy: sorted[i].strategy };
        }
      }
      await sleep(250);
    }
    return null;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  async function executeStep(step, stepIndex) {
    const candidates = JSON.parse(step.candidates || '[]');
    const found = await findElement(candidates);
    if (!found) {
      const r = { status: 'failed', healed: false, errorMessage: 'Element bulunamadı (tüm locator adayları denendi).' };
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
        const r = { status: 'passed', healed, healedStrategy };
        await reportResult(stepIndex, step, r);
        found.el.click();
        return r;
      } else if (step.action === 'fill') {
        if (step.value === '***' || step.value == null) {
          const first = candidates[0] ? `${candidates[0].strategy}=${candidates[0].value}` : 'bilinmiyor';
          const r = { status: 'failed', healed, healedStrategy,
                   errorMessage: `Gizli/boş değer (eleman: ${first}) — senaryoda bu adımı 📎 ile bir test verisi anahtarına bağlayıp Kaydet'e basın. Not: aynı alan için birden fazla fill adımı oluşmuş olabilir, fazlasını silin.` };
          await reportResult(stepIndex, step, r);
          return r;
        }
        found.el.focus();
        setNativeValue(found.el, step.value);
        const r = { status: 'passed', healed, healedStrategy };
        await reportResult(stepIndex, step, r);
        return r;
      } else if (step.action === 'select') {
        setNativeValue(found.el, step.value);
        const r = { status: 'passed', healed, healedStrategy };
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
