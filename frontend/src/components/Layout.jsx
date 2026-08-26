import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { getUser, clearAuth } from '../lib/api';

const navStyle = ({ isActive }) => ({
  display: 'block',
  padding: '9px 14px',
  borderRadius: 9,
  color: isActive ? 'var(--accent)' : 'var(--muted)',
  background: isActive ? 'var(--accent-soft)' : 'transparent',
  fontWeight: isActive ? 600 : 500,
  textDecoration: 'none',
  marginBottom: 2,
  transition: 'background .12s ease',
});

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();

  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 240,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        padding: '22px 16px',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        <div className="row" style={{ gap: 9, marginBottom: 4, padding: '0 6px' }}>
          <span style={{
            width: 26, height: 26, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), #7b7ee8)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12,
          }}>▶</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
            TestFlow
          </span>
        </div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 26, padding: '0 6px' }}>
          {user?.workspaceName}
        </div>
        <nav style={{ flex: 1 }}>
          <NavLink to="/" end style={navStyle}>Genel Bakış</NavLink>
          <NavLink to="/scenarios" style={navStyle}>Senaryolar</NavLink>
          <NavLink to="/test-data" style={navStyle}>Test Verileri</NavLink>
          <NavLink to="/environments" style={navStyle}>Ortamlar</NavLink>
          <NavLink to="/runs" style={navStyle}>Koşumlar</NavLink>
          <NavLink to="/help" style={navStyle}>Yardım</NavLink>
        </nav>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, padding: '14px 6px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{user?.displayName}</div>
          <button className="ghost" onClick={logout} style={{ width: '100%' }}>Çıkış yap</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '30px 34px', maxWidth: 1100 }}>
        <Outlet />
      </main>
    </div>
  );
}
