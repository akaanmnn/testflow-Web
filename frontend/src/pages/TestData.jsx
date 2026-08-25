import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function TestData() {
  const [sets, setSets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  const load = async () => setSets(await api('/test-data-sets'));
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  const open = (set) => {
    setSelected(set);
    setName(set.name);
    try { setEntries(JSON.parse(set.entries)); } catch { setEntries([]); }
  };

  const openNew = () => {
    setSelected({ id: null });
    setName('');
    setEntries([{ key: '', type: 'text', value: '', sensitive: false }]);
  };

  const updateEntry = (i, patch) =>
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const save = async () => {
    try {
      const body = JSON.stringify({ name, entries: JSON.stringify(entries.filter((e) => e.key)) });
      if (selected.id) await api(`/test-data-sets/${selected.id}`, { method: 'PATCH', body });
      else await api('/test-data-sets', { method: 'POST', body });
      setSelected(null);
      await load();
    } catch (e) { setError(e.message); }
  };

  const del = async (id) => {
    if (!confirm('Silinsin mi?')) return;
    await api(`/test-data-sets/${id}`, { method: 'DELETE' });
    setSelected(null);
    await load();
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Test Verileri</h1>
        <button onClick={openNew}>+ Yeni Veri Seti</button>
      </div>

      {!selected ? (
        <table>
          <thead><tr><th>Ad</th><th>Anahtar sayısı</th><th>Güncelleme</th></tr></thead>
          <tbody>
            {sets.map((s) => {
              let count = 0;
              try { count = JSON.parse(s.entries).length; } catch {}
              return (
                <tr key={s.id} onClick={() => open(s)} style={{ cursor: 'pointer' }}>
                  <td style={{ color: 'var(--accent)' }}>{s.name}</td>
                  <td>{count}</td>
                  <td className="muted">{new Date(s.updatedAt).toLocaleString('tr-TR')}</td>
                </tr>
              );
            })}
            {sets.length === 0 && (
              <tr><td colSpan={3} className="muted" style={{ textAlign: 'center', padding: 30 }}>
                Henüz veri seti yok.
              </td></tr>
            )}
          </tbody>
        </table>
      ) : (
        <div className="card">
          <input placeholder="Veri seti adı" value={name}
                 onChange={(e) => setName(e.target.value)} style={{ marginBottom: 14, width: 300 }} />
          {entries.map((e, i) => (
            <div key={i} className="row" style={{ marginBottom: 8 }}>
              <input placeholder="anahtar (örn. kullanici_email)" value={e.key}
                     onChange={(ev) => updateEntry(i, { key: ev.target.value })} style={{ width: 220 }} />
              <input placeholder="değer" value={e.value}
                     type={e.sensitive ? 'password' : 'text'}
                     onChange={(ev) => updateEntry(i, { value: ev.target.value })} style={{ flex: 1 }} />
              <label className="row muted" style={{ fontSize: 12, gap: 4 }}>
                <input type="checkbox" checked={e.sensitive}
                       onChange={(ev) => updateEntry(i, { sensitive: ev.target.checked })}
                       style={{ width: 'auto' }} />
                gizli
              </label>
              <button className="danger" onClick={() => setEntries((p) => p.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="ghost"
                    onClick={() => setEntries((p) => [...p, { key: '', type: 'text', value: '', sensitive: false }])}>
              + Anahtar Ekle
            </button>
            <div style={{ flex: 1 }} />
            {selected.id && <button className="danger" onClick={() => del(selected.id)}>Sil</button>}
            <button className="ghost" onClick={() => setSelected(null)}>Vazgeç</button>
            <button onClick={save} disabled={!name}>Kaydet</button>
          </div>
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
