import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { findDramaBySlug, getAdminContent, removeDrama, saveDrama } from "../../services/content";

const emptyDrama = {
  title: "",
  slug: "",
  posterUrl: "",
  backdropUrl: "",
  description: "",
  releaseYear: "",
  genre: "",
  language: "Hindi Dubbed",
  status: "ongoing",
  publicationStatus: "draft",
};
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const validUrl = (value) => {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};

export default function DramasPage() {
  const { dramaId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(dramaId);
  const creating = window.location.pathname.endsWith("/new");
  const [dramas, setDramas] = useState([]);
  const [form, setForm] = useState(emptyDrama);
  const [search, setSearch] = useState("");
  const [publicationFilter, setPublicationFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getAdminContent().then(({ dramas: items }) => {
      setDramas(items);
      if (editing) {
        const item = items.find((drama) => drama.id === dramaId);
        if (item) setForm({
          title: item.title || "", slug: item.slug || "", posterUrl: item.posterUrl || "",
          backdropUrl: item.backdropUrl || "", description: item.description || "",
          releaseYear: String(item.releaseYear || ""), genre: item.genre || "",
          language: item.language || "", status: item.status || "ongoing",
          publicationStatus: item.publicationStatus || "draft",
        });
        else setError("Drama not found.");
      }
    }).catch((cause) => setError(cause.message)).finally(() => setLoading(false));
  }, [dramaId, editing]);

  function change(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && (!current.slug || current.slug === slugify(current.title))) next.slug = slugify(value);
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const slug = slugify(form.slug);
    if (!form.title.trim() || !slug || !form.posterUrl.trim() || !form.genre.trim() || !form.language.trim()) {
      setError("Title, slug, poster URL, genre, and language are required.");
      return;
    }
    if (!validUrl(form.posterUrl) || !validUrl(form.backdropUrl)) {
      setError("Poster and backdrop must be valid http or https URLs.");
      return;
    }
    const year = Number(form.releaseYear);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 2) {
      setError("Enter a valid release year.");
      return;
    }
    setBusy(true);
    try {
      const duplicate = await findDramaBySlug(slug, dramaId || "");
      if (duplicate) {
        setError("That slug is already in use. Choose a unique slug.");
        return;
      }
      const data = {
        title: form.title.trim(), slug, posterUrl: form.posterUrl.trim(),
        backdropUrl: form.backdropUrl.trim(), description: form.description.trim(),
        releaseYear: year, genre: form.genre.trim(), language: form.language.trim(),
        status: form.status, publicationStatus: form.publicationStatus,
      };
      const id = await saveDrama(dramaId, data);
      if (!editing) navigate(`/admin/dramas/${id}/edit`, { replace: true });
      else setSuccess("Drama saved successfully.");
    } catch (cause) {
      setError(cause.message || "Could not save drama.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDrama(drama) {
    if (!window.confirm(`Delete "${drama.title}" and all its episodes? This cannot be undone.`)) return;
    setError("");
    try {
      await removeDrama(drama.id);
      setDramas((items) => items.filter((item) => item.id !== drama.id));
      setSuccess(`Deleted ${drama.title} and its episodes.`);
    } catch (cause) {
      setError(cause.message || "Could not delete drama.");
    }
  }

  const filtered = dramas.filter((drama) => {
    const matches = `${drama.title} ${drama.slug} ${drama.genre}`.toLowerCase().includes(search.toLowerCase());
    return matches && (publicationFilter === "all" || drama.publicationStatus === publicationFilter);
  });
  const formMode = creating || editing;

  if (loading && formMode) return <div className="admin-loading">Loading drama…</div>;
  if (formMode) return (
    <div className="admin-page">
      <header className="admin-page-header"><div><span className="eyebrow">CONTENT LIBRARY</span><h1>{editing ? "Edit drama" : "Add drama"}</h1><p>Enter the details shown on the public website.</p></div><Link className="button button-outline" to="/admin/dramas">← All dramas</Link></header>
      {error ? <div className="notice error-state" role="alert">{error}</div> : null}
      {success ? <div className="notice success-state" role="status">{success}</div> : null}
      <form className="admin-form" onSubmit={submit}>
        <div className="form-grid">
          <label>Drama title *<input required maxLength="160" value={form.title} onChange={(event) => change("title", event.target.value)} /></label>
          <label>Stable slug *<input required maxLength="120" pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(event) => change("slug", event.target.value)} /><small>Used in the public drama URL.</small></label>
          <label>Poster image URL *<input required type="url" placeholder="https://…" value={form.posterUrl} onChange={(event) => change("posterUrl", event.target.value)} /></label>
          <label>Backdrop image URL<input type="url" placeholder="https://…" value={form.backdropUrl} onChange={(event) => change("backdropUrl", event.target.value)} /></label>
          <label>Release year *<input type="number" min="1900" max={new Date().getFullYear() + 2} required value={form.releaseYear} onChange={(event) => change("releaseYear", event.target.value)} /></label>
          <label>Genre / category *<input required maxLength="80" placeholder="Romance, Thriller…" value={form.genre} onChange={(event) => change("genre", event.target.value)} /></label>
          <label>Language / audio availability *<input required maxLength="100" placeholder="Hindi Dubbed" value={form.language} onChange={(event) => change("language", event.target.value)} /></label>
          <label>Drama status *<select value={form.status} onChange={(event) => change("status", event.target.value)}><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select></label>
          <label>Publication status *<select value={form.publicationStatus} onChange={(event) => change("publicationStatus", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
          <label className="form-span">Description<textarea rows="5" maxLength="5000" value={form.description} onChange={(event) => change("description", event.target.value)} /></label>
        </div>
        {form.posterUrl && validUrl(form.posterUrl) ? <div className="image-preview"><span>Poster preview</span><img src={form.posterUrl} alt="Drama poster preview" onError={(event) => { event.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='270'%3E%3Crect width='100%25' height='100%25' fill='%233D0000'/%3E%3Ctext x='50%25' y='50%25' fill='white' text-anchor='middle'%3EImage unavailable%3C/text%3E%3C/svg%3E"; }} /></div> : null}
        <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create drama"}</button><Link className="button button-outline" to="/admin/dramas">Cancel</Link></div>
      </form>
    </div>
  );

  return (
    <div className="admin-page">
      <header className="admin-page-header"><div><span className="eyebrow">CONTENT LIBRARY</span><h1>Dramas</h1><p>Search and manage your titles.</p></div><Link className="button button-primary" to="/admin/dramas/new">＋ Add drama</Link></header>
      {error ? <div className="notice error-state" role="alert">{error}</div> : null}
      {success ? <div className="notice success-state" role="status">{success}</div> : null}
      <div className="list-toolbar"><input aria-label="Search dramas" placeholder="Search by title, slug, genre…" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Filter publication status" value={publicationFilter} onChange={(event) => setPublicationFilter(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option></select></div>
      {loading ? <div className="admin-loading">Loading dramas…</div> : null}
      {!loading && filtered.length === 0 ? <div className="admin-panel admin-empty">No dramas match this filter.</div> : null}
      <div className="managed-list">{filtered.map((drama) => (
        <article className="managed-card" key={drama.id}>
          <img src={drama.posterUrl} alt="" onError={(event) => { event.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='150'%3E%3Crect width='100%25' height='100%25' fill='%233D0000'/%3E%3C/svg%3E"; }} />
          <div className="managed-info"><h2>{drama.title}</h2><p>{drama.releaseYear} · {drama.genre} · {drama.language}</p><small>/{drama.slug}</small></div>
          <span className={`status-pill ${drama.publicationStatus}`}>{drama.publicationStatus}</span>
          <div className="managed-actions"><Link className="button button-outline" to={`/admin/dramas/${drama.id}/edit`}>Edit</Link><button className="button button-danger" onClick={() => deleteDrama(drama)}>Delete</button></div>
        </article>
      ))}</div>
    </div>
  );
}
