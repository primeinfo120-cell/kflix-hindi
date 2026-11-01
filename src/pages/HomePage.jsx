import { useAuth } from "../auth/useAuth";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auth, firebaseReady } from "../firebase";
import { signOut } from "firebase/auth";
import { watchPublishedDramas, watchPublishedEpisodes } from "../services/content";

const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%233D0000'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-family='Arial' font-size='24' text-anchor='middle'%3EKFLIX HINDI%3C/text%3E%3C/svg%3E";
const sortNewest = (left, right) => (right.createdAt?.toMillis?.() ?? 0) - 
(left.createdAt?.toMillis?.() ?? 0);


function DramaSkeletons() {
  return (
    <div className="drama-grid" aria-label="Loading dramas">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="drama-card skeleton-card" key={index}>
          <div className="poster skeleton-poster" />
          <div className="drama-info">
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DramaCards({ dramas, episodeCounts }) {
  return (
    <div className="drama-grid">
      {dramas.map((drama) => (
        <Link className="drama-card" key={drama.id} to={`/drama/${encodeURIComponent(drama.slug)}`}>
          <div className="poster">
           <img
  src={drama.posterUrl || fallbackImage}
  alt={drama.title}
  width="400"
  height="600"
  loading="lazy"
  decoding="async"
  onError={(event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = fallbackImage;
  }}
/>
            <span className="poster-label">K-DRAMA</span>
            <div className="poster-overlay"><span className="play-icon">▶</span><span>View Drama</span></div>
          </div>
          <div className="drama-info">
            <h3>{drama.title}</h3>
            
<p>
  {drama.releaseYear || "—"} <span>•</span>{" "}
  {(drama.genre || "Drama").split(",").map((genre) => genre.trim()).filter(Boolean).join(" • ")}{" "}
  <span>•</span> {episodeCounts.get(drama.id) || 0} Episodes
</p>

          </div>
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
  const [navSearch, setNavSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [dramas, setDramas] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(firebaseReady);
  const [error, setError] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);

  
  useEffect(() => {
    if (!firebaseReady) return undefined;

    const loadStartTime = performance.now();
    let dramasLoaded = false;
    let episodesLoaded = false;

    const markLoaded = () => {
      if (dramasLoaded && episodesLoaded) setLoading(false);
    };

    const onError = (cause) => {
      setError(cause.message || "Could not load published content.");
      setLoading(false);
    };

    const stopDramas = watchPublishedDramas((items) => {
      if (!dramasLoaded) {
        console.log(
          `[Kflix Speed] Dramas loaded in ${Math.round(performance.now() - loadStartTime)} ms`
        );
      }
      console.log("[Kflix Speed] Drama count:", items.length);
      setDramas(items);
      dramasLoaded = true;
      markLoaded();
    }, onError);

    const stopEpisodes = watchPublishedEpisodes((items) => {
      if (!episodesLoaded) {
        console.log(
          `[Kflix Speed] Episodes loaded in ${Math.round(performance.now() - loadStartTime)} ms`
        );
      }
    console.log("[Kflix Speed] Episode count:", items.length);
      setEpisodes(items);
      episodesLoaded = true;
      markLoaded();
    }, onError);

    return () => {
      stopDramas();
      stopEpisodes();
    };
  }, []);
  
  const latestDramas = useMemo(() => [...dramas].sort(sortNewest), [dramas]);
  const dramaMap = useMemo(() => new Map(dramas.map((drama) => [drama.id, drama])), [dramas]);
  const episodeCounts = useMemo(() => {
    const counts = new Map();
    episodes.forEach((episode) => {
      if (dramaMap.has(episode.dramaId)) counts.set(episode.dramaId, (counts.get(episode.dramaId) || 0) + 1);
    });
    return counts;
  }, [episodes, dramaMap]);
  const categories = useMemo(() => ["All", ...new Set(dramas.flatMap((drama) => (drama.genre || "").split(",").map((item) => item.trim()).filter(Boolean)))], [dramas]);
  const filtered = useMemo(() => {
  return dramas.filter((drama) => {
    const queryText = search.trim().toLowerCase();
    const categoryText = (drama.genre || "").toLowerCase();

    const matchesSearch = !queryText ||
      [drama.title, drama.description, drama.genre, drama.language]
        .some((value) => value?.toLowerCase().includes(queryText));

    const matchesCategory =
      category === "All" ||
      categoryText.includes(category.toLowerCase());

    return matchesSearch && matchesCategory;
  });
}, [dramas, search, category]);

const navSearchResults = useMemo(() => {
  const query = navSearch.trim().toLowerCase();

  if (!query) return [];

  return dramas
    .filter((drama) => {
      const title = (drama.title || "").trim().toLowerCase();
      const description = (drama.description || "").toLowerCase();
      const genre = (drama.genre || "").toLowerCase();
      const language = (drama.language || "").toLowerCase();

      return (
        title.includes(query) ||
        description.includes(query) ||
        genre.includes(query) ||
        language.includes(query)
      );
    })
    .sort((a, b) => {
      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();

      if (aTitle.startsWith(query)) return -1;
      if (bTitle.startsWith(query)) return 1;

      return 0;
    })
    .slice(0, 5);
}, [dramas, navSearch]);
  const popularDramas = useMemo(() => {
  return [...dramas]
    .sort((left, right) =>
      (episodeCounts.get(right.id) || 0) -
      (episodeCounts.get(left.id) || 0) ||
      sortNewest(left, right)
    )
    .slice(0, 6);
}, [dramas, episodeCounts]);
  const latestEpisodes = useMemo(() => {
  return episodes
    .filter((episode) => dramaMap.has(episode.dramaId))
    .sort(sortNewest)
    .slice(0, 8);
}, [episodes, dramaMap]);
 
  useEffect(() => {
    if (latestDramas.length <= 1) {
      setActiveSlide(0);
      return;
    }

    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % latestDramas.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [latestDramas.length]);

  const slideDrama = latestDramas[activeSlide] || latestDramas[0];

  const showPreviousSlide = () => {
    setActiveSlide((current) =>
      current <= 0 ? latestDramas.length - 1 : current - 1
    );
  };

  const showNextSlide = () => {
    setActiveSlide((current) =>
      latestDramas.length ? (current + 1) % latestDramas.length : 0
    );
  };


  return (
    <div className="app">
      <header className="navbar">
  <Link className="logo" to="/">KFLIX <span>HINDI</span></Link>

  <nav>
    <a href="#home">Home</a>
    <a href="#latest-dramas">Latest Dramas</a>
    <a href="#popular">Popular</a>
    <a href="#latest">Latest Episodes</a>
    <a href="#dramas">Explore</a>
  </nav>

  <div className="nav-search">
  <input
  type="text"
  placeholder="Search dramas..."
  value={navSearch}
  onChange={(event) => setNavSearch(event.target.value)}
/>

  <button type="button" aria-label="Search">
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  </button>

  {navSearch.trim() && (
    <div className="nav-search-results">
      {navSearchResults.length > 0 ? (
        navSearchResults.map((drama) => (
          <Link
            key={drama.id}
            to={`/drama/${encodeURIComponent(drama.slug)}`}
            className="nav-search-result"
          >
            <img
              src={drama.posterUrl || fallbackImage}
              alt=""
            />
            <span>{drama.title}</span>
          </Link>
        ))
      ) : (
        <p>No dramas found.</p>
      )}
    </div>
  )}
</div>
  <div className="nav-tag">HINDI DUBBED</div>
  <div className="nav-auth">
  {user ? (
    <div className="nav-user-group">
  <span className="nav-user">
    {user.displayName || user.email?.split("@")[0] || "User"}
  </span>

  <button
    type="button"
    className="nav-logout"
    onClick={handleLogout}
  >
    Logout
  </button>
</div>
  ) : (
    <>
      <Link to="/login" className="nav-login">
        Sign In
      </Link>

      <Link to="/signup" className="nav-signup">
        Sign Up
      </Link>
    </>
  )}
</div>
</header>
      <main>
        
        <section
className="hero hero-featured"          
id="home"
          style={
            slideDrama
              ? {
                  backgroundImage: `linear-gradient(90deg, #000 8%, #000e 48%, #0005 100%), linear-gradient(0deg, #000 0%, transparent 55%), url("${slideDrama.backdropUrl || slideDrama.posterUrl || fallbackImage}")`,
                }
              : undefined
          }
        >
          <div className="hero-content">
            <span className="eyebrow">
              {slideDrama ? "FEATURED K-DRAMA" : "YOUR K-DRAMA DESTINATION"}
            </span>

            <h1>
              {slideDrama ? slideDrama.title : <>Stories that<br />steal your <span>heart.</span></>}
            </h1>

            {slideDrama ? (
              <>
                <p className="hero-meta">
                  {slideDrama.releaseYear || "K-Drama"}
                  {" • "}
                  {slideDrama.genre || "Drama"}
                  {" • "}
                  {slideDrama.language || "Hindi"}
                </p>

                <p>
                  {slideDrama.description ||
                    "Discover this Korean drama and its published episodes."}
                </p>

                <Link
  to={`/drama/${encodeURIComponent(slideDrama.slug)}`}
  className="primary-btn"
>
  Watch Now <span>▶</span>
</Link>
              </>
            ) : (
              <>
                <p>
                  Discover Korean dramas, unforgettable romance, thrilling
                  stories and your next favourite series.
                </p>
                <a href="#dramas" className="primary-btn">
                  Explore Dramas <span>↗</span>
                </a>
              </>
            )}
          </div>

          {slideDrama && latestDramas.length > 1 ? (
            <div className="hero-controls" aria-label="Drama slideshow controls">
              <button
                type="button"
                className="hero-arrow"
                onClick={showPreviousSlide}
                aria-label="Previous drama"
              >
                ‹
              </button>

              <div className="hero-dots">
                {latestDramas.map((drama, index) => (
                  <button
                    type="button"
                    key={drama.id}
                    className={index === activeSlide ? "hero-dot active" : "hero-dot"}
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Show ${drama.title}`}
                    aria-current={index === activeSlide ? "true" : undefined}
                  />
                ))}
              </div>

              <button
                type="button"
                className="hero-arrow"
                onClick={showNextSlide}
                aria-label="Next drama"
              >
                ›
              </button>
            </div>
          ) : null}

          {!slideDrama ? (
            <div className="hero-art" aria-hidden="true">
              <div className="hero-circle"></div>
              <div className="hero-kanji">한류</div>
              <div className="hero-stamp">K-DRAMA<br />COLLECTION</div>
            </div>
          ) : null}
        </section>

        {loading ? <p className="content-state page-state" role="status">Loading published dramas and episodes…</p> : null}
        {error ? <p className="content-state error-state page-state" role="alert">{error}</p> : null}
        {!loading && !error && !firebaseReady ? (
          <p className="content-state page-state">Firebase is not configured yet. Add the web app settings to <code>.env.local</code> to load published dramas.</p>
        ) : null}

        {!loading && !error && firebaseReady && dramas.length === 0 ? (
          <p className="content-state page-state">No dramas have been published yet. Check back soon.</p>
        ) : null}

        <section className="catalog" id="latest-dramas">
          <div className="section-heading"><div><span className="eyebrow">JUST ADDED</span><h2>Latest <span>Dramas</span></h2></div></div>
          {!loading && !error && latestDramas.length === 0 ? <p className="content-state">Published dramas will appear here.</p> : null}
          <DramaCards dramas={latestDramas.slice(0, 6)} episodeCounts={episodeCounts} />
        </section>

        <section className="catalog popular-section" id="popular">
          <div className="section-heading"><div><span className="eyebrow">FAN FAVOURITES</span><h2>Popular <span>Dramas</span></h2><p className="section-note">Sorted by the number of published episodes available.</p></div></div>
          {!loading && !error && popularDramas.length === 0 ? <p className="content-state">Published dramas will appear here.</p> : null}
          <DramaCards dramas={popularDramas} episodeCounts={episodeCounts} />
        </section>

        <section className="latest" id="latest">
          <div className="section-heading"><div><span className="eyebrow">FRESH FROM THE SCREEN</span><h2>Latest <span>Episodes</span></h2></div></div>
          {loading ? <p className="content-state">Loading latest episodes…</p> : null}
          {error ? <p className="content-state error-state">{error}</p> : null}
          {!loading && !error && latestEpisodes.length === 0 ? (
            <div className="latest-panel"><div className="latest-mark">▶</div><div><h3>No published episodes yet</h3><p>New episodes will appear here when they are published.</p></div></div>
          ) : null}
          {latestEpisodes.length > 0 ? (
            <div className="latest-grid">
              {latestEpisodes.map((episode) => {
                const drama = dramaMap.get(episode.dramaId);
                return (
                  <Link
  className="latest-card"
  to={`/drama/${encodeURIComponent(drama.slug)}`}
  key={episode.id}
>
                    <img
  src={episode.thumbnailUrl || drama.posterUrl || fallbackImage}
  alt=""
  width="640"
  height="360"
  loading="lazy"
  decoding="async"
  onError={(event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = fallbackImage;
  }}
/>
                    <span className="latest-play">▶</span>
                    <div><small>{drama.title}</small><h3>Episode {episode.episodeNumber}: {episode.title}</h3><span className="watch-link">Watch Now ↗</span></div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="catalog explore-section" id="dramas">
          <div className="section-heading">
            <div><span className="eyebrow">FIND YOUR NEXT OBSESSION</span><h2>Explore <span>Dramas</span></h2></div>
            <label className="search-wrap"><span aria-hidden="true">⌕</span><input aria-label="Search dramas" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dramas..." /></label>
          </div>
          <div className="categories" aria-label="Filter by genre">
            {categories.map((item) => (
              <button type="button" key={item} className={category === item ? "category active" : "category"} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
          {filtered.length > 0 ? <DramaCards dramas={filtered} episodeCounts={episodeCounts} /> : null}
          {!loading && !error && dramas.length > 0 && filtered.length === 0 ? <p className="content-state">No dramas found. Try another search or genre.</p> : null}
        </section>
      </main>
      <footer><Link className="logo" to="/">KFLIX <span>HINDI</span></Link><p>Made for K-drama fans. © {new Date().getFullYear()} Kflix Hindi.</p></footer>
    </div>
  );
}
