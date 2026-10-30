import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  writeBatch,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, firebaseReady } from "../firebase";

const dramasCollection = () => collection(db, "dramas");
const episodesCollection = () => collection(db, "episodes");
const valuesFrom = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

function requireFirebase() {
  if (!firebaseReady || !db) throw new Error("Firebase is not configured. Add the VITE_FIREBASE values from your Firebase web app.");
}

export function watchPublishedDramas(onData, onError) {
  requireFirebase();
  return onSnapshot(
    query(dramasCollection(), where("publicationStatus", "==", "published")),
    (snapshot) => onData(valuesFrom(snapshot)),
    onError,
  );
}

export function watchPublishedEpisodes(onData, onError) {
  requireFirebase();
  return onSnapshot(
    query(
      episodesCollection(),
      where("publicationStatus", "==", "published"),
      where("dramaPublicationStatus", "==", "published"),
    ),
    (snapshot) => onData(valuesFrom(snapshot)),
    onError,
  );
}

export function watchPublishedEpisodesForDrama(dramaId, onData, onError) {
  requireFirebase();
  return onSnapshot(
    query(
      episodesCollection(),
      where("dramaId", "==", dramaId),
      where("publicationStatus", "==", "published"),
      where("dramaPublicationStatus", "==", "published"),
    ),
    (snapshot) => onData(valuesFrom(snapshot)),
    onError,
  );
}

export async function getPublishedEpisodesForDrama(dramaId) {
  requireFirebase();
  const snapshot = await getDocs(query(
    episodesCollection(),
    where("dramaId", "==", dramaId),
    where("publicationStatus", "==", "published"),
    where("dramaPublicationStatus", "==", "published"),
  ));
  return valuesFrom(snapshot).sort((left, right) => Number(left.episodeNumber) - Number(right.episodeNumber));
}

export async function getPublishedDramaBySlug(slug) {
  requireFirebase();
  const snapshot = await getDocs(query(
    dramasCollection(),
    where("slug", "==", slug),
    where("publicationStatus", "==", "published"),
  ));
  return valuesFrom(snapshot)[0] ?? null;
}

export async function getPublishedEpisode(id) {
  requireFirebase();
  const snapshot = await getDoc(doc(db, "episodes", id));
  if (
    !snapshot.exists() ||
    snapshot.data().publicationStatus !== "published" ||
    snapshot.data().dramaPublicationStatus !== "published"
  ) return null;
  const episode = { id: snapshot.id, ...snapshot.data() };
  let dramaSnapshot;
  try {
    dramaSnapshot = await getDoc(doc(db, "dramas", episode.dramaId));
  } catch (cause) {
    if (cause.code === "permission-denied") return null;
    throw cause;
  }
  if (!dramaSnapshot.exists() || dramaSnapshot.data().publicationStatus !== "published") return null;
  return { ...episode, drama: { id: dramaSnapshot.id, ...dramaSnapshot.data() } };
}

export async function getAdminContent() {
  requireFirebase();
  const [dramas, episodes] = await Promise.all([
    getDocs(dramasCollection()),
    getDocs(episodesCollection()),
  ]);
  return { dramas: valuesFrom(dramas), episodes: valuesFrom(episodes) };
}

export async function findDramaBySlug(slug, exceptId = "") {
  requireFirebase();
  const snapshot = await getDocs(query(dramasCollection(), where("slug", "==", slug)));
  return valuesFrom(snapshot).find((drama) => drama.id !== exceptId) ?? null;
}

export async function findEpisodeByNumber(dramaId, episodeNumber, exceptId = "") {
  requireFirebase();
  const snapshot = await getDocs(query(episodesCollection(), where("dramaId", "==", dramaId)));
  return valuesFrom(snapshot).find((episode) => Number(episode.episodeNumber) === Number(episodeNumber) && episode.id !== exceptId) ?? null;
}

export async function saveDrama(id, data) {
  requireFirebase();
  if (id) {
    const dramaRef = doc(db, "dramas", id);
    const previous = await getDoc(dramaRef);
    if (!previous.exists()) throw new Error("Drama no longer exists.");
    const previousStatus = previous.data().publicationStatus;
    const nextStatus = data.publicationStatus;
    if (previousStatus === "published" && nextStatus === "draft") {
      await updateDramaEpisodeVisibility(id, "draft");
      await updateDoc(dramaRef, { ...data, updatedAt: serverTimestamp() });
    } else if (previousStatus === "draft" && nextStatus === "published") {
      await updateDoc(dramaRef, { ...data, updatedAt: serverTimestamp() });
      await updateDramaEpisodeVisibility(id, "published");
    } else {
      await updateDoc(dramaRef, { ...data, updatedAt: serverTimestamp() });
    }
    return id;
  }
  const reference = await addDoc(dramasCollection(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
}

async function updateDramaEpisodeVisibility(dramaId, dramaPublicationStatus) {
  const snapshot = await getDocs(query(episodesCollection(), where("dramaId", "==", dramaId)));
  for (let offset = 0; offset < snapshot.docs.length; offset += 450) {
    const batch = writeBatch(db);
    snapshot.docs.slice(offset, offset + 450).forEach((episode) => {
      batch.update(episode.ref, { dramaPublicationStatus, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  }
}

export async function removeDrama(id) {
  requireFirebase();

  // 1. Delete all episodes
  const episodesSnapshot = await getDocs(
    query(episodesCollection(), where("dramaId", "==", id))
  );

  for (let offset = 0; offset < episodesSnapshot.docs.length; offset += 450) {
    const batch = writeBatch(db);

    episodesSnapshot.docs
      .slice(offset, offset + 450)
      .forEach((episode) => batch.delete(episode.ref));

    await batch.commit();
  }

  // 2. Delete all reviews
  const reviewsRef = collection(db, "dramas", id, "reviews");
  const reviewsSnapshot = await getDocs(reviewsRef);

  for (let offset = 0; offset < reviewsSnapshot.docs.length; offset += 450) {
    const batch = writeBatch(db);

    reviewsSnapshot.docs
      .slice(offset, offset + 450)
      .forEach((review) => batch.delete(review.ref));

    await batch.commit();
  }

  // 3. Delete drama document
  await deleteDoc(doc(db, "dramas", id));
}

export async function saveEpisode(id, data) {
  requireFirebase();
  const parent = await getDoc(doc(db, "dramas", data.dramaId));
  if (!parent.exists()) throw new Error("Select an existing drama.");
  const dramaPublicationStatus = parent.data().publicationStatus;
  if (id) {
    await updateDoc(doc(db, "episodes", id), { ...data, dramaPublicationStatus, updatedAt: serverTimestamp() });
    return id;
  }
  const reference = await addDoc(episodesCollection(), {
    ...data,
    dramaPublicationStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
}

export async function removeEpisode(id) {
  requireFirebase();
  await deleteDoc(doc(db, "episodes", id));
}
