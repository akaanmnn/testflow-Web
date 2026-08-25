import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuth } from '../lib/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Giriş başarısız.');
      }
      const data = await res.json();
      setAuth(data.accessToken, data.user);
      navigate('/scenarios');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
      background: 'radial-gradient(900px 500px at 20% 0%, var(--accent-soft), transparent), var(--bg)',
    }}>
      <div className="card" style={{ width: 390, padding: 28 }}>
        <div className="row" style={{ gap: 9, marginBottom: 6 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--accent), #7b7ee8)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13,
          }}>▶</span>
          <h1 style={{ fontSize: 22, margin: 0 }}>TestFlow</h1>
        </div>
        <p className="muted" style={{ marginBottom: 24 }}>Şirket hesabınızla giriş yapın</p>
        <div style={{ marginBottom: 12 }}>
          <label className="muted" style={{ fontSize: 12 }}>Kullanıcı adı (AD)</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)}
                 placeholder="ad.soyad" autoFocus
                 onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="muted" style={{ fontSize: 12 }}>Şifre</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        <button onClick={submit} disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
