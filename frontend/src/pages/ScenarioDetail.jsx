import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const ACTIONS = ['goto', 'click', 'fill', 'select', 'upload', 'assert-text', 'assert-visible', 'wait'];

export default function ScenarioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState(null);
  const [dataSets, setDataSets] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [runEnv, setRunEnv] = useState('');
  const [runDataSet, setRunDataSet] = useState('');
  const [running, setRunning] = useState(false);
  const runCtx = useRef(null);

  useEffect(() => {
    Promise.all([api(`/scenarios/${id}`), api('/test-data-sets'), api('/environments')])
      .then(([s, ds, envs]) => {
        setScenario(s);
        setSteps(s.steps || []);
        setDataSets(ds);
        setEnvironments(envs);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // Koşum sonucu dinleyicisi (eklentiden)
  useEffect(() => {
    const onMessage = async (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.type !== 'TESTFLOW_RUN_DONE') return;
      if (!runCtx.current || event.data.runContext?.scenarioId !== id) return;

      setRunning(false);
      const results = event.data.results || [];
      const anyFailed = results.some((r) => r.status === 'failed');
      try {
        await api('/runs', {
          method: 'POST',
          body: JSON.stringify({
            scenarioId: id,
            environmentId: runCtx.current.environmentId,
            testDataSetId: runCtx.current.testDataSetId,
            status: event.data.aborted ? 'failed' : (anyFailed ? 'failed' : 'passed'),
            startedAt: event.data.startedAt,
            finishedAt: event.data.finishedAt,
            stepResults: results,
          }),
        });

        // İyileşmeyi kalıcılaştır: healed adımlarda çalışan stratejinin
        // skorunu yükselt ki sonraki koşumda ilk denemede bulunsun.
        const healedResults = results.filter((r) => r.healed && r.healedStrategy);
        if (healedResults.length > 0) {
          const patchedSteps = steps.map((s) => {
            const hr = healedResults.find(
              (r) => (r.stepId && r.stepId === s.id) || r.orderIndex === s.orderIndex,
            );
            if (!hr) return s;
            try {
              const cands = JSON.parse(s.candidates || '[]');
              const maxScore = Math.max(...cands.map((c) => c.score ?? 0), 0);
              const updated = cands.map((c) =>
                c.strategy === hr.healedStrategy ? { ...c, score: maxScore + 0.05 } : c,
              );
              return { ...s, candidates: JSON.stringify(updated) };
            } catch { return s; }
          });
          await api(`/scenarios/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ steps: patchedSteps }),
          });
        }

        runCtx.current = null;
        navigate('/runs');
      } catch (e) {
        setError(`Koşum bitti ama sonuç kaydedilemedi: ${e.message}`);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id, navigate, steps, dataSets]);

  // Anahtarlar tipleriyle: upload adımları dosya anahtarlarına, diğerleri metin anahtarlarına bağlanır
  const allEntries = dataSets.flatMap((ds) => {
    try { return JSON.parse(ds.entries).map((e) => ({ key: e.key, type: e.type || 'text' })); } catch { return []; }
  });
  const keysFor = (action) => [...new Set(allEntries
    .filter((e) => (action === 'upload' ? e.type === 'file' : e.type !== 'file'))
    .map((e) => e.key))];

  const updateStep = (i, patch) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const addStep = () =>
    setSteps((prev) => [...prev, {
      orderIndex: prev.length, action: 'click', candidates: '[]',
      value: '', dataBinding: null, sensitive: false, meta: '{}',
    }]);

  const removeStep = (i) =>
    setSteps((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, orderIndex: idx })));

  const moveStep = (i, dir) =>
    setSteps((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((s, idx) => ({ ...s, orderIndex: idx }));
    });

  const save = async () => {
    setError('');
    try {
      const normalized = steps.map((s, i) => ({ ...s, orderIndex: i }));
      const updated = await api(`/scenarios/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ steps: normalized }),
      });
      setScenario(updated);
      setSteps(updated.steps || []);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message); }
  };

  const del = async () => {
    setError('');
    if (!window.confirm('Senaryo silinsin mi? Bu işlem geri alınamaz.')) return;
    try {
      await api(`/scenarios/${id}`, { method: 'DELETE' });
      navigate('/scenarios');
    } catch (e) { setError(e.message); }
  };

  // ---------- Koşum ----------
  const startRun = () => {
    setError('');

    // Test verisi çözümü: dataBinding olan adımların değerini setten doldur
    let resolvedSteps;
    try {
      const set = runDataSet ? dataSets.find((d) => d.id === runDataSet) : null;
      const entries = set ? JSON.parse(set.entries) : [];
      const byKey = Object.fromEntries(entries.map((e) => [e.key, e]));

      resolvedSteps = steps.map((s) => {
        if (!s.dataBinding) return s;
        const binding = JSON.parse(s.dataBinding);
        const entry = byKey[binding.dataSetKey];
        const val = entry?.value;
        if (val === undefined) {
          throw new Error(`"${binding.dataSetKey}" anahtarı seçilen test veri setinde yok. ` +
            (runDataSet ? 'Doğru seti seçtiğinizden emin olun.' : 'Koşum için bir test veri seti seçin.'));
        }
        return { ...s, value: val, ...(entry.type === 'file' ? { fileName: entry.fileName } : {}) };
      });
    } catch (e) {
      setError(e.message);
      return;
    }

    // Ortam seçiliyse başlangıç URL'inin origin'ini ortamın baseUrl'i ile değiştir
    let startUrl = scenario.startUrl;
    if (runEnv) {
      const env = environments.find((en) => en.id === runEnv);
      try {
        const u = new URL(scenario.startUrl);
        const base = new URL(env.baseUrl);
        startUrl = base.origin + u.pathname + u.search + u.hash;
      } catch { startUrl = env.baseUrl; }
    }

    runCtx.current = {
      scenarioId: id,
      environmentId: runEnv || null,
      testDataSetId: runDataSet || null,
    };
    setRunning(true);
    setShowRun(false);
    window.postMessage({
      type: 'TESTFLOW_START_RUN',
      startUrl,
      steps: resolvedSteps,
      runContext: runCtx.current,
    }, '*');
  };

  if (!scenario) return <div className="muted">Yükleniyor…</div>;

  const hasBinding = steps.some((s) => s.dataBinding);

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{scenario.name}</h1>
        <div className="row">
          <button className="danger" onClick={del}>Sil</button>
          <button className="ghost" onClick={() => setShowRun(!showRun)} disabled={running || steps.length === 0}>
            {running ? '▶ Koşuyor…' : '▶ Koş'}
          </button>
          <button onClick={save}>{saved ? 'Kaydedildi ✓' : 'Kaydet'}</button>
        </div>
      </div>
      <div className="muted" style={{ marginBottom: 20 }}>{scenario.startUrl}</div>

      {showRun && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <select value={runEnv} onChange={(e) => setRunEnv(e.target.value)} style={{ width: 240 }}>
              <option value="">Ortam: kayıttaki URL</option>
              {environments.map((en) => <option key={en.id} value={en.id}>{en.name} ({en.baseUrl})</option>)}
            </select>
            <select value={runDataSet} onChange={(e) => setRunDataSet(e.target.value)} style={{ width: 240 }}>
              <option value="">Test verisi: yok</option>
              {dataSets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button onClick={startRun}>Başlat</button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            💡 Temiz oturum için: koşumlar gizli pencerede yapılır — bunun için bir kez
            <code>chrome://extensions</code> → TestFlow Recorder → Ayrıntılar → <b>Gizli modda izin ver</b>'i açın.
            İzin yoksa koşum normal sekmede yapılır ve önceki oturum (login) açık kalabilir.
          </div>
          {hasBinding && !runDataSet && (
            <div className="muted" style={{ fontSize: 12 }}>
              ⚠️ Bu senaryoda test verisine bağlı adımlar var — koşum için bir veri seti seçmelisiniz.
            </div>
          )}
        </div>
      )}

      {running && (
        <div className="badge queued" style={{ padding: '8px 14px', marginBottom: 16, display: 'block' }}>
          ▶ Koşum sürüyor — açılan sekmede adımlar oynatılıyor, bitince sonuçlar otomatik kaydedilecek.
        </div>
      )}

      {steps.map((step, i) => {
        const binding = step.dataBinding ? JSON.parse(step.dataBinding) : null;
        let firstCandidate = null;
        try {
          const cands = JSON.parse(step.candidates || '[]');
          if (cands.length) firstCandidate = `${cands[0].strategy}=${String(cands[0].value).slice(0, 40)}`;
        } catch {}
        return (
          <div key={i} className="card" style={{ marginBottom: 10, padding: 14 }}>
            <div className="row">
              <span className="muted" style={{ width: 24 }}>{i + 1}</span>
              <select value={step.action} onChange={(e) => updateStep(i, { action: e.target.value })} style={{ width: 150 }}>
                {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>

              <select
                value={binding ? `bind:${binding.dataSetKey}` : 'static'}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'static') updateStep(i, { dataBinding: null });
                  else updateStep(i, { dataBinding: JSON.stringify({ dataSetKey: v.slice(5) }) });
                }}
                style={{ width: 190 }}>
                <option value="static">{step.action === 'upload' ? 'Dosya seçilmedi' : 'Sabit değer'}</option>
                {keysFor(step.action).map((k) => <option key={k} value={`bind:${k}`}>📎 {k}</option>)}
              </select>

              {binding ? (
                <span className="badge queued" style={{ flex: 1 }}>
                  Test verisinden: {binding.dataSetKey}
                </span>
              ) : (
                <input placeholder="Değer" value={step.value ?? ''}
                       onChange={(e) => updateStep(i, { value: e.target.value })}
                       type={step.sensitive ? 'password' : 'text'} style={{ flex: 1 }} />
              )}

              <label className="row muted" style={{ fontSize: 12, gap: 4 }}>
                <input type="checkbox" checked={step.sensitive}
                       onChange={(e) => updateStep(i, { sensitive: e.target.checked })}
                       style={{ width: 'auto' }} />
                gizli
              </label>

              <button className="ghost" onClick={() => moveStep(i, -1)}>↑</button>
              <button className="ghost" onClick={() => moveStep(i, 1)}>↓</button>
              <button className="danger" onClick={() => removeStep(i)}>✕</button>
            </div>
            {firstCandidate && (
              <div className="muted" style={{ fontSize: 11, marginTop: 6, marginLeft: 34 }}>
                locator: {firstCandidate}
              </div>
            )}
          </div>
        );
      })}

      <button className="ghost" onClick={addStep}>+ Adım Ekle</button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
