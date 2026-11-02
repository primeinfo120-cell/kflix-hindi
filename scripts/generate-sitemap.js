
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { initializeApp } from "firebase/app";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
} from "firebase/firestore";
import { loadEnv } from "vite";

const siteUrl = "https://kflix-hindi.pages.dev";
const outputPath = resolve("dist", "sitemap.xml");
const env = loadEnv("production", process.cwd(), "");

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function urlEntry(path) {
  return `<url><loc>${escapeXml(`${siteUrl}${path}`)}</loc></url>`;
}

async function getPublishedContent() {
  const requiredKeys = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_APP_ID",
  ];

  const hasAnyFirebaseConfig = requiredKeys.some((key) => env[key]);

  if (!requiredKeys.every((key) => env[key])) {
    if (hasAnyFirebaseConfig) {
      throw new Error("Firebase sitemap configuration is incomplete.");
    }

    console.warn("Firebase config missing; generating homepage-only sitemap.");
    return { dramas: [], episodes: [] };
  }

  if (env.VITE_FIREBASE_PROJECT_ID !== "kflix-156f2") {
    throw new Error("Unexpected Firebase project.");
  }

  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });

  const db = getFirestore(app);

  const [dramaSnapshot, episodeSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, "dramas"),
      where("publicationStatus", "==", "published"),
    )),
    getDocs(query(
      collection(db, "episodes"),
      where("publicationStatus", "==", "published"),
      where("dramaPublicationStatus", "==", "published"),
    )),
  ]);

  return {
    dramas: dramaSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
    episodes: episodeSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
  };
}

const { dramas, episodes } = await getPublishedContent();

const publishedDramas = new Map(
  dramas
    .filter((drama) => drama.publicationStatus === "published" && drama.slug)
    .map((drama) => [drama.id, drama]),
);

const entries = [urlEntry("/")];

for (const drama of publishedDramas.values()) {
  entries.push(urlEntry(`/drama/${encodeURIComponent(drama.slug)}`));
}

for (const episode of episodes) {
  const drama = publishedDramas.get(episode.dramaId);

  if (
    !drama ||
    episode.publicationStatus !== "published" ||
    episode.dramaPublicationStatus !== "published"
  ) {
    continue;
  }

  entries.push(urlEntry(`/watch/${encodeURIComponent(episode.id)}`));
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries,
  "</urlset>",
  "",
].join("\n");

await mkdir(resolve("dist"), { recursive: true });
await writeFile(outputPath, sitemap, "utf8");

console.log(`Generated simple sitemap with ${entries.length} URLs.`);
