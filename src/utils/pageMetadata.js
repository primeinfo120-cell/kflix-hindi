export function setPageMetadata({ title, description, image, url }) {
  const metaDescription = description.slice(0, 160);
  const previousTitle = document.title;
  document.title = title;

  const entries = [
    ["name", "description", metaDescription],
    ["property", "og:title", title],
    ["property", "og:description", metaDescription],
    ["property", "og:type", "website"],
    ["property", "og:url", url],
    ["property", "og:image", image],
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

  return () => {
    document.title = previousTitle;
    previousValues.forEach(({ element, existed, previousContent }) => {
      if (existed) element.setAttribute("content", previousContent);
      else element.remove();
    });
  };
}
