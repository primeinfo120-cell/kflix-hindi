
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getPublishedEpisode,
  getPublishedEpisodesForDrama,
} from "../services/content";
import {
  deleteDramaReview,
  saveDramaReview,
  watchDramaReviews,
} from "../services/reviews";
import { useAuth } from "../auth/useAuth";
import { firebaseReady } from "../firebase";
import {
  getEmbeddableVideoUrl,
  getSafeVideoUrl,
} from "../utils/videoEmbed";
import { setPageMetadata } from "../utils/pageMetadata";

export default function WatchPage() {
  const { episodeId } = useParams();
  const { user } = useAuth();

  const [episode, setEpisode] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [error, setError] = useState("");
  const [loadedEpisodeId, setLoadedEpisodeId] = useState("");

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  const ownReview = reviews.find((review) => review.uid === user?.uid);

  useEffect(() => {
    let cancelled = false;

    getPublishedEpisode(episodeId)
      .then(async (item) => {
        if (!item) {
          if (!cancelled) {
            setEpisode(null);
            setEpisodes([]);
            setError("");
            setLoadedEpisodeId(episodeId);
          }
          return;
        }

        const availableEpisodes = await getPublishedEpisodesForDrama(
          item.dramaId,
        );

        if (!cancelled) {
          setEpisode(item);
          setEpisodes(availableEpisodes);
          setError("");
          setLoadedEpisodeId(episodeId);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setEpisode(null);
          setEpisodes([]);
          setError(cause.message || "Could not load this episode.");
          setLoadedEpisodeId(episodeId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  useEffect(() => {
    if (!episode) return undefined;

    return setPageMetadata({
      title: `${episode.drama.title} — Episode ${episode.episodeNumber} | Kflix Hindi`,
      description:
        episode.description ||
        `Watch episode ${episode.episodeNumber} of ${episode.drama.title} on Kflix Hindi.`,
      image: episode.drama.posterUrl,
      url: window.location.href,
    });
  }, [episode]);

  useEffect(() => {
    if (!episode?.dramaId || !firebaseReady) return undefined;

    setReviewsLoading(true);
    setReviewError("");

    let unsubscribe;

    try {
      unsubscribe = watchDramaReviews(
        episode.dramaId,
        (items) => {
          setReviews(items);
          setReviewsLoading(false);
        },
        (cause) => {
          setReviewError(cause.message || "Could not load reviews.");
          setReviewsLoading(false);
        },
      );
    } catch (cause) {
      setReviewError(cause.message || "Could not load reviews.");
      setReviewsLoading(false);
    }

    return () => unsubscribe?.();
  }, [episode?.dramaId]);

  async function handleReviewSubmit(event) {
    event.preventDefault();
    setReviewError("");
    setReviewMessage("");
    setReviewBusy(true);

    try {
      await saveDramaReview(
        episode.dramaId,
        user,
        rating,
        comment,
      );

      setReviewMessage("Your review has been saved.");
    } catch (cause) {
      setReviewError(cause.message || "Could not save your review.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleDeleteReview() {
    if (!user || !window.confirm("Delete your review?")) return;

    setReviewError("");
    setReviewMessage("");
    setReviewBusy(true);

    try {
      await deleteDramaReview(episode.dramaId, user.uid);
      setComment("");
      setRating(5);
      setReviewMessage("Your review has been deleted.");
    } catch (cause) {
      setReviewError(cause.message || "Could not delete your review.");
    } finally {
      setReviewBusy(false);
    }
  }

  function editOwnReview() {
    if (!ownReview) return;

    setRating(ownReview.rating);
    setComment(ownReview.comment);
    setReviewMessage("You can now edit your review.");
    setReviewError("");
  }

  if (loadedEpisodeId !== episodeId) {
    return (
      <div className="detail-page">
        <p className="content-state">Loading episode…</p>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="detail-page">
        <p className="content-state error-state">
          {error || "Episode not found or no longer published."}
        </p>
        <Link className="primary-btn" to="/">
          Back to home
        </Link>
      </div>
    );
  }

  const videoUrl = getSafeVideoUrl(episode.videoUrl);
  const embedUrl = getEmbeddableVideoUrl(episode.videoUrl);

 
const sortedEpisodes = [...episodes].sort(
  (a, b) => Number(a.episodeNumber) - Number(b.episodeNumber)
);

const currentIndex = sortedEpisodes.findIndex(
  (item) => item.id === episode.id
);

const previousEpisode =
  currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;

const nextEpisode =
  currentIndex >= 0
    ? sortedEpisodes[currentIndex + 1] || null
    : null;

  const averageRating = reviews.length
    ? (
        reviews.reduce((total, review) => total + review.rating, 0) /
        reviews.length
      ).toFixed(1)
    : "0.0";

  const drama = episode.drama;
  const genres = Array.isArray(drama.genre)
    ? drama.genre.join(", ")
    : drama.genre;

  return (
    <div className="detail-page">
      <header className="navbar">
        <Link className="logo" to="/">
          KFLIX <span>HINDI</span>
        </Link>

        <Link
          className="category"
          to={`/drama/${encodeURIComponent(drama.slug)}`}
        >
          ← {drama.title}
        </Link>
      </header>

      <main className="watch-page">
        <div className="watch-layout">
                    {/* LEFT COLUMN: episode title and video player */}
          <div className="watch-main-column">
            <span className="eyebrow">{drama.title}</span>

            <h1>Episode {episode.episodeNumber}</h1>

            <div className="video-frame watch-frame">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={`${drama.title} episode ${episode.episodeNumber}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="video-placeholder">
                  <span aria-hidden="true">▶</span>

                  <p>
                    {videoUrl
                      ? "This provider does not have a supported embedded player here."
                      : "A valid video URL is not available for this episode."}
                  </p>

                  {videoUrl ? (
                    <a
                      className="watch-link"
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open authorized video source ↗
                    </a>
                  ) : null}

                  <small>
                    Some providers do not permit embedding. Playback
                    depends on the source provider.
                  </small>
                </div>
              )}
            </div>

            {embedUrl ? (
              <p className="provider-note">
                If playback is blocked, the video provider may not allow
                embedding.{" "}
                <a href={videoUrl} target="_blank" rel="noreferrer">
                  Open the authorized source ↗
                </a>
              </p>
            ) : null}

            <div className="episode-navigation">
              {previousEpisode ? (
                <Link
                  className="category"
                  to={`/watch/${previousEpisode.id}`}
                >
                  ← Previous Episode
                </Link>
              ) : (
                <span className="category" aria-disabled="true">
                  ← Previous Episode
                </span>
              )}

              {nextEpisode ? (
                <Link
                  className="category"
                  to={`/watch/${nextEpisode.id}`}
                >
                  Next Episode →
                </Link>
              ) : (
                <span className="category" aria-disabled="true">
                  Next Episode →
                </span>
              )}
            </div>

            {episode.description ? (
              <section className="watch-about-card">
                <h2>Episode Description</h2>
                <p>{episode.description}</p>
              </section>
            ) : null}
          </div>
          {/* RIGHT COLUMN: drama information and episode list */}
          <aside className="watch-sidebar">
            <div className="watch-drama-card">
              {drama.posterUrl ? (
                <img
                  src={drama.posterUrl}
                  alt={`${drama.title} poster`}
                  loading="lazy"
                />
              ) : null}
              </div>

              <div className="watch-drama-info">
                <h2>{drama.title}</h2>

                {drama.releaseYear ? (
                  <p>Year: {drama.releaseYear}</p>
                ) : null}

                {genres ? <p>Genre: {genres}</p> : null}

                {drama.language ? (
                  <p>Audio: {drama.language}</p>
                ) : null}

                {drama.status ? <p>Status: {drama.status}</p> : null}

                <Link
                  className="watch-details-link"
                  to={`/drama/${encodeURIComponent(drama.slug)}`}
                >
                  Drama details →
                </Link>
              </div>


            <section className="watch-episodes">
              <h2>
                Available Episodes
                </h2>

              {episodes.length === 0 ? (
                <p className="content-state">
                  No published episodes are currently available.
                </p>
              ) : (
                <div className="episode-list">
                  {sortedEpisodes.map((item) => (
                    <Link
                      key={item.id}
                      className={
                        item.id === episode.id
                          ? "episode active"
                          : "episode"
                      }
                      aria-current={
                        item.id === episode.id ? "page" : undefined
                      }
                      to={`/watch/${item.id}`}
                    >
                      <span className="episode-number">
                       EP {item.episodeNumber}
                     </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
        {/* FULL WIDTH: reviews belong to the drama, not an individual episode */}
        <section className="reviews-section">
          <h2>Ratings &amp; Reviews</h2>

          <p className="detail-description">
            {drama.title} — share your thoughts about this drama.
          </p>

          <div className="reviews-summary">
            <strong>{averageRating}</strong>

            <span
              className="review-stars"
              aria-label={`${averageRating} out of 5 stars`}
            >
              {"★".repeat(Math.round(Number(averageRating)))}
              {"☆".repeat(5 - Math.round(Number(averageRating)))}
            </span>

            <span>
              {reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </span>
          </div>

          {user ? (
            <form className="review-form" onSubmit={handleReviewSubmit}>
              <h3>{ownReview ? "Your review" : "Write a review"}</h3>

              <label htmlFor="drama-rating">Your rating</label>

              <div className="rating-picker" id="drama-rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      value <= rating
                        ? "rating-star selected"
                        : "rating-star"
                    }
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                    aria-pressed={rating === value}
                    onClick={() => setRating(value)}
                  >
                    ★
                  </button>
                ))}
              </div>

              <label htmlFor="drama-review-comment">
                Your review
              </label>

              <textarea
                id="drama-review-comment"
                rows={4}
                maxLength={1000}
                required
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="What did you think of this drama?"
              />

              <small>{comment.length}/1000 characters</small>

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

              <div className="review-actions">
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={reviewBusy}
                >
                  {reviewBusy
                    ? "Please wait…"
                    : ownReview
                      ? "Update review"
                      : "Submit review"}
                </button>

                {ownReview ? (
                  <button
                    className="category"
                    type="button"
                    onClick={handleDeleteReview}
                    disabled={reviewBusy}
                  >
                    Delete my review
                  </button>
                ) : null}
              </div>

              {ownReview ? (
                <button
                  className="category"
                  type="button"
                  onClick={editOwnReview}
                >
                  Load my saved review to edit
                </button>
              ) : null}
            </form>
          ) : (
            <div className="review-login-prompt">
              <p>Sign in to rate this drama and write a review.</p>

              <Link
                className="button button-primary"
                to="/login"
                state={{ from: { pathname: `/watch/${episode.id}` } }}
              >
                Sign in
              </Link>{" "}

              <Link className="category" to="/signup">
                Create account
              </Link>
            </div>
          )}

          <div className="reviews-list">
            <h3>Viewer Reviews</h3>

            {reviewsLoading ? (
              <p className="content-state">Loading reviews…</p>
            ) : reviewError ? (
              <p className="content-state error-state">{reviewError}</p>
            ) : reviews.length === 0 ? (
              <p className="content-state">
                No reviews yet. Be the first to share your thoughts!
              </p>
            ) : (
              reviews.map((review) => (
                <article className="review-card" key={review.id}>
                  <div className="review-card-heading">
                    <strong>
                      {review.displayName || "Kflix viewer"}
                    </strong>

                    <span className="review-stars">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </div>

                  <p>{review.comment}</p>

                  {review.updatedAt?.toMillis?.() !==
                  review.createdAt?.toMillis?.() ? (
                    <small>Edited</small>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
