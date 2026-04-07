/**
 * URL helpers, favicons, and dev-server detection.
 * Load before resume-text.js (which uses getFaviconUrl in parseMarkdownLinks) and ats-layout.js.
 */

/**
 * True when the page is served by the local dev server (server.js) that exposes /api/*.
 * GitHub Pages project sites must not use root-absolute /api (it targets the wrong path).
 */
function isLocalDevResumeServer() {
  try {
    const hostname = window.location.hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch (error) {
    return false;
  }
}

/**
 * Company site URL from an experience entry (TOML may use url, company.url, or nested company).
 */
function getExperienceCompanyUrl(experienceEntry) {
  if (!experienceEntry) return "";
  const raw =
    experienceEntry.url ||
    experienceEntry["company.url"] ||
    (experienceEntry.company &&
      (experienceEntry.company.url || experienceEntry.companyUrl));
  return typeof raw === "string" ? raw.trim() : "";
}

const ICON_RULES_FOR_LINK = [
  {
    match: (url) => url.includes("linkedin.com"),
    icon: "mdi:linkedin",
  },
  {
    match: (url) => url.includes("github.com"),
    icon: "mdi:github",
  },
  {
    match: (url, linkType) => url.includes("t.me") || linkType === "telegram",
    icon: "mdi:telegram",
  },
  {
    match: (url) => url.includes("twitter.com") || url.includes("x.com"),
    icon: "mdi:twitter",
  },
  {
    match: (url) => url.includes("facebook.com"),
    icon: "mdi:facebook",
  },
  {
    match: (url) => url.includes("instagram.com"),
    icon: "mdi:instagram",
  },
  {
    match: (url, linkType) => linkType === "website",
    icon: "mdi:web",
  },
];

/**
 * Get icon name based on URL or type
 */
function getIconForLink(url, type) {
  for (const rule of ICON_RULES_FOR_LINK) {
    if (rule.match(url, type)) {
      return rule.icon;
    }
  }
  return "mdi:link";
}

/**
 * Extract readable domain from URL
 */
function getDomainFromUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch (error) {
    console.warn("Unable to parse domain from URL:", url, error);
    return url;
  }
}

/**
 * Build preview image URL (OG in dev, favicon on static hosting)
 */
function getPreviewImageUrl(url) {
  if (isLocalDevResumeServer()) {
    const encodedUrl = encodeURIComponent(url);
    const previewUrl = `/api/og-image?url=${encodedUrl}`;
    console.log(`[getPreviewImageUrl] Исходный URL: ${url}`);
    console.log(`[getPreviewImageUrl] Закодированный URL: ${encodedUrl}`);
    console.log(`[getPreviewImageUrl] Итоговый preview URL: ${previewUrl}`);
    return previewUrl;
  }
  return getFaviconUrl(url);
}

/**
 * Build favicon URL that preserves original icon colors
 */
function getFaviconUrl(url) {
  if (url.includes("github.com")) {
    return "data:,";
  }

  if (url.includes("twitter.com") || url.includes("x.com")) {
    return "https://abs.twimg.com/favicons/twitter.2.ico";
  }

  let target = url;

  try {
    const parsed = new URL(url);
    target = `${parsed.protocol}//${parsed.hostname}`;
  } catch (error) {
    // Strip leading non-alphanumeric junk so the URL can be prefixed with https://
    const sanitized = url.replace(/^[^a-zA-Z0-9]+/, "");
    target = `https://${sanitized}`;
    console.warn(
      "Invalid URL provided for favicon. Attempting to normalize:",
      url,
      error,
    );
  }

  const encoded = encodeURIComponent(target);
  return `https://www.google.com/s2/favicons?sz=32&domain_url=${encoded}`;
}
