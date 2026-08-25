// Kayıt oturumu durumu (service worker uyuyabilir → chrome.storage.session'da tut)

async function getSession() {
  const { session } = await chrome.storage.session.get('session');
  return session || null;
}

async function setSession(session) {
  await chrome.storage.session.set({ session });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg, sender).then(sendResponse);
  return true; // async yanıt
});

async function handle(msg, sender) {
  // Web arayüzünden: kaydı başlat
  if (msg.type === 'START_RECORDING') {
    const tab = await chrome.tabs.create({ url: msg.startUrl });
    await setSession({
      tabId: tab.id,
      appTabId: sender.tab.id,       // TestFlow arayüzünün sekmesi (sonuç buraya döner)
      scenarioName: msg.scenarioName,
      startUrl: msg.startUrl,
      steps: [],
    });
    return { ok: true };
  }

  // recorder.js: "bu sekmede kayıt var mı?"
  if (msg.type === 'AM_I_RECORDING') {
    const session = await getSession();
    return { recording: !!session && sender.tab && sender.tab.id === session.tabId };
  }

  // recorder.js: yeni adım
  if (msg.type === 'STEP') {
    const session = await getSession();
    if (!session || !sender.tab || sender.tab.id !== session.tabId) return { ok: false };
    session.steps.push(msg.step);
    await setSession(session);
    return { ok: true, count: session.steps.length };
  }

  // recorder.js: kaydı bitir
  if (msg.type === 'STOP_RECORDING') {
    const session = await getSession();
    if (!session) return { ok: false };
    await chrome.storage.session.remove('session');

    // Sonucu TestFlow arayüzü sekmesine gönder
    try {
      await chrome.tabs.sendMessage(session.appTabId, {
        type: 'RECORDING_DONE',
        scenarioName: session.scenarioName,
        startUrl: session.startUrl,
        steps: session.steps,
      });
      await chrome.tabs.update(session.appTabId, { active: true });
    } catch (e) {
      console.error('TestFlow sekmesine ulaşılamadı:', e);
    }
    // Kayıt sekmesini kapat
    if (sender.tab && sender.tab.id === session.tabId) {
      chrome.tabs.remove(session.tabId);
    }
    return { ok: true };
  }

  return { ok: false };
}

// Kayıt sekmesi elle kapatılırsa oturumu temizle
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const session = await getSession();
  if (session && session.tabId === tabId) {
    await chrome.storage.session.remove('session');
  }
});
