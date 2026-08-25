import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Scenarios() {
  const [scenarios, setScenarios] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [startUrl, setStartUrl] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [s, f] = await Promise.all([api('/scenarios'), api('/folders')]);
    setScenarios(s);
    setFolders(f);
  };

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  const createScenario = async () => {
    try {
      await api('/scenarios', {
        method: 'POST',
        body: JSON.stringify({ name, startUrl, folderId: selectedFolder || null, steps: [] }),
      });
      setName(''); setStartUrl(''); setShowNew(false);
      await load();
    } catch (e) { setError(e.message); }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api('/folders', { method: 'POST', body: JSON.stringify({ name: newFolderName }) });
      setNewFolderName('');
      await load();
    } catch (e) { setError(e.message); }
  };

  const visible = selectedFolder
    ? scenarios.filter((s) => s.folderId === selectedFolder)
    : scenarios;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Senaryolar</h1>
        <button onClick={() => setShowNew(!showNew)}>+ Yeni Senaryo</button>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <select value={selectedFolder} onChange={(e) => setSelectedFolder(e.target.value)} style={{ width: 220 }}>
          <option value="">Tüm klasörler</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <input placeholder="Yeni klasör adı" value={newFolderName}
               onChange={(e) => setNewFolderName(e.target.value)} style={{ width: 200 }} />
        <button className="ghost" onClick={createFolder}>Klasör Ekle</button>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <input placeholder="Senaryo adı" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Başlangıç URL (https://...)" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} />
          </div>
          <button onClick={createScenario} disabled={!name || !startUrl}>Oluştur</button>
        </div>
      )}

      <table>
        <thead>
          <tr><th>Ad</th><th>Başlangıç URL</th><th>Adım</th><th>Güncelleme</th></tr>
        </thead>
        <tbody>
          {visible.map((s) => (
            <tr key={s.id}>
              <td><Link to={`/scenarios/${s.id}`} style={{ color: 'var(--accent)' }}>{s.name}</Link></td>
              <td className="muted">{s.startUrl}</td>
              <td>{s.stepCount}</td>
              <td className="muted">{new Date(s.updatedAt).toLocaleString('tr-TR')}</td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 30 }}>
              Henüz senaryo yok.
            </td></tr>
          )}
        </tbody>
      </table>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
