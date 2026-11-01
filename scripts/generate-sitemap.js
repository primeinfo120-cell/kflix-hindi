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
import { getEmbeddableVideoUrl } from "../src/utils/videoEmbed.js";

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

function pageUrl(path) {
  return `${siteUrl}${path}`;
}

function videoEntry(episode, drama) {
  const playerUrl = getEmbeddableVideoUrl(episode.videoUrl);
  if (!playerUrl) return "";

  const title = `${drama.title} - Episode ${episode.episodeNumber}`.slice(0, 100);
  const description = (
    episode.description ||
    `Watch episode ${episode.episodeNumber} of ${drama.title} on Kflix Hindi.`
  ).slice(0, 2048);
  const thumbnailUrl = episode.thumbnailUrl || drama.posterUrl;

  return [
    "<video:video>",
    `<video:thumbnail_loc>${escapeXml(thumbnailUrl)}</video:thumbnail_loc>`,
    `<video:title>${escapeXml(title)}</video:title>`,
    `<video:description>${escapeXml(description)}</video:description>`,
    `<video:player_loc>${escapeXml(playerUrl)}</video:player_loc>`,
    "</video:video>",
  ].join("");
}

function urlEntry(path, video = "") {
  return [
    "<url>",
    `<loc>${escapeXml(pageUrl(path))}</loc>`,
    video,
    "</url>",
  ].join("");
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
      throw new Error(
        "Firebase sitemap generation requires VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID.",
      );
    }

    console.warn(
      "Firebase environment variables are not configured; generating a homepage-only sitemap.",
    );
    return { dramas: [], episodes: [] };
  }

  if (env.VITE_FIREBASE_PROJECT_ID !== "kflix-156f2") {
    throw new Error(
      "Sitemap generation is configured for an unexpected Firebase project.",
    );
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
    dramas: dramaSnapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    })),
    episodes: episodeSnapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
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

  entries.push(
    urlEntry(
      `/watch/${encodeURIComponent(episode.id)}`,
      videoEntry(episode, drama),
    ),
  );
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
  ...entries,
  "</urlset>",
  "",
].join("\n");

await mkdir(resolve("dist"), { recursive: true });
await writeFile(outputPath, sitemap, "utf8");
console.log(
  `Generated sitemap with ${entries.length} URLs (${publishedDramas.size} dramas, ${entries.length - publishedDramas.size - 1} episodes).`,
);
