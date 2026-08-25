// TestFlow web sayfasında çalışır. Sayfa (window.postMessage) ile
// eklenti (chrome.runtime) arasında mesaj köprüsü kurar.

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || !event.data.type) return;
  const { type } = event.data;

  if (type === 'TESTFLOW_PING') {
    window.postMessage({ type: 'TESTFLOW_PONG', version: chrome.runtime.getManifest().version }, '*');
  }

  if (type === 'TESTFLOW_START_RECORDING') {
    chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      startUrl: event.data.startUrl,
      scenarioName: event.data.scenarioName,
    });
  }

  if (type === 'TESTFLOW_START_RUN') {
    chrome.runtime.sendMessage({
      type: 'START_RUN',
      startUrl: event.data.startUrl,
      steps: event.data.steps,          // binding'leri çözülmüş adımlar
      runContext: event.data.runContext, // scenarioId, environmentId, testDataSetId
    });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RECORDING_DONE') {
    window.postMessage({
      type: 'TESTFLOW_RECORDING_DONE',
      scenarioName: msg.scenarioName,
      startUrl: msg.startUrl,
      steps: msg.steps,
    }, '*');
  }
  if (msg.type === 'RUN_DONE') {
    window.postMessage({
      type: 'TESTFLOW_RUN_DONE',
      runContext: msg.runContext,
      startedAt: msg.startedAt,
      finishedAt: msg.finishedAt,
      results: msg.results,
    }, '*');
  }
});
