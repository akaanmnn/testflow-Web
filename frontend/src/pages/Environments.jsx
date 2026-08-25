import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Environments() {
  const [envs, setEnvs] = useState([]);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [error, setError] = useState('');

  const load = async () => setEnvs(await api('/environments'));
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  const create = async () => {
    try {
      await api('/environments', { method: 'POST', body: JSON.stringify({ name, baseUrl }) });
      setName(''); setBaseUrl('');
      await load();
    } catch (e) { setError(e.message); }
  };

  const del = async (id) => {
    await api(`/environments/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div>
      <h1 className="page-title">Ortamlar</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        <input placeholder="Ad (örn. Staging)" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 200 }} />
        <input placeholder="Base URL (https://staging.sirket.com)" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={{ width: 340 }} />
        <button onClick={create} disabled={!name || !baseUrl}>Ekle</button>
      </div>
      <table>
        <thead><tr><th>Ad</th><th>Base URL</th><th></th></tr></thead>
        <tbody>
          {envs.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td className="muted">{e.baseUrl}</td>
              <td style={{ textAlign: 'right' }}>
                <button className="danger" onClick={() => del(e.id)}>Sil</button>
              </td>
            </tr>
          ))}
          {envs.length === 0 && (
            <tr><td colSpan={3} className="muted" style={{ textAlign: 'center', padding: 30 }}>Henüz ortam yok.</td></tr>
          )}
        </tbody>
      </table>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
