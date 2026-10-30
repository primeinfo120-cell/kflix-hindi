import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminContent } from "../../services/content";
import { firebaseReady } from "../../firebase";

const timeValue = (date) => date?.toMillis?.() ?? 0;

export default function DashboardPage() {
  const [content, setContent] = useState({ dramas: [], episodes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminContent().then(setContent).catch((cause) => setError(cause.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-loading">Loading dashboard…</div>;
  if (error) return <div className="admin-page"><div className="notice error-state">{!firebaseReady ? "Firebase is not configured. " : ""}{error}</div></div>;
  const published = content.dramas.filter((item) => item.publicationStatus === "published").length;
  const latest = [
    ...content.dramas.map((item) => ({ ...item, kind: "Drama" })),
    ...content.episodes.map((item) => ({ ...item, kind: "Episode" })),
  ].sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt)).slice(0, 6);
  const dramaNames = new Map(content.dramas.map((item) => [item.id, item.title]));

  return (
    <div className="admin-page">
      <header className="admin-page-header"><div><span className="eyebrow">OVERVIEW</span><h1>Dashboard</h1><p>Your Kflix content at a glance.</p></div><Link className="button button-primary" to="/admin/dramas/new">＋ Add drama</Link></header>
      <div className="stat-grid">
        <article className="stat-card"><span>Total dramas</span><strong>{content.dramas.length}</strong><small>All drafts and published</small></article>
        <article className="stat-card"><span>Total episodes</span><strong>{content.episodes.length}</strong><small>Across all dramas</small></article>
        <article className="stat-card"><span>Published dramas</span><strong>{published}</strong><small>Visible on the public site</small></article>
      </div>
      <section className="admin-panel">
        <div className="panel-heading"><div><h2>Recently added</h2><p>Newest dramas and episodes</p></div><Link to="/admin/episodes/new">＋ Add episode</Link></div>
        {latest.length === 0 ? <p className="admin-empty">Nothing here yet. Add your first drama to get started.</p> : (
          <div className="recent-list">{latest.map((item) => (
            <div className="recent-row" key={`${item.kind}-${item.id}`}><span className="recent-kind">{item.kind}</span><strong>{item.kind === "Episode" ? `EP ${item.episodeNumber} · ${item.title}` : item.title}</strong><small>{item.kind === "Episode" ? dramaNames.get(item.dramaId) || "Drama removed" : item.genre}</small><span className={`status-pill ${item.publicationStatus}`}>{item.publicationStatus}</span></div>
          ))}</div>
        )}
      </section>
      <div className="quick-actions"><Link to="/admin/dramas/new">＋ Create a drama</Link><Link to="/admin/episodes/new">＋ Add an episode</Link><Link to="/admin/dramas">Manage dramas →</Link></div>
    </div>
  );
}
