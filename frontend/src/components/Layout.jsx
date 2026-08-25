import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { getUser, clearAuth } from '../lib/api';

const navStyle = ({ isActive }) => ({
  display: 'block', padding: '10px 16px', borderRadius: 8,
  color: isActive ? '#fff' : 'var(--muted)',
  background: isActive ? 'var(--surface2)' : 'transparent',
  textDecoration: 'none', marginBottom: 4,
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
        width: 230, background: 'var(--surface)', borderRight: '1px solid var(--border)',
        padding: 20, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>TestFlow</div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 24 }}>
          {user?.workspaceName}
        </div>
        <nav style={{ flex: 1 }}>
          <NavLink to="/scenarios" style={navStyle}>Senaryolar</NavLink>
          <NavLink to="/test-data" style={navStyle}>Test Verileri</NavLink>
          <NavLink to="/environments" style={navStyle}>Ortamlar</NavLink>
          <NavLink to="/runs" style={navStyle}>Koşumlar</NavLink>
        </nav>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>{user?.displayName}</div>
          <button className="ghost" onClick={logout} style={{ width: '100%' }}>Çıkış</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 28, maxWidth: 1100 }}>
        <Outlet />
      </main>
    </div>
  );
}
