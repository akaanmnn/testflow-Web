import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const ACTIONS = ['goto', 'click', 'fill', 'select', 'assert-text', 'assert-visible', 'wait'];

export default function ScenarioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState(null);
  const [dataSets, setDataSets] = useState([]);
  const [steps, setSteps] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([api(`/scenarios/${id}`), api('/test-data-sets')])
      .then(([s, ds]) => {
        setScenario(s);
        setSteps(s.steps || []);
        setDataSets(ds);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // Data setlerdeki tüm key'ler (binding dropdown'ı için)
  const allKeys = [...new Set(dataSets.flatMap((ds) => {
    try { return JSON.parse(ds.entries).map((e) => e.key); } catch { return []; }
  }))];

  const updateStep = (i, patch) => {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const addStep = () => {
    setSteps((prev) => [...prev, {
      orderIndex: prev.length, action: 'click', candidates: '[]',
      value: '', dataBinding: null, sensitive: false, meta: '{}',
    }]);
    setDirty(true);
  };

  const removeStep = (i) => {
    setSteps((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, orderIndex: idx })));
    setDirty(true);
  };

  const moveStep = (i, dir) => {
    setSteps((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((s, idx) => ({ ...s, orderIndex: idx }));
    });
    setDirty(true);
  };

  const save = async () => {
    try {
      const updated = await api(`/scenarios/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ steps }),
      });
      setScenario(updated);
      setSteps(updated.steps || []);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
  };

  const del = async () => {
    if (!confirm('Senaryo silinsin mi?')) return;
    await api(`/scenarios/${id}`, { method: 'DELETE' });
    navigate('/scenarios');
  };

  if (!scenario) return <div className="muted">Yükleniyor…</div>;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{scenario.name}</h1>
        <div className="row">
          <button className="danger" onClick={del}>Sil</button>
          <button onClick={save} disabled={!dirty}>{saved ? 'Kaydedildi ✓' : 'Kaydet'}</button>
        </div>
      </div>
      <div className="muted" style={{ marginBottom: 20 }}>{scenario.startUrl}</div>

      {steps.map((step, i) => {
        const binding = step.dataBinding ? JSON.parse(step.dataBinding) : null;
        return (
          <div key={i} className="card" style={{ marginBottom: 10, padding: 14 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className="muted" style={{ width: 24 }}>{i + 1}</span>
              <select value={step.action} onChange={(e) => updateStep(i, { action: e.target.value })} style={{ width: 150 }}>
                {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>

              {/* Değer: sabit veya test verisine bağlı */}
              <select
                value={binding ? `bind:${binding.dataSetKey}` : 'static'}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'static') updateStep(i, { dataBinding: null });
                  else updateStep(i, { dataBinding: JSON.stringify({ dataSetKey: v.slice(5) }) });
                }}
                style={{ width: 190 }}>
                <option value="static">Sabit değer</option>
                {allKeys.map((k) => <option key={k} value={`bind:${k}`}>📎 {k}</option>)}
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
          </div>
        );
      })}

      <button className="ghost" onClick={addStep}>+ Adım Ekle</button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
