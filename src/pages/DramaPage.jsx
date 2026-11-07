
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getPublishedDramaBySlug,
  watchPublishedEpisodesForDrama,
} from "../services/content";
import {
  deleteDramaReview,
  saveDramaReview,
  watchDramaReviews,
} from "../services/reviews";
import { useAuth } from "../auth/useAuth";
import { firebaseReady } from "../firebase";
import { setPageMetadata } from "../utils/pageMetadata";

function setDramaStructuredData(drama) {
  const schemaId = "kflix-drama-schema";
  let script = document.getElementById(schemaId);

  if (!script) {
    script = document.createElement("script");
    script.id = schemaId;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: drama.title,
    description: drama.description || "",
    image: drama.posterUrl || undefined,
    genre: drama.genre
      ? String(drama.genre).split(",").map((item) => item.trim())
      : undefined,
    inLanguage: drama.language || "Hindi",
    url: `${window.location.origin}/drama/${encodeURIComponent(drama.slug)}`,
    publisher: {
      "@type": "Organization",
      name: "Kflix Hindi",
      url: "https://kflix-hindi.pages.dev/",
    },
  };

  script.textContent = JSON.stringify(schema);

  return () => {
    script.remove();
  };
}


function formatReviewDate(timestamp) {
  if (!timestamp?.toDate) return "Recently";
  return timestamp.toDate().toLocaleDateString();
}

