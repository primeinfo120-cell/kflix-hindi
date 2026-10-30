import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { findEpisodeByNumber, getAdminContent, removeEpisode, saveEpisode } from "../../services/content";

const emptyEpisode = { dramaId: "", episodeNumber: "", description: "", videoUrl: "", thumbnailUrl: "", publicationStatus: "draft" };
const validUrl = (value) => {
  if (value.length > 2048) return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};
const timeValue = (date) => date?.toMillis?.() ?? 0;

export default function EpisodesPage() {
  const { episodeId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(episodeId);
  const creating = window.location.pathname.endsWith("/new");
  const [content, setContent] = useState({ dramas: [], episodes: [] });
  const [form, setForm] = useState(emptyEpisode);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getAdminContent().then((items) => {
      setContent(items);
      if (editing) {
        const item = items.episodes.find((episode) => episode.id === episodeId);
        if (item) setForm({
          dramaId: item.dramaId || "", episodeNumber: String(item.episodeNumber || ""),
          description: item.description || "",
          videoUrl: item.videoUrl || "", thumbnailUrl: item.thumbnailUrl || "",
          publicationStatus: item.publicationStatus || "draft",
        });
        else setError("Episode not found.");
      }
    }).catch((cause) => setError(cause.message)).finally(() => setLoading(false));
  }, [episodeId, editing]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const number = Number(form.episodeNumber);
    if (!form.dramaId || !Number.isInteger(number) || number < 1 || !form.description.trim()) {
      setError("Select a drama and enter a positive whole episode number and description.");
      return;
    }
    if (!validUrl(form.videoUrl) || (form.thumbnailUrl && !validUrl(form.thumbnailUrl))) {
      setError("Video and thumbnail must be valid http or https URLs no longer than 2,048 characters.");
      return;
    }
    setBusy(true);
    try {
      const duplicate = await findEpisodeByNumber(form.dramaId, number, episodeId || "");
      if (duplicate) {
        setError("That drama already has an episode with this number.");
        return;
      }
      const id = await saveEpisode(episodeId, {
        dramaId: form.dramaId, episodeNumber: number, title: "",
        description: form.description.trim(), videoUrl: form.videoUrl.trim(),
        thumbnailUrl: form.thumbnailUrl.trim(), publicationStatus: form.publicationStatus,
      });
      if (!editing) navigate(`/admin/episodes/${id}/edit`, { replace: true });
      else {
        const refreshed = await getAdminContent();
        setContent(refreshed);
        setSuccess("Episode saved successfully.");
      }
    } catch (cause) {
      setError(cause.message || "Could not save episode.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEpisode(episode) {
    if (!window.confirm(`Delete episode ${episode.episodeNumber}: ${episode.title}? This cannot be undone.`)) return;
    setError("");
    try {
      await removeEpisode(episode.id);
      setContent((current) => ({ ...current, episodes: current.episodes.filter((item) => item.id !== episode.id) }));
      setSuccess("Episode deleted.");
    } catch (cause) {
      setError(cause.message || "Could not delete episode.");
    }
  }

  const formMode = creating || editing;
  const dramaMap = new Map(content.dramas.map((drama) => [drama.id, drama]));
  const grouped = content.episodes
    .filter((episode) => {
      const dramaTitle = dramaMap.get(episode.dramaId)?.title || "";
      const matches = `${dramaTitle} ${episode.episodeNumber}`.toLowerCase().includes(search.toLowerCase());
      return matches && (filter === "all" || episode.publicationStatus === filter);
    })
    .sort((a, b) => (dramaMap.get(a.dramaId)?.title || "").localeCompare(dramaMap.get(b.dramaId)?.title || "") || Number(a.episodeNumber) - Number(b.episodeNumber));
  const sortedEpisodes = [...content.episodes].sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt));

  if (loading && formMode) return <div className="admin-loading">Loading episode…</div>;
  if (formMode) return (
    <div className="admin-page">
      <header className="admin-page-header"><div><span className="eyebrow">CONTENT LIBRARY</span><h1>{editing ? "Edit episode" : "Add episode"}</h1><p>Link an authorized external video or embed URL.</p></div><Link className="button button-outline" to="/admin/episodes">← All episodes</Link></header>
      {error ? <div className="notice error-state" role="alert">{error}</div> : null}
      {success ? <div className="notice success-state" role="status">{success}</div> : null}
      {content.dramas.length === 0 ? <div className="notice">Create a drama before adding an episode.</div> : (
        <form className="admin-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="form-span">Drama *<select required value={form.dramaId} onChange={(event) => setForm({ ...form, dramaId: event.target.value })}><option value="">Select a drama</option>{content.dramas.map((drama) => <option key={drama.id} value={drama.id}>{drama.title}</option>)}</select></label>
            <label>Episode number *<input type="number" min="1" step="1" required value={form.episodeNumber} onChange={(event) => setForm({ ...form, episodeNumber: event.target.value })} /></label>
            <label className="form-span">Authorized video / embed URL *<input required type="url" maxLength="2048" placeholder="https://…" value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} /><small>Use an authorized HTTP(S) URL. YouTube and Vimeo links can be embedded when provider settings allow; other URLs will be shown as external sources.</small></label>
            <label className="form-span">Thumbnail URL<input type="url" maxLength="2048" placeholder="https://…" value={form.thumbnailUrl} onChange={(event) => setForm({ ...form, thumbnailUrl: event.target.value })} /></label>
            <label>Publication status *<select value={form.publicationStatus} onChange={(event) => setForm({ ...form, publicationStatus: event.target.value })}><option value="draft">Draft</option><option value="published">Published</option></select></label>
            <label className="form-span">Episode description<textarea rows="4" maxLength="3000" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          </div>
          <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create episode"}</button><Link className="button button-outline" to="/admin/episodes">Cancel</Link></div>
        </form>
      )}
    </div>
  );

  return (
    <div className="admin-page">
      <header className="admin-page-header"><div><span className="eyebrow">CONTENT LIBRARY</span><h1>Episodes</h1><p>Organized by drama. Drafts stay private until published.</p></div><Link className="button button-primary" to="/admin/episodes/new">＋ Add episode</Link></header>
      {error ? <div className="notice error-state" role="alert">{error}</div> : null}
      {success ? <div className="notice success-state" role="status">{success}</div> : null}
      <div className="list-toolbar"><input aria-label="Search episodes" placeholder="Search episode or drama…" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Filter publication status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option></select></div>
      {loading ? <div className="admin-loading">Loading episodes…</div> : null}
      {!loading && grouped.length === 0 ? <div className="admin-panel admin-empty">No episodes match this filter.</div> : null}
      <div className="episode-groups">
        {[...new Set(grouped.map((episode) => episode.dramaId))].map((id) => {
          const drama = dramaMap.get(id);
          return <section className="admin-panel episode-group" key={id}>
            <div className="panel-heading"><div><h2>{drama?.title || "Drama removed"}</h2><p>{grouped.filter((episode) => episode.dramaId === id).length} episodes</p></div></div>
            {grouped.filter((episode) => episode.dramaId === id).map((episode) => (
              <div className="episode-admin-row" key={episode.id}>
                <div className="episode-admin-thumb">EP {episode.episodeNumber}</div>
                <span className={`status-pill ${episode.publicationStatus}`}>{episode.publicationStatus}</span>
                <div className="managed-actions"><Link className="button button-outline" to={`/admin/episodes/${episode.id}/edit`}>Edit</Link><button className="button button-danger" onClick={() => deleteEpisode(episode)}>Delete</button></div>
              </div>
            ))}
          </section>;
        })}
      </div>
      {sortedEpisodes.length > 0 ? <span className="visually-hidden">{sortedEpisodes.length} total episodes</span> : null}
    </div>
  );
}
