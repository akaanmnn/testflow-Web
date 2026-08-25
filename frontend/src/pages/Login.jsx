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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ width: 380 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>TestFlow</h1>
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
