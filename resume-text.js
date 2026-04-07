/**
 * Markdown-like text parsing for HR layout.
 * Depends on resume-links.js (getFaviconUrl, getIconForLink).
 */

/**
 * Parse markdown links to styled tags with icons
 * Supports: [title](url) -> <a class="link-tag" href="url">...</a>
 */
function parseMarkdownLinks(text) {
  if (!text) return "";

  // Turn [title](url) into a link tag with favicon and icon fallback
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (fullMatch, linkTitle, linkUrl) => {
      // Escape < and > in visible link text for HTML safety
      const safeTitle = linkTitle
        // Escape literal < in link text
        .replace(/</g, "&lt;")
        // Escape literal > in link text
        .replace(/>/g, "&gt;");
      // Escape double quotes in href attribute value
      const safeUrl = linkUrl.replace(/"/g, "&quot;");

      const faviconUrl = getFaviconUrl(safeUrl);
      let fallbackIcon = getIconForLink(safeUrl);
      if (fallbackIcon === "mdi:link") {
        fallbackIcon = "mdi:link-variant";
      }

      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="link-tag">
            <img src="${faviconUrl}" alt="${safeTitle} favicon" class="link-tag__favicon" loading="eager" decoding="async" referrerpolicy="no-referrer" width="10" height="10" style="width:10px;height:10px;max-width:10px;max-height:10px;padding:0;margin:0;object-fit:contain;display:block;box-sizing:border-box;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
            <span class="iconify link-tag__icon link-tag__icon--fallback" data-icon="${fallbackIcon}" aria-hidden="true" style="display: none;"></span>
            <span class="link-tag__text">${safeTitle}</span>
        </a>`;
    },
  );
}

/**
 * Parse text formatting (bold, italic, underline)
 * Supports: **bold**, *italic*, __underline__
 */
function parseFormatting(text) {
  if (!text) return "";

  let formatted = parseMarkdownLinks(text);

  formatted = formatted
    // **text** -> <strong>
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // *text* -> <em> (not ** which is handled above)
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // __text__ -> underline
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    // Single newlines -> <br>
    .replace(/\n/g, "<br>");

  return formatted;
}

/**
 * Parse text formatting without rendering markdown links as <a>.
 */
function parseFormattingNoLinks(text) {
  if (!text) return "";

  // Markdown links -> visible title only (no <a>)
  let formatted = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  formatted = formatted
    // **text** -> <strong>
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // *text* -> <em>
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // __text__ -> underline
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    // Single newlines -> <br>
    .replace(/\n/g, "<br>");

  return formatted;
}

/**
 * Convert bullet / numbered lines to HTML lists.
 * @param {string} text
 * @param {{ renderLinks?: boolean }} [options] renderLinks true = parseFormatting (default), false = parseFormattingNoLinks
 */
function parseListsWithOptions(text, options) {
  const renderLinks = options && options.renderLinks !== false;
  const formatLine = renderLinks ? parseFormatting : parseFormattingNoLinks;

  if (!text) return "";

  const lines = text.split("\n");
  const result = [];
  let currentList = [];
  let inList = false;
  let isNumberedList = false;

  function flushList() {
    if (currentList.length > 0) {
      const listItems = currentList
        .map((item) => {
          let cleaned;
          if (isNumberedList) {
            // Strip leading "1. "-style prefix from numbered list lines
            cleaned = item.replace(/^[\s]*\d+\.\s*/, "").trim();
          } else {
            // Strip bullet marker and following spaces
            cleaned = item.replace(/^[\s]*[-•*◦▪▫]\s*/, "").trim();
          }
          return `<li>${formatLine(cleaned)}</li>`;
        })
        .join("");
      const listTag = isNumberedList ? "ol" : "ul";
      result.push(`<${listTag}>${listItems}</${listTag}>`);
      currentList = [];
    }
    inList = false;
    isNumberedList = false;
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    const isBulletListItem = /^[-•*◦▪▫]\s+/.test(trimmed);
    const isNumberedListItem = /^\d+\.\s+/.test(trimmed);

    if (isBulletListItem || isNumberedListItem) {
      if (
        inList &&
        ((isNumberedListItem && !isNumberedList) ||
          (isBulletListItem && isNumberedList))
      ) {
        flushList();
      }

      if (!inList) {
        inList = true;
        isNumberedList = isNumberedListItem;
      }
      currentList.push(trimmed);
    } else {
      flushList();
      if (trimmed) {
        result.push(`<p>${formatLine(trimmed)}</p>`);
      } else {
        result.push("<br>");
      }
    }
  });

  flushList();
  return result.join("");
}

function parseLists(text) {
  return parseListsWithOptions(text, { renderLinks: true });
}

function parseListsNoLinks(text) {
  return parseListsWithOptions(text, { renderLinks: false });
}

/**
 * Create an HTML element with text content
 */
function createElement(tag, content, className = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.innerHTML = parseFormatting(content);
  return element;
}
