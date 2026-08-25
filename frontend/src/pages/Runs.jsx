import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Runs() {
  const [runs, setRuns] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    Promise.all([api('/runs'), api('/scenarios')])
      .then(([r, s]) => { setRuns(r); setScenarios(s); })
      .catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const scenarioName = (id) => scenarios.find((s) => s.id === id)?.name ?? id;

  const deleteRun = async (e, id) => {
    e.stopPropagation(); // satır tıklamasını (detay açma) tetikleme
    if (!window.confirm('Bu koşum kaydı silinsin mi?')) return;
    try {
      await api(`/runs/${id}`, { method: 'DELETE' });
      if (detail?.id === id) setDetail(null);
      await load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1 className="page-title">Koşum Geçmişi</h1>
      <table>
        <thead>
          <tr><th>Senaryo</th><th>Durum</th><th>Başlatan</th><th>Başlangıç</th><th>Süre</th><th></th></tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const durationSec = r.startedAt && r.finishedAt
              ? Math.round((new Date(r.finishedAt) - new Date(r.startedAt)) / 1000) : null;
            return (
              <tr key={r.id} onClick={() => setDetail(r)} style={{ cursor: 'pointer' }}>
                <td style={{ color: 'var(--accent)' }}>{scenarioName(r.scenarioId)}</td>
                <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                <td>{r.triggeredBy}</td>
                <td className="muted">{r.startedAt ? new Date(r.startedAt).toLocaleString('tr-TR') : '—'}</td>
                <td className="muted">{durationSec != null ? `${durationSec}sn` : '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="danger" onClick={(e) => deleteRun(e, r.id)}>Sil</button>
                </td>
              </tr>
            );
          })}
          {runs.length === 0 && (
            <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 30 }}>Henüz koşum yok.</td></tr>
          )}
        </tbody>
      </table>

      {detail && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <strong>{scenarioName(detail.scenarioId)} — adım sonuçları</strong>
            <button className="ghost" onClick={() => setDetail(null)}>Kapat</button>
          </div>
          <table>
            <thead><tr><th>#</th><th>Durum</th><th>Healed</th><th>Hata</th></tr></thead>
            <tbody>
              {detail.stepResults.map((s) => (
                <tr key={s.id}>
                  <td>{s.orderIndex + 1}</td>
                  <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                  <td>{s.healed ? `✓ (${s.healedStrategy ?? '-'})` : '—'}</td>
                  <td className="muted">{s.errorMessage ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
