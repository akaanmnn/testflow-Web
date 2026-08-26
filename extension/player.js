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
  async function findElement(candidates, validate, timeoutMs = 5000) {
    const sorted = [...candidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (let i = 0; i < sorted.length; i++) {
        const el = findByCandidate(sorted[i]);
        const visibleOk = isVisible(el) || (el && validate && el.tagName === 'INPUT' && el.type === 'file');
        if (el && visibleOk && (!validate || validate(el))) {
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
    if (step.action === 'upload') {
      return (el) => el.tagName === 'INPUT' && el.type === 'file';
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
    // Opsiyonel adım: başarısızlık koşumu kesmez, 'skipped' olarak geçilir
    // (bazı kayıtlarda alan dolu/kilitli gelir veya hiç görünmez).
    let optional = false;
    let ifEmpty = false;
    try {
      const m = JSON.parse(step.meta || '{}');
      optional = !!m.optional;
      ifEmpty = !!m.ifEmpty;
    } catch {}
    const failStatus = optional ? 'skipped' : 'failed';
    const failPrefix = optional ? 'Opsiyonel adım atlandı — ' : '';
    const candidates = JSON.parse(step.candidates || '[]');
    // Doğrulama adımları sayfa geçişi/yavaş yükleme sonrasına denk gelir —
    // onlara daha uzun bekleme tanınır (12sn). Opsiyonel adımlar (örn. bazen
    // gelen modal kapatma) kısa bekler (3sn) ki modal gelmeyen sayfalarda
    // koşum gereksiz duraksamasın. Diğer adımlar 5sn.
    const timeoutMs = step.action.startsWith('assert') ? 12000 : (optional ? 3000 : 5000);
    const found = await findElement(candidates, validatorFor(step), timeoutMs);
    if (!found) {
      const r = { status: failStatus, healed: false,
        errorMessage: failPrefix + 'Element bulunamadı (tüm locator adayları denendi; tür uyumsuz eşleşmeler reddedildi).',
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
          const r = { status: failStatus, healed, healedStrategy, screenshot: await captureScreenshot(),
                   errorMessage: failPrefix + `Gizli/boş değer (eleman: ${first}) — senaryoda bu adımı 📎 ile bir test verisi anahtarına bağlayıp Kaydet'e basın. Not: aynı alan için birden fazla fill adımı oluşmuş olabilir, fazlasını silin.` };
          await reportResult(stepIndex, step, r);
          return r;
        }
        if (ifEmpty) {
          const locked = found.el.disabled || found.el.readOnly;
          const current = String(found.el.value ?? '').trim();
          if (locked || current) {
            const r = { status: 'skipped', healed, healedStrategy, screenshot: await captureScreenshot(),
                     errorMessage: locked
                       ? 'Alan kilitli (disabled/readonly) geldi — boşsa-doldur gereği dokunulmadı.'
                       : 'Alan zaten dolu geldi — boşsa-doldur gereği mevcut değer korundu.' };
            await reportResult(stepIndex, step, r);
            return r;
          }
        }
        found.el.focus();
        setNativeValue(found.el, step.value);
        const r = { status: 'passed', healed, healedStrategy, screenshot: await captureScreenshot() };
        await reportResult(stepIndex, step, r);
        return r;
      } else if (step.action === 'select') {
        if (ifEmpty) {
          const locked = found.el.disabled;
          const current = String(found.el.value ?? '').trim();
          if (locked || current) {
            const r = { status: 'skipped', healed, healedStrategy, screenshot: await captureScreenshot(),
                     errorMessage: locked
                       ? 'Seçim alanı kilitli (disabled) geldi — boşsa-doldur gereği dokunulmadı.'
                       : 'Seçim alanı zaten dolu geldi — boşsa-doldur gereği mevcut seçim korundu.' };
            await reportResult(stepIndex, step, r);
            return r;
          }
        }
        setNativeValue(found.el, step.value);
        const r = { status: 'passed', healed, healedStrategy, screenshot: await captureScreenshot() };
        await reportResult(stepIndex, step, r);
        return r;
      } else if (step.action === 'upload') {
        if (!step.value || !String(step.value).startsWith('data:')) {
          const r = { status: failStatus, healed, healedStrategy, screenshot: await captureScreenshot(),
                   errorMessage: failPrefix + 'Dosya içeriği yok — bu adımı dosya tipli bir test verisi anahtarına 📎 ile bağlayın.' };
          await reportResult(stepIndex, step, r);
          return r;
        }
        // dataURL → File → input.files (Playwright setInputFiles'ın tarayıcı içi karşılığı)
        const [head, b64] = String(step.value).split(',');
        const mime = (head.match(/data:(.*?)(;|$)/) || [])[1] || 'application/octet-stream';
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let bi = 0; bi < bin.length; bi++) bytes[bi] = bin.charCodeAt(bi);
        const file = new File([bytes], step.fileName || 'dosya', { type: mime });
        const dt = new DataTransfer();
        dt.items.add(file);
        found.el.files = dt.files;
        found.el.dispatchEvent(new Event('input', { bubbles: true }));
        found.el.dispatchEvent(new Event('change', { bubbles: true }));
        const r = { status: 'passed', healed, healedStrategy, screenshot: await captureScreenshot() };
        await reportResult(stepIndex, step, r);
        return r;
      } else if (step.action === 'assert-visible') {
        // Element bulunduysa (findElement görünürlük kontrolü yapıyor) geçer
        const r = { status: 'passed', healed, healedStrategy, screenshot: await captureScreenshot() };
        await reportResult(stepIndex, step, r);
        return r;
      } else if (step.action === 'assert-text') {
        const expected = (step.value || '').trim();
        // SPA/menü geçişlerinde element hemen bulunur ama içeriği gecikmeli
        // değişir ("İş Listesi" → "Dosya Listeleme" gibi). Bu yüzden elementi
        // ve metni BİRLİKTE, süre dolana dek yeniden kontrol ederiz — sayfa
        // yeniden render edilse bile her turda taze element üzerinden bakılır.
        const deadline = Date.now() + 12000;
        let lastActual = (found.el.innerText || found.el.value || '').trim();
        let lastHealed = healed;
        let lastStrategy = healedStrategy;
        while (Date.now() < deadline) {
          if (expected && lastActual.includes(expected)) {
            const r = { status: 'passed', healed: lastHealed, healedStrategy: lastStrategy,
                        screenshot: await captureScreenshot() };
            await reportResult(stepIndex, step, r);
            return r;
          }
          await sleep(400);
          const again = await findElement(candidates, validatorFor(step), 600);
          if (again) {
            lastActual = (again.el.innerText || again.el.value || '').trim();
            lastHealed = again.usedIndex > 0;
            lastStrategy = lastHealed ? again.strategy : null;
          }
        }
        const r = { status: failStatus, healed: lastHealed, healedStrategy: lastStrategy,
                 screenshot: await captureScreenshot(),
                 errorMessage: failPrefix + `Metin doğrulaması başarısız — beklenen: "${expected.slice(0,80)}", bulunan: "${lastActual.slice(0,80)}"` };
        await reportResult(stepIndex, step, r);
        return r;
      } else {
        const r = { status: 'skipped', healed: false, errorMessage: `Desteklenmeyen aksiyon: ${step.action}` };
        await reportResult(stepIndex, step, r);
        return r;
      }
    } catch (e) {
      const r = { status: failStatus, healed, healedStrategy, errorMessage: failPrefix + String(e).slice(0, 300) };
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
