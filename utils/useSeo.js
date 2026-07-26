import { useEffect } from "react";

const SITE_URL = "https://gemtide.win";

function setMetaByName(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaByProperty(property, content) {
  let el = document.head.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(path) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", `${SITE_URL}${path}`);
}

/**
 * Sets per-page <title>/meta description/OG/Twitter tags/canonical link
 * for SPA routes so each route can target its own search keywords
 * instead of sharing the single index.html defaults.
 * Restores the previous title on unmount so navigating away doesn't
 * leave a stale tag if something else races it.
 */
export function useSeo({ title, description, path }) {
  useEffect(() => {
    const prevTitle = document.title;

    if (title) {
      document.title = title;
      setMetaByProperty("og:title", title);
      setMetaByName("twitter:title", title);
    }
    if (description) {
      setMetaByName("description", description);
      setMetaByProperty("og:description", description);
      setMetaByName("twitter:description", description);
    }
    if (path) {
      setCanonical(path);
      setMetaByProperty("og:url", `${SITE_URL}${path}`);
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, path]);
}
