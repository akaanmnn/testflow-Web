// TestFlow web sayfasında çalışır. Sayfa (window.postMessage) ile
// eklenti (chrome.runtime) arasında mesaj köprüsü kurar.

// Sayfadan gelen mesajlar
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || !event.data.type) return;

  const { type } = event.data;

  if (type === 'TESTFLOW_PING') {
    // Eklenti kurulu mu kontrolü
    window.postMessage({ type: 'TESTFLOW_PONG', version: chrome.runtime.getManifest().version }, '*');
  }

  if (type === 'TESTFLOW_START_RECORDING') {
    chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      startUrl: event.data.startUrl,
      scenarioName: event.data.scenarioName,
    });
  }
});

// Eklentiden gelen mesajlar → sayfaya aktar
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RECORDING_DONE') {
    window.postMessage({
      type: 'TESTFLOW_RECORDING_DONE',
      scenarioName: msg.scenarioName,
      startUrl: msg.startUrl,
      steps: msg.steps,
    }, '*');
  }
});
