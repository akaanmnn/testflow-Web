import { useEffect, useState } from 'react';
import { api, getUser } from '../lib/api';

export default function Project() {
  const user = getUser();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const projects = await api('/projects');
    const current = projects.find((p) => p.id === user.workspaceId);
    setProject(current);
    if (current) setMembers(await api(`/projects/${current.id}/members`));
  };

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  const addMember = async () => {
    setError('');
    try {
      await api(`/projects/${project.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ username: newUsername }),
      });
      setNewUsername('');
      await load();
    } catch (e) { setError(e.message); }
  };

  const removeMember = async (username) => {
    if (!window.confirm(`${username} projeden çıkarılsın mı?`)) return;
    setError('');
    try {
      await api(`/projects/${project.id}/members/${encodeURIComponent(username)}`, { method: 'DELETE' });
      await load();
    } catch (e) { setError(e.message); }
  };

  if (!project) return <div className="muted">Yükleniyor…</div>;

  const isOwner = project.ownerUsername === user.username;

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="page-title">{project.personal ? '👤 ' : '📁 '}{project.name}</h1>

      {project.personal ? (
        <div className="card">
          <p>Burası sizin <b>Kişisel Alanınız</b> — yalnızca siz görürsünüz, üye eklenemez.</p>
          <p className="muted" style={{ marginTop: 8 }}>
            Ekiple çalışmak için sol üstteki listeden <b>＋ Yeni proje</b> oluşturun ve
            arkadaşlarınızı üye ekleyin. Senaryolarınızı ve test verilerinizi
            "Kopyala" ile projeye taşıyabilirsiniz.
          </p>
        </div>
      ) : (
        <>
          <div className="row" style={{ marginBottom: 16 }}>
            <input placeholder="AD kullanıcı adı (örn. fatma.kaya)" value={newUsername}
                   onChange={(e) => setNewUsername(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && addMember()}
                   style={{ width: 280 }} />
            <button onClick={addMember} disabled={!newUsername.trim()}>Üye Ekle</button>
          </div>

          <table>
            <thead><tr><th>Kullanıcı</th><th>Ekleyen</th><th>Tarih</th><th></th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.username}>
                  <td>{m.username} {m.owner && <span className="badge queued">sahip</span>}</td>
                  <td className="muted">{m.addedBy}</td>
                  <td className="muted">{new Date(m.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td style={{ textAlign: 'right' }}>
                    {!m.owner && (isOwner || m.username === user.username) && (
                      <button className="danger" onClick={() => removeMember(m.username)}>
                        {m.username === user.username ? 'Ayrıl' : 'Çıkar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
