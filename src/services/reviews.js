import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, firebaseReady } from "../firebase";

function requireFirebase() {
  if (!firebaseReady || !db) {
    throw new Error("Firebase is not configured.");
  }
}

function reviewCollection(dramaId) {
  return collection(db, "dramas", dramaId, "reviews");
}

function reviewDocument(dramaId, userId) {
  return doc(db, "dramas", dramaId, "reviews", userId);
}

function reviewsFrom(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function getDramaReviews(dramaId) {
  requireFirebase();

  const snapshot = await getDocs(
    query(reviewCollection(dramaId)),
  );

  return reviewsFrom(snapshot).sort(
    (a, b) => (b.createdAt?.toMillis?.() ?? 0) -
              (a.createdAt?.toMillis?.() ?? 0),
  );
}

export function watchDramaReviews(dramaId, onData, onError) {
  requireFirebase();

  return onSnapshot(
    query(reviewCollection(dramaId)),
    (snapshot) => {
      const reviews = reviewsFrom(snapshot).sort(
        (a, b) => (b.createdAt?.toMillis?.() ?? 0) -
                  (a.createdAt?.toMillis?.() ?? 0),
      );
      onData(reviews);
    },
    onError,
  );
}

export async function saveDramaReview(dramaId, user, rating, comment) {
  requireFirebase();

  if (!user?.uid) {
    throw new Error("Please sign in to submit a review.");
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Please select a rating from 1 to 5 stars.");
  }

  const cleanComment = comment.trim();

  if (!cleanComment || cleanComment.length > 1000) {
    throw new Error("Your review must be between 1 and 1000 characters.");
  }

  const displayName = (user.displayName || "Kflix user")
  .trim()
  .slice(0, 60);

  const reviewRef = reviewDocument(dramaId, user.uid);
  const existing = await getDoc(reviewRef);

  if (existing.exists()) {
    await updateDoc(reviewRef, {
      displayName,
      rating,
      comment: cleanComment,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(reviewRef, {
      uid: user.uid,
      displayName,
      rating,
      comment: cleanComment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function deleteDramaReview(dramaId, userId) {
  requireFirebase();

  if (!userId) {
    throw new Error("Please sign in to delete your review.");
  }

  await deleteDoc(reviewDocument(dramaId, userId));
}