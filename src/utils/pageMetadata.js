
export function setPageMetadata({
  title,
  description = "Discover Hindi-dubbed Korean dramas and the latest episodes on Kflix Hindi.",
  image,
  url,
}) {
  const metaDescription = String(description).slice(0, 160);

  const previousTitle = document.title;
  document.title = title;

  const canonicalUrl = url
    ? new URL(url, window.location.origin).origin +
      new URL(url, window.location.origin).pathname
    : window.location.origin + window.location.pathname;

  const entries = [
    ["name", "description", metaDescription],
    ["property", "og:title", title],
    ["property", "og:description", metaDescription],
    ["property", "og:type", "website"],
    ["property", "og:url", canonicalUrl],
    ["property", "og:image", image || ""],
    ["name", "twitter:card", image ? "summary_large_image" : "summary"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", metaDescription],
    ...(image ? [["name", "twitter:image", image]] : []),
  ];

  const previousValues = entries.map(([attribute, key, content]) => {
    const selector = `meta[${attribute}="${key}"]`;
    let element = document.head.querySelector(selector);
    const existed = Boolean(element);

    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, key);
      document.head.append(element);
    }

    const previousContent = element.getAttribute("content");
    element.setAttribute("content", content);

    return { element, existed, previousContent };
  });

  let canonical = document.head.querySelector('link[rel="canonical"]');
  const canonicalExisted = Boolean(canonical);
  const previousCanonicalHref = canonical?.getAttribute("href");

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.append(canonical);
  }

  canonical.setAttribute("href", canonicalUrl);

  return () => {
    document.title = previousTitle;

    previousValues.forEach(({ element, existed, previousContent }) => {
      if (existed) {
        element.setAttribute("content", previousContent ?? "");
      } else {
        element.remove();
      }
    });

    if (canonicalExisted) {
      canonical.setAttribute("href", previousCanonicalHref ?? "");
    } else {
      canonical.remove();
    }
  };
}
