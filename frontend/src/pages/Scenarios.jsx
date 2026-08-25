import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [extension, setExtension] = useState(null); // null=bilinmiyor, false=yok, string=versiyon
  const [recording, setRecording] = useState(false);
  const navigate = useNavigate();
  const recordMeta = useRef({});

  const load = async () => {
    const [s, f] = await Promise.all([api('/scenarios'), api('/folders')]);
    setScenarios(s);
    setFolders(f);
  };

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  // Eklenti tespiti + kayıt sonucu dinleyicisi
  useEffect(() => {
    const onMessage = async (event) => {
      if (event.source !== window || !event.data) return;

      if (event.data.type === 'TESTFLOW_PONG') {
        setExtension(event.data.version);
      }

      if (event.data.type === 'TESTFLOW_RECORDING_DONE') {
        setRecording(false);
        const steps = (event.data.steps || []).map((s, i) => ({ ...s, orderIndex: i, dataBinding: null }));
        try {
          const created = await api('/scenarios', {
            method: 'POST',
            body: JSON.stringify({
              name: event.data.scenarioName,
              startUrl: event.data.startUrl,
              folderId: recordMeta.current.folderId || null,
              steps,
            }),
          });
          navigate(`/scenarios/${created.id}`);
        } catch (e) {
          setError(`Kayıt alındı ama senaryo kaydedilemedi: ${e.message}`);
        }
      }
    };
    window.addEventListener('message', onMessage);

    // Eklenti var mı? (bridge.js cevap verir)
    window.postMessage({ type: 'TESTFLOW_PING' }, '*');
    const timeout = setTimeout(() => setExtension((v) => (v === null ? false : v)), 1500);

    return () => { window.removeEventListener('message', onMessage); clearTimeout(timeout); };
  }, [navigate]);

  const startRecording = () => {
    if (!name || !startUrl) return;
    recordMeta.current = { folderId: selectedFolder || null };
    setRecording(true);
    window.postMessage({ type: 'TESTFLOW_START_RECORDING', scenarioName: name, startUrl }, '*');
  };

  const createEmpty = async () => {
    try {
      const created = await api('/scenarios', {
        method: 'POST',
        body: JSON.stringify({ name, startUrl, folderId: selectedFolder || null, steps: [] }),
      });
      setName(''); setStartUrl(''); setShowNew(false);
      navigate(`/scenarios/${created.id}`);
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
        <div className="row">
          {typeof extension === 'string' && (
            <span className="muted" style={{ fontSize: 12 }}>Eklenti v{extension}</span>
          )}
          <button onClick={() => setShowNew(!showNew)}>+ Yeni Senaryo</button>
        </div>
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
          <div className="row" style={{ marginBottom: 12 }}>
            <input placeholder="Senaryo adı" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Başlangıç URL (https://...)" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} />
          </div>

          {recording ? (
            <div className="badge queued" style={{ padding: '8px 14px' }}>
              🔴 Kayıt sürüyor — açılan sekmede işlemlerinizi yapın, bitince "Kaydı Bitir"e basın.
            </div>
          ) : (
            <div className="row">
              <button onClick={startRecording} disabled={!name || !startUrl || !extension}>
                🔴 Kaydı Başlat
              </button>
              <button className="ghost" onClick={createEmpty} disabled={!name || !startUrl}>
                Boş Oluştur (adımları elle gir)
              </button>
              {extension === false && (
                <span className="muted" style={{ fontSize: 12 }}>
                  Kayıt için TestFlow Recorder eklentisi gerekli —
                  Chrome/Edge'de <code>chrome://extensions</code> → Geliştirici modu →
                  "Paketlenmemiş öğe yükle" → repodaki <code>extension/</code> klasörünü seçin, sonra bu sayfayı yenileyin.
                </span>
              )}
            </div>
          )}
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