export default function DramaPage() {
  const { slug } = useParams();
  const { user } = useAuth();

  const [drama, setDrama] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [error, setError] = useState(
    firebaseReady ? "" : "Firebase is not configured.",
  );
  const [loadedSlug, setLoadedSlug] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  const [reviewState, setReviewState] = useState({
    dramaId: "",
    items: [],
    loading: true,
    error: "",
  });
  const [reviewMessage, setReviewMessage] = useState("");
  const [savedReviewForm, setSavedReviewForm] = useState({
    key: "",
    rating: 5,
    comment: "",
  });
  const [reviewBusy, setReviewBusy] = useState(false);

  const reviewStateMatchesDrama = Boolean(drama?.id) && reviewState.dramaId === drama.id;
  const reviews = reviewStateMatchesDrama ? reviewState.items : [];
  const reviewsLoading = !reviewStateMatchesDrama || reviewState.loading;
  const reviewError = reviewStateMatchesDrama ? reviewState.error : "";
  const ownReview = reviews.find((review) => review.uid === user?.uid);
  const reviewFormKey = drama?.id
    ? `${drama.id}:${user?.uid || "guest"}`
    : "";
  const reviewForm = savedReviewForm.key === reviewFormKey
    ? savedReviewForm
    : {
      key: reviewFormKey,
      rating: ownReview?.rating ?? 5,
      comment: ownReview?.comment ?? "",
    };

  function updateReviewError(message) {
    if (!drama?.id) return;
    setReviewState((current) => ({
      dramaId: drama.id,
      items: current.dramaId === drama.id ? current.items : [],
      loading: current.dramaId === drama.id ? current.loading : false,
      error: message,
    }));
  }

  function updateReviewForm(update) {
    setSavedReviewForm({ ...reviewForm, ...update });
  }

  useEffect(() => {
    let stopEpisodes;
    let cancelled = false;

    if (!firebaseReady) return undefined;

    getPublishedDramaBySlug(slug)
      .then((item) => {
        if (cancelled) return;

        setDrama(item);
        setShareMessage("");

        if (!item) {
          setLoadedSlug(slug);
          setError("");
          setEpisodes([]);
          return;
        }

        stopEpisodes = watchPublishedEpisodesForDrama(
          item.id,
          (items) => {
            setEpisodes(
              items.sort(
                (a, b) =>
                  Number(a.episodeNumber) - Number(b.episodeNumber),
              ),
            );
            setLoadedSlug(slug);
            setError("");
          },
          (cause) => {
            setLoadedSlug(slug);
            setError(cause.message || "Could not load episodes.");
          },
        );
      })
      .catch((cause) => {
        if (cancelled) return;
        setLoadedSlug(slug);
        setError(cause.message || "Could not load this drama.");
      });

    return () => {
      cancelled = true;
      stopEpisodes?.();
    };
  }, [slug]);

  
useEffect(() => {
  if (!drama || loadedSlug !== slug) return undefined;

  const description =
    drama.description ||
    `${drama.title} — explore details and published episodes on Kflix Hindi.`;

  const cleanupMetadata = setPageMetadata({
    title: `${drama.title} | Kflix Hindi`,
    description,
    image: drama.posterUrl,
    url: window.location.href,
  });

  const cleanupSchema = setDramaStructuredData(drama);

  return () => {
    cleanupMetadata();
    cleanupSchema();
  };
}, [drama, loadedSlug, slug]);


  useEffect(() => {
    if (!drama?.id || !firebaseReady) return undefined;

    const stopReviews = watchDramaReviews(
      drama.id,
      (items) => {
        setReviewState({
          dramaId: drama.id,
          items,
          loading: false,
          error: "",
        });
      },
      (cause) => {
        setReviewState((current) => ({
          dramaId: drama.id,
          items: current.dramaId === drama.id ? current.items : [],
          loading: false,
          error: cause.message || "Could not load reviews.",
        }));
      },
    );

    return stopReviews;
  }, [drama?.id]);

  async function copyDramaLink() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }

      await navigator.clipboard.writeText(window.location.href);
      setShareMessage("Drama link copied.");
    } catch (cause) {
      setShareMessage(cause.message || "Could not copy the drama link.");
    }
  }

  async function shareDrama() {
    if (!navigator.share) {
      await copyDramaLink();
      return;
    }

    try {
      await navigator.share({
        title: `${drama.title} | Kflix Hindi`,
        url: window.location.href,
      });
      setShareMessage("Drama shared.");
    } catch (cause) {
      if (cause.name !== "AbortError") {
        setShareMessage(
          cause.message || "Could not share this drama.",
        );
      }
    }
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();
    updateReviewError("");
    setReviewMessage("");

    if (!user) {
      updateReviewError("Please sign in to submit a review.");
      return;
    }

    setReviewBusy(true);

    try {
      await saveDramaReview(
        drama.id,
        user,
        reviewForm.rating,
        reviewForm.comment,
      );
      setReviewMessage("Your review has been saved.");
    } catch (cause) {
      updateReviewError(cause.message || "Could not save your review.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleReviewDelete() {
    if (!user || !ownReview) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete your review?",
    );
    if (!confirmed) return;

    updateReviewError("");
    setReviewMessage("");
    setReviewBusy(true);

    try {
      await deleteDramaReview(drama.id, user.uid);
      updateReviewForm({ rating: 5, comment: "" });
      setReviewMessage("Your review has been deleted.");
    } catch (cause) {
      updateReviewError(cause.message || "Could not delete your review.");
    } finally {
      setReviewBusy(false);
    }
  }

  if (firebaseReady && loadedSlug !== slug) {
    return (
      <div className="detail-page">
        <p className="content-state">Loading drama…</p>
      </div>
    );
  }

  if (error || !drama) {
    return (
      <div className="detail-page">
        <p className="content-state error-state">
          {error || "Drama not found or not published."}
        </p>
        <Link className="primary-btn" to="/">
          Back to home
        </Link>
      </div>
    );
  }

  const averageRating = reviews.length
    ? (
        reviews.reduce((sum, review) => sum + Number(review.rating), 0) /
        reviews.length
      ).toFixed(1)
    : null;

  return (
    <div className="detail-page">
      <header className="navbar">
        <Link className="logo" to="/">
          KFLIX <span>HINDI</span>
        </Link>
        <Link className="category" to="/">
          ← Home
        </Link>
      </header>

      <main className="drama-detail">
        {drama.backdropUrl ? (
          <div
            className="detail-backdrop"
            style={{
              backgroundImage: `linear-gradient(90deg,#000 10%,#000a),url("${drama.backdropUrl}")`,
            }}
          />
        ) : null}

        <div className="detail-content">
          <img
            className="detail-poster"
            src={drama.posterUrl}
            alt={`${drama.title} poster`}
            onError={(event) => {
              event.currentTarget.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600'%3E%3Crect width='100%25' height='100%25' fill='%233D0000'/%3E%3C/svg%3E";
            }}
          />

          <div>
            <span className="eyebrow">K-DRAMA</span>
            <h1>{drama.title}</h1>
            <p className="detail-meta">
              {drama.releaseYear} · {drama.genre} · {drama.language} ·{" "}
              {drama.status === "ongoing" ? "Ongoing" : "Completed"}
            </p>
            <p className="detail-description">{drama.description}</p>

            <div className="detail-actions">
              <button
                type="button"
                className="category"
                onClick={shareDrama}
              >
                Share
              </button>
              <button
                type="button"
                className="category"
                onClick={copyDramaLink}
              >
                Copy link
              </button>
            </div>

            {shareMessage ? (
              <p className="share-message" role="status">
                {shareMessage}
              </p>
            ) : null}
          </div>
        </div>

        
<section className="episode-section">
  <h2>Episodes</h2>

  {episodes.length === 0 ? (
    <p className="content-state">
      No episodes have been published yet.
    </p>
  ) : (
    <div className="public-episode-list">
      {episodes.map((episode) => (
        <Link
          to={`/watch/${episode.id}`}
          className="public-episode"
          key={episode.id}
        >
          EP {episode.episodeNumber}
        </Link>
      ))}
    </div>
  )}
</section>


        <section className="episode-section reviews-section">
          <h2>Ratings &amp; Reviews</h2>

          <p className="detail-meta">
            {averageRating
              ? `⭐ ${averageRating} / 5 · ${reviews.length} ${
                  reviews.length === 1 ? "review" : "reviews"
                }`
              : "No ratings yet. Be the first to review this drama!"}
          </p>

          {user ? (
            <form className="review-form" onSubmit={handleReviewSubmit}>
              <h3>{ownReview ? "Edit your review" : "Write a review"}</h3>

              <label htmlFor="review-rating">Your rating</label>
              <div
                className="review-stars"
                role="group"
                aria-label="Choose a rating from 1 to 5 stars"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`review-star ${
                      star <= reviewForm.rating ? "selected" : ""
                    }`}
                    aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                    aria-pressed={reviewForm.rating === star}
                    onClick={() => updateReviewForm({ rating: star })}
                  >
                    ★
                  </button>
                ))}
              </div>

              <label htmlFor="review-comment">Your comment</label>
              <textarea
                id="review-comment"
                value={reviewForm.comment}
                onChange={(event) => updateReviewForm({ comment: event.target.value })}
                placeholder="What did you think of this drama?"
                rows={4}
                maxLength={1000}
                required
              />
              <small>{reviewForm.comment.length}/1000 characters</small>

              {reviewError ? (
                <p className="form-error" role="alert">
                  {reviewError}
                </p>
              ) : null}

              {reviewMessage ? (
                <p className="share-message" role="status">
                  {reviewMessage}
                </p>
              ) : null}

              <button
                className="button button-primary"
                type="submit"
                disabled={reviewBusy}
              >
                {reviewBusy
                  ? "Saving…"
                  : ownReview
                    ? "Update review"
                    : "Submit review"}
              </button>

              {ownReview ? (
                <button
                  className="category"
                  type="button"
                  onClick={handleReviewDelete}
                  disabled={reviewBusy}
                >
                  Delete my review
                </button>
              ) : null}
            </form>
          ) : (
            <p>
              <Link
                to="/login"
                state={{ from: { pathname: `/drama/${slug}` } }}
              >
                Sign in
              </Link>{" "}
              or{" "}
              <Link
                to="/signup"
                state={{ from: { pathname: `/drama/${slug}` } }}
              >
                create an account
              </Link>{" "}
              to rate and review this drama.
            </p>
          )}

          <div className="review-list">
            <h3>What viewers say</h3>

            {reviewsLoading ? (
              <p className="content-state">Loading reviews…</p>
            ) : reviewError && reviews.length === 0 ? (
              <p className="content-state error-state">{reviewError}</p>
            ) : reviews.length === 0 ? (
              <p className="content-state">No reviews yet.</p>
            ) : (
              reviews.map((review) => (
                <article className="review-card" key={review.id}>
                  <div className="review-card-heading">
                    <strong>{review.displayName || "Kflix viewer"}</strong>
                    <span className="review-card-stars">
                      {"★".repeat(Number(review.rating))}
                      {"☆".repeat(5 - Number(review.rating))}
                    </span>
                  </div>
                  <p>{review.comment}</p>
                  <small>{formatReviewDate(review.createdAt)}</small>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
