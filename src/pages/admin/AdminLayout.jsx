import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useAuth } from "../../auth/useAuth";
import "../../styles/admin.css";

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate("/admin/login", { replace: true });
    } catch (error) {
      window.alert(`Could not sign out: ${error.message}`);
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin">KFLIX <span>STUDIO</span></a>
        <div className="admin-caption">CONTENT MANAGEMENT</div>
        <nav className="admin-nav">
          <NavLink to="/admin" end>▦ <span>Dashboard</span></NavLink>
          <NavLink to="/admin/dramas">▣ <span>Dramas</span></NavLink>
          <NavLink to="/admin/episodes">▶ <span>Episodes</span></NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-user"><span className="user-dot" />{user?.email || "Admin"}</div>
          <button className="button button-outline logout-button" onClick={handleLogout}>Log out</button>
          <a className="back-public" href="/">← View public site</a>
        </div>
      </aside>
      <main className="admin-main"><Outlet /></main>
    </div>
  );
}
