
const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const vimeoHosts = new Set([
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
]);

const filemoonHosts = new Set([
  "filemoon.org",
  "www.filemoon.org",
  "filemoon.sx",
  "www.filemoon.sx",
  "filemoon.to",
  "www.filemoon.to",
  "filemoon.in",
  "www.filemoon.in",
]);

export function getSafeVideoUrl(value) {
  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
}

export function getEmbeddableVideoUrl(value) {
  const safeUrl = getSafeVideoUrl(value);
  if (!safeUrl) return null;

  const url = new URL(safeUrl);
  const host = url.hostname.toLowerCase();

  // YouTube
  if (host === "youtu.be") {
    const videoId = url.pathname.split("/").filter(Boolean)[0];

    return videoId
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
      : null;
  }

  if (youtubeHosts.has(host)) {
    const videoId =
      url.searchParams.get("v") ||
      url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];

    return videoId
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
      : null;
  }

  // Vimeo
  if (vimeoHosts.has(host)) {
    const videoId = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/|$)/)?.[1];

    return videoId
      ? `https://player.vimeo.com/video/${videoId}`
      : null;
  }
  
  // FileMoon embed URL
  if (
    host === "filemoon.org" ||
    host === "www.filemoon.org" ||
    host === "filemoon.sx" ||
    host === "www.filemoon.sx"
  ) {
    const match = url.pathname.match(
      /^\/(?:en\/)?([a-zA-Z0-9_-]+)\/(?:file|watch|embed)\/?$/
    );

    if (match) {
      return `https://filemoon.org/${encodeURIComponent(match[1])}/embed`;
    }
  }

  // FileMoon
  if (filemoonHosts.has(host)) {
    const videoId =
      url.pathname.match(/^\/en\/([a-zA-Z0-9_-]+)\/file\/?$/)?.[1] ||
      url.pathname.match(/^\/(?:e|embed|d)\/([a-zA-Z0-9_-]+)\/?$/)?.[1];

    return videoId
      ? `https://filemoon.sx/e/${encodeURIComponent(videoId)}`
      : null;
  }

  return null;
}
