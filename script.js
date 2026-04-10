// Parsing: resume-text.js; URLs/favicons: resume-links.js (see index.html)

/**
 * Load and optimize avatar image
 * Compresses the image to optimal size for display
 */
async function loadOptimizedAvatar(imgElement, avatarUrl, firstName, lastName) {
  const targetSize = 280; // 2x for retina displays (displayed at 140x140)
  const quality = 0.85; // JPEG quality (0-1)

  try {
    // Create a temporary image element to load the original
    const tempImg = new Image();
    tempImg.crossOrigin = "anonymous"; // Enable CORS for same-origin images

    // Wait for image to load
    const imageLoadPromise = new Promise((resolve, reject) => {
      tempImg.onload = () => resolve(tempImg);
      tempImg.onerror = () => reject(new Error("Failed to load image"));
    });

    tempImg.src = avatarUrl;
    const loadedImg = await imageLoadPromise;

    // Get original size (approximate)
    const originalSize = estimateImageSize(
      loadedImg.naturalWidth,
      loadedImg.naturalHeight,
    );

    // Create a canvas for compression
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Calculate dimensions maintaining aspect ratio
    let width = loadedImg.naturalWidth;
    let height = loadedImg.naturalHeight;
    const aspectRatio = width / height;

    if (width > height) {
      width = targetSize;
      height = targetSize / aspectRatio;
    } else {
      height = targetSize;
      width = targetSize * aspectRatio;
    }

    canvas.width = width;
    canvas.height = height;

    // Draw and compress the image
    ctx.drawImage(loadedImg, 0, 0, width, height);

    // Try WebP first (better compression)
    let compressedBlob;
    let usedFormat = "webp";

    if (canvas.toBlob) {
      // Try WebP first
      try {
        compressedBlob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size > 0) {
                resolve(blob);
              } else {
                reject(new Error("WebP conversion failed"));
              }
            },
            "image/webp",
            quality,
          );
        });

        // If WebP is too large or failed, try JPEG
        if (!compressedBlob || compressedBlob.size > originalSize * 0.8) {
          usedFormat = "jpeg";
          compressedBlob = await new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
          });
        }
      } catch (webpError) {
        // Fallback to JPEG
        usedFormat = "jpeg";
        compressedBlob = await new Promise((resolve) => {
          canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
        });
      }
    } else {
      // Fallback for older browsers - use data URL
      usedFormat = "jpeg";
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const res = await fetch(dataUrl);
      compressedBlob = await res.blob();
    }

    // Create object URL and set as image source
    const optimizedUrl = URL.createObjectURL(compressedBlob);
    imgElement.src = optimizedUrl;
    imgElement.alt = `${firstName || ""} ${lastName || ""}`.trim();

    // Log compression results
    const compressedSize = compressedBlob.size;
    const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(
      `Avatar optimized: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${savings}% reduction, format: ${usedFormat})`,
    );

    // Clean up object URL after image loads
    imgElement.onload = () => {
      URL.revokeObjectURL(optimizedUrl);
    };
  } catch (error) {
    console.warn("Failed to optimize avatar, loading original:", error);
    // Fallback to original image
    imgElement.src = avatarUrl;
    imgElement.alt = `${firstName || ""} ${lastName || ""}`.trim();
  }

  // Handle loading errors
  imgElement.onerror = function () {
    console.warn("Failed to load avatar from:", avatarUrl);
    const initials =
      `${(firstName || "?").charAt(0)}${(lastName || "?").charAt(0)}`.toUpperCase();
    this.src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%232196F3" width="200" height="200"/%3E%3Ctext fill="white" font-size="80" font-family="sans-serif" text-anchor="middle" x="100" y="130"%3E' +
      initials +
      "%3C/text%3E%3C/svg%3E";
  };
}

/**
 * Estimate image file size based on dimensions
 * This is an approximation for JPEG images
 */
function estimateImageSize(width, height) {
  // Rough estimate: JPEG images are typically 0.5-1 bytes per pixel
  // We'll use 0.75 as average for estimation
  const pixelCount = width * height;
  const estimatedSize = pixelCount * 0.75;
  return estimatedSize;
}

// ==================== Theme Toggle Config ====================

const THEME_STORAGE_KEY = "cv-generator-theme";
const THEME_ATTRIBUTE = "data-theme";

/**
 * Get current theme from HTML element
 */
function getCurrentTheme() {
  return document.documentElement.getAttribute(THEME_ATTRIBUTE) || "light";
}

/**
 * Set theme on HTML element
 */
function setTheme(theme) {
  if (theme === "dark" || theme === "light") {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    updateThemeIcon(theme);
    applyAccentColors(); // Reapply accent colors when theme changes
  }
}

/**
 * Apply accent colors from resume data to CSS variables
 * Updates --color-accent based on current theme
 * Supports both formats:
 * - Single color: accentColor = "#0FB981" (applies to both themes)
 * - Light/dark: accentColor.light = "#64B5F6", accentColor.dark = "#2196F3"
 */
function applyAccentColors() {
  if (!currentResumeData?.accentColor) {
    return;
  }

  const accentColor = currentResumeData.accentColor;
  const currentTheme = getCurrentTheme();
  let colorToApply;

  if (typeof accentColor === "string") {
    colorToApply = accentColor.trim();
  } else {
    switch (currentTheme) {
      case "dark":
        colorToApply = accentColor.dark || accentColor.light;
        break;
      case "light":
      default:
        colorToApply = accentColor.light || accentColor.dark;
        break;
    }
  }

  if (colorToApply) {
    document.documentElement.style.setProperty("--color-accent", colorToApply);
  }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  const current = getCurrentTheme();
  const newTheme = current === "dark" ? "light" : "dark";
  setTheme(newTheme);
  persistTheme(newTheme);
}

/**
 * Persist theme preference to localStorage
 */
function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn("Unable to persist theme preference:", error);
  }
}

/**
 * Read theme from localStorage
 */
function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch (error) {
    console.warn("Unable to access localStorage for theme preferences:", error);
  }
  return null;
}

/**
 * Get initial theme based on storage or system preference
 */
function getInitialTheme() {
  const stored = readStoredTheme();
  if (stored) return stored;

  // Check system preference
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

/**
 * Update theme toggle icon based on current theme
 */
function updateThemeIcon(theme) {
  const themeButton = document.getElementById("themeToggleBtn");
  if (!themeButton) return;

  const icon = themeButton.querySelector(".theme-toggle-btn__icon");
  if (!icon) return;

  if (theme === "dark") {
    icon.setAttribute("data-icon", "mdi:weather-sunny");
  } else {
    icon.setAttribute("data-icon", "mdi:weather-night");
  }
}

/**
 * Initialize theme toggle button
 */
function initThemeToggle() {
  const themeButton = document.getElementById("themeToggleBtn");
  if (!themeButton) {
    console.warn("Theme toggle button not found.");
    return;
  }

  // Set initial theme
  const initialTheme = getInitialTheme();
  setTheme(initialTheme);
  persistTheme(initialTheme);

  // Add click event listener
  themeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleTheme();
  });

  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (event) => {
      // Only update if user hasn't manually set a preference
      const stored = readStoredTheme();
      if (!stored) {
        const newTheme = event.matches ? "dark" : "light";
        setTheme(newTheme);
      }
    });
  }
}

// ==================== Language Switcher Config ====================

const LANGUAGE_STORAGE_KEY = "cv-generator-language";
const LANGUAGE_CONFIG = {
  ru: {
    label: "🇷🇺 RUS",
    staticPath: "data/resume-ru.json",
    htmlLang: "ru",
  },
  en: {
    label: "🇬🇧 ENG",
    staticPath: "data/resume-en.json",
    htmlLang: "en",
  },
};
const DEFAULT_LANGUAGE = "ru";
let currentLanguage = DEFAULT_LANGUAGE;

/**
 * Safely read language value from localStorage
 */
function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && LANGUAGE_CONFIG[stored]) {
      return stored;
    }
  } catch (error) {
    console.warn(
      "Unable to access localStorage for language preferences:",
      error,
    );
  }
  return null;
}

/**
 * Persist selected language to localStorage
 */
function persistLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn("Unable to persist language preference:", error);
  }
}

/**
 * Determine initial language based on URL parameter, storage or browser settings
 */
function getInitialLanguage() {
  // Check URL parameter first (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get("lang");
  if (urlLang && (urlLang === "ru" || urlLang === "en")) {
    return urlLang;
  }

  const stored = readStoredLanguage();
  if (stored) return stored;

  const navigatorLanguage = (
    navigator.language ||
    navigator.userLanguage ||
    ""
  ).toLowerCase();
  if (navigatorLanguage.startsWith("ru")) return "ru";
  if (navigatorLanguage.startsWith("en")) return "en";

  return DEFAULT_LANGUAGE;
}

/**
 * Update document HTML lang attribute
 */
function setDocumentLanguage(config) {
  if (!config) return;
  document.documentElement.lang = config.htmlLang || "en";
}

/**
 * Update browser URL to reflect current language and view mode.
 * Uses replaceState to avoid polluting history. Preserves other query params.
 */
function updateBrowserUrl() {
  const params = new URLSearchParams(window.location.search);
  params.set("lang", currentLanguage || DEFAULT_LANGUAGE);
  params.set("tab", currentViewMode === "ats-friendly" ? "ats" : "hr");
  const newRelativeUrl = window.location.pathname + "?" + params.toString();
  history.replaceState(null, "", newRelativeUrl);
}

/**
 * Control language switcher open state
 */
function setLanguageSwitcherOpen(isOpen) {
  const switcher = document.getElementById("languageSwitcher");
  const trigger = document.getElementById("languageSwitcherTrigger");

  if (switcher) {
    const state = String(isOpen);
    switcher.dataset.open = state;
    switcher.setAttribute("data-open", state);
  }

  if (trigger) {
    trigger.setAttribute("aria-expanded", String(isOpen));
  }
}

/**
 * Safely move focus back to trigger element
 */
function focusLanguageTrigger(trigger) {
  if (!trigger || typeof trigger.focus !== "function") return;
  try {
    trigger.focus({ preventScroll: true });
  } catch (error) {
    trigger.focus();
  }
}

/**
 * Update PDF download button link based on current language and view mode
 * Updates href to point to the correct static PDF file
 */
function updatePdfButtonLink() {
  const pdfButton = document.getElementById("pdfDownloadBtn");
  if (!pdfButton) {
    console.warn("PDF download button not found.");
    return;
  }

  const lang = currentLanguage || DEFAULT_LANGUAGE;
  const view = currentViewMode || DEFAULT_VIEW_MODE;
  const viewSuffix = view === "ats-friendly" ? "ats" : "hr";

  // Set static PDF link
  const pdfPath = `data/resume-${lang}.${viewSuffix}.pdf`;
  pdfButton.href = pdfPath;

  // Generate personalized filename for download attribute
  let filename = `resume.${viewSuffix}.pdf`;
  if (currentResumeData) {
    const firstName = currentResumeData.firstName || "";
    const lastName = currentResumeData.lastName || "";
    const jobTitle = currentResumeData.jobTitle || "";

    const nameParts = [firstName, lastName].filter(Boolean);
    const name = nameParts.join(" ");

    if (name && jobTitle) {
      filename = `${name} – ${jobTitle}.${viewSuffix}.pdf`;
    } else if (name) {
      filename = `${name}.${viewSuffix}.pdf`;
    }
  }

  pdfButton.setAttribute("download", filename);

  console.log(`PDF button updated: href="${pdfPath}", download="${filename}"`);
}

// ==================== View Mode Switcher Config ====================

const VIEW_MODE_STORAGE_KEY = "cv-generator-view-mode";
const DEFAULT_VIEW_MODE = "user-friendly";
let currentViewMode = DEFAULT_VIEW_MODE;
let currentResumeData = null; // Store current resume data for PDF filename generation

/**
 * Read view mode from localStorage
 */
function readStoredViewMode() {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === "user-friendly" || stored === "ats-friendly") {
      return stored;
    }
  } catch (error) {
    console.warn(
      "Unable to access localStorage for view mode preferences:",
      error,
    );
  }
  return null;
}

/**
 * Persist selected view mode to localStorage
 */
function persistViewMode(mode) {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch (error) {
    console.warn("Unable to persist view mode preference:", error);
  }
}

/**
 * Get initial view mode based on URL parameter or storage.
 * Supports: view, mode, tab params.
 * - view/mode: 'user-friendly' | 'ats-friendly'
 * - tab: 'hr' | 'ats' (short form)
 */
function getInitialViewMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlView =
    urlParams.get("view") || urlParams.get("mode") || urlParams.get("tab");
  if (urlView === "user-friendly" || urlView === "ats-friendly") {
    return urlView;
  }
  // Short form: tab=ats | tab=hr
  if (urlView === "ats") return "ats-friendly";
  if (urlView === "hr") return "user-friendly";

  const stored = readStoredViewMode();
  return stored || DEFAULT_VIEW_MODE;
}

/**
 * Update view mode switcher UI state
 */
function updateViewModeSwitcherUI(mode) {
  const options = document.querySelectorAll(".view-mode-switcher__option");

  options.forEach((option) => {
    const isActive = option.dataset.mode === mode;
    option.classList.toggle("view-mode-switcher__option--active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  });
}

/**
 * Apply layout changes based on selected view mode
 */
function applyViewMode(mode) {
  const body = document.body;
  if (!body) return;
  body.dataset.viewMode = mode;

  const atsStylesheet = document.getElementById("atsStylesheet");
  if (atsStylesheet) {
    atsStylesheet.disabled = mode !== "ats-friendly";
  }

  const hrLayout = document.querySelector(".container");
  const atsLayout = document.getElementById("atsLayout");

  if (hrLayout) {
    hrLayout.hidden = mode === "ats-friendly";
  }

  if (atsLayout) {
    atsLayout.hidden = mode !== "ats-friendly";
  }
}

/**
 * Handle view mode change
 */
function handleViewModeChange(mode) {
  if (mode === currentViewMode) return;

  currentViewMode = mode;
  persistViewMode(mode);
  updateViewModeSwitcherUI(mode);
  applyViewMode(mode);
  updatePdfButtonLink(); // Update PDF link when view mode changes
  updateBrowserUrl(); // Sync URL with current tab
  console.log(`View mode changed to: ${mode}`);
}

/**
 * Initialize view mode switcher
 */
function initViewModeSwitcher() {
  const switcher = document.getElementById("viewModeSwitcher");
  if (!switcher) {
    console.warn("View mode switcher not found.");
    return;
  }

  const options = Array.from(
    switcher.querySelectorAll(".view-mode-switcher__option"),
  );
  if (options.length === 0) {
    console.warn("View mode switcher options not found.");
    return;
  }

  // Set initial view mode
  const initialMode = getInitialViewMode();
  currentViewMode = initialMode;
  updateViewModeSwitcherUI(initialMode);
  applyViewMode(initialMode);

  // Add click event listeners
  options.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const mode = option.dataset.mode;
      if (mode) {
        handleViewModeChange(mode);
      }
    });

    option.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const mode = option.dataset.mode;
        if (mode) {
          handleViewModeChange(mode);
        }
      }
    });
  });
}

/**
 * Initialize language switcher interactions
 */
function initLanguageSwitcher() {
  const switcher = document.getElementById("languageSwitcher");
  const trigger = document.getElementById("languageSwitcherTrigger");
  const options = Array.from(
    document.querySelectorAll(".language-switcher__option"),
  );

  if (!switcher || !trigger || options.length === 0) {
    console.warn("Language switcher markup is missing or incomplete.");
    return;
  }

  const toggleOpenState = () => {
    const isOpen = switcher.dataset.open === "true";
    setLanguageSwitcherOpen(!isOpen);
  };

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleOpenState();
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleOpenState();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setLanguageSwitcherOpen(true);
      const activeOption = document.querySelector(
        '.language-switcher__option[aria-selected="true"]',
      );
      if (activeOption) {
        activeOption.focus();
      } else if (options[0]) {
        options[0].focus();
      }
    }
    if (event.key === "Escape") {
      setLanguageSwitcherOpen(false);
    }
  });

  options.forEach((option) => {
    option.setAttribute("tabindex", "0");
    option.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const languageCode = option.dataset.lang;
      if (!languageCode || languageCode === currentLanguage) {
        setLanguageSwitcherOpen(false);
        focusLanguageTrigger(trigger);
        return;
      }
      await loadResumeData(languageCode);
      setLanguageSwitcherOpen(false);
      focusLanguageTrigger(trigger);
    });

    option.addEventListener("keydown", async (event) => {
      const languageCode = option.dataset.lang;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!languageCode || languageCode === currentLanguage) {
          setLanguageSwitcherOpen(false);
          focusLanguageTrigger(trigger);
          return;
        }
        await loadResumeData(languageCode);
        setLanguageSwitcherOpen(false);
        focusLanguageTrigger(trigger);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setLanguageSwitcherOpen(false);
        focusLanguageTrigger(trigger);
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!switcher.contains(event.target)) {
      setLanguageSwitcherOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setLanguageSwitcherOpen(false);
    }
  });
}

// ==================== Render Functions ====================

/**
 * Handle preview image loading errors
 */
function handlePreviewImageError(imageElement) {
  console.error(`[handlePreviewImageError] Ошибка загрузки изображения`);
  console.error(`[handlePreviewImageError] src: ${imageElement.src}`);
  console.error(`[handlePreviewImageError] alt: ${imageElement.alt}`);
  console.error(
    `[handlePreviewImageError] naturalWidth: ${imageElement.naturalWidth}, naturalHeight: ${imageElement.naturalHeight}`,
  );

  const previewContainer = imageElement.closest(".experience-link__preview");
  if (previewContainer) {
    console.log(`[handlePreviewImageError] Добавляем класс fallback`);
    previewContainer.classList.add("experience-link__preview--fallback");
    const fallbackIcon = previewContainer.querySelector(
      ".experience-link__fallback",
    );
    if (fallbackIcon) {
      fallbackIcon.style.display = "inline-flex";
      console.log(`[handlePreviewImageError] Показываем fallback иконку`);
    }
  }
  imageElement.remove();
  console.log(`[handlePreviewImageError] Изображение удалено из DOM`);
}

/**
 * Safely get language configuration
 */
function getLanguageConfig(language) {
  return LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG[DEFAULT_LANGUAGE];
}

/**
 * Show or hide language switcher based on multilanguage support
 */
function toggleLanguageSwitcherVisibility(show) {
  const switcher = document.getElementById("languageSwitcher");
  if (switcher) {
    switcher.style.display = show ? "" : "none";
  }
}

/**
 * Update language switcher UI state
 */
function updateLanguageSwitcherUI(language) {
  const config = getLanguageConfig(language);
  const switcher = document.getElementById("languageSwitcher");
  const currentLabel = document.getElementById("languageSwitcherCurrent");
  const trigger = document.getElementById("languageSwitcherTrigger");
  const options = document.querySelectorAll(".language-switcher__option");

  if (currentLabel) {
    currentLabel.textContent = config.label;
  }

  if (trigger) {
    trigger.setAttribute(
      "aria-label",
      `Switch language, current ${config.label}`,
    );
    trigger.setAttribute("aria-expanded", "false");
  }

  options.forEach((option) => {
    const isSelected = option.dataset.lang === language;
    option.setAttribute("aria-selected", String(isSelected));
    option.classList.toggle("language-switcher__option--active", isSelected);
  });

  setLanguageSwitcherOpen(false);
}

/**
 * Update section titles based on current language
 */
function updateSectionTitles(language) {
  // Update "About Me" section title
  const aboutTitleElement = document.querySelector(
    "#aboutSection .section-title",
  );
  if (aboutTitleElement) {
    const titleRu = aboutTitleElement.getAttribute("data-title-ru");
    const titleEn = aboutTitleElement.getAttribute("data-title-en");
    const iconElement = aboutTitleElement.querySelector(".icon");

    if (iconElement) {
      const title = language === "ru" ? titleRu : titleEn;
      aboutTitleElement.innerHTML = iconElement.outerHTML + " " + title;
    }
  }

  // Update "What I'm Looking For" section title
  const expectationTitleElement = document.querySelector(
    "#expectationSection .section-title",
  );
  if (expectationTitleElement) {
    const titleRu = expectationTitleElement.getAttribute("data-title-ru");
    const titleEn = expectationTitleElement.getAttribute("data-title-en");
    const iconElement = expectationTitleElement.querySelector(".icon");
    const hasAccentClass =
      expectationTitleElement.classList.contains("accent-red");

    if (iconElement) {
      const title = language === "ru" ? titleRu : titleEn;
      expectationTitleElement.innerHTML = iconElement.outerHTML + " " + title;
      if (hasAccentClass) {
        expectationTitleElement.classList.add("accent-red");
      }
    }
  }

  // Update "Interests" section title
  const interestsTitleElement = document.querySelector(
    "#interestsSection .section-title",
  );
  if (interestsTitleElement) {
    const titleRu = interestsTitleElement.getAttribute("data-title-ru");
    const titleEn = interestsTitleElement.getAttribute("data-title-en");
    const iconElement = interestsTitleElement.querySelector(".icon");

    if (iconElement) {
      const title = language === "ru" ? titleRu : titleEn;
      interestsTitleElement.innerHTML = iconElement.outerHTML + " " + title;
    }
  }

  // Update "Education & Languages" section title
  const educationLanguagesTitleElement = document.querySelector(
    "#educationLanguagesSection .section-title",
  );
  if (educationLanguagesTitleElement) {
    const hasEducation = (currentResumeData?.education?.length ?? 0) > 0;
    const titleRu = hasEducation
      ? educationLanguagesTitleElement.getAttribute("data-title-ru")
      : educationLanguagesTitleElement.getAttribute("data-title-no-edu-ru");
    const titleEn = hasEducation
      ? educationLanguagesTitleElement.getAttribute("data-title-en")
      : educationLanguagesTitleElement.getAttribute("data-title-no-edu-en");
    const iconElement = educationLanguagesTitleElement.querySelector(".icon");
    const hasAccentClass =
      educationLanguagesTitleElement.classList.contains("accent-green");

    if (iconElement) {
      const title = language === "ru" ? titleRu : titleEn;
      educationLanguagesTitleElement.innerHTML =
        iconElement.outerHTML + " " + title;
      if (hasAccentClass) {
        educationLanguagesTitleElement.classList.add("accent-green");
      }
    }
  }
}

/**
 * Update PDF button text based on current language
 */
function updatePdfButtonText(language) {
  const pdfButton = document.getElementById("pdfDownloadBtn");
  if (!pdfButton) return;

  const buttonText = pdfButton.querySelector(".pdf-download-btn__text");
  if (buttonText) {
    buttonText.textContent = language === "ru" ? "Скачать PDF" : "Download PDF";
  }

  const ariaLabel =
    language === "ru" ? "Скачать резюме в PDF" : "Download resume as PDF";
  pdfButton.setAttribute("aria-label", ariaLabel);
}

function escapeHtmlTextForHeader(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttributeForHeader(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * Render header section
 */
function renderHeader(data) {
  // Update page title using profile name
  if (data.firstName && data.lastName) {
    const fullName = `${data.firstName} ${data.lastName}`;
    if (data.jobTitle) {
      document.title = `${fullName} - ${data.jobTitle}`;
    } else {
      document.title = `${fullName} - Resume`;
    }
  }

  const linkedInReferenceEntry = (data.references || []).find(
    (referenceEntry) =>
      referenceEntry.url && referenceEntry.url.includes("linkedin.com"),
  );
  const profileUrl =
    linkedInReferenceEntry && linkedInReferenceEntry.url
      ? String(linkedInReferenceEntry.url).trim()
      : "";

  const hrHeaderText = document.getElementById("hrHeaderText");
  if (hrHeaderText) {
    const hasFullName = Boolean(data.firstName && data.lastName);

    const jobTitleSource = data.jobTitle || "";
    const jobTitleInnerHtml = profileUrl
      ? parseFormattingNoLinks(jobTitleSource)
      : parseFormatting(jobTitleSource);
    const hasJobTitle = Boolean(jobTitleSource.trim());

    const nameInnerHtml = hasFullName
      ? escapeHtmlTextForHeader(
          `${data.firstName.toUpperCase()} ${data.lastName.toUpperCase()}`,
        )
      : "Loading...";

    const jobTitleBlock = hasJobTitle
      ? `<p class="job-title" id="jobTitle">${jobTitleInnerHtml}</p>`
      : `<p class="job-title" id="jobTitle" style="display:none"></p>`;

    if (profileUrl) {
      const safeHref = escapeHtmlAttributeForHeader(profileUrl);
      hrHeaderText.innerHTML = `
      <a class="header-profile-link" href="${safeHref}" target="_blank" rel="noopener noreferrer">
        <h1 class="name" id="fullName">${nameInnerHtml}</h1>
        ${jobTitleBlock}
      </a>`;
    } else {
      hrHeaderText.innerHTML = `
      <h1 class="name" id="fullName">${nameInnerHtml}</h1>
      ${jobTitleBlock}`;
    }
  }

  // Contact info - render all items in one flow layout
  const contactInfoElement = document.getElementById("contactInfo");
  if (contactInfoElement) {
    contactInfoElement.innerHTML = "";

    // Email
    if (data.email) {
      const emailItem = document.createElement("a");
      emailItem.href = `mailto:${data.email}`;
      emailItem.className = "contact-item";
      emailItem.innerHTML = `
                <span class="icon">
                    <span class="iconify" data-icon="mdi:email"></span>
                </span>
                <span class="text">${data.email}</span>
            `;
      contactInfoElement.appendChild(emailItem);
    }

    // Location
    if (data.location) {
      const locationItem = document.createElement("span");
      locationItem.className = "contact-item";
      locationItem.setAttribute("data-contact-type", "location");
      locationItem.innerHTML = `
                <span class="icon">
                    <span class="iconify" data-icon="mdi:map-marker"></span>
                </span>
                <span class="text">${data.location}</span>
            `;
      contactInfoElement.appendChild(locationItem);
    }

    // Phone
    if (data.phone) {
      const phoneItem = document.createElement("a");
      // Remove whitespace so tel: href is a single continuous number
      phoneItem.href = `tel:${data.phone.replace(/\s/g, "")}`;
      phoneItem.className = "contact-item";
      phoneItem.innerHTML = `
                <span class="icon">
                    <span class="iconify" data-icon="mdi:phone-dial"></span>
                </span>
                <span class="text">${data.phone}</span>
            `;
      contactInfoElement.appendChild(phoneItem);
    }

    // References (links) — normalized data always has an array
    data.references.forEach((referenceEntry) => {
      const link = document.createElement("a");
      link.href = referenceEntry.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "contact-item";

      const iconContainer = document.createElement("span");
      iconContainer.className = "icon";

      // For GitHub, always use iconify icon instead of favicon
      const isGitHub = referenceEntry.url.includes("github.com");

      if (isGitHub) {
        // For GitHub, show iconify icon directly
        const fallbackIcon = document.createElement("span");
        fallbackIcon.className = "iconify";
        fallbackIcon.dataset.icon = getIconForLink(
          referenceEntry.url,
          referenceEntry.type,
        );
        fallbackIcon.setAttribute("aria-hidden", "true");
        iconContainer.appendChild(fallbackIcon);
      } else {
        // For other links, try favicon first, fallback to iconify
        const favicon = document.createElement("img");
        favicon.className = "favicon";
        favicon.src = getFaviconUrl(referenceEntry.url);
        favicon.alt = `${referenceEntry.text} favicon`;
        favicon.loading = "lazy";
        favicon.decoding = "async";

        const fallbackIcon = document.createElement("span");
        fallbackIcon.className = "iconify fallback-icon";
        fallbackIcon.dataset.icon = getIconForLink(
          referenceEntry.url,
          referenceEntry.type,
        );
        fallbackIcon.setAttribute("aria-hidden", "true");
        fallbackIcon.style.display = "none";

        favicon.addEventListener("error", () => {
          favicon.style.display = "none";
          fallbackIcon.style.display = "inline-flex";
        });

        iconContainer.appendChild(favicon);
        iconContainer.appendChild(fallbackIcon);
      }

      const textElement = document.createElement("span");
      textElement.className = "text";
      textElement.textContent = referenceEntry.text;

      link.appendChild(iconContainer);
      link.appendChild(textElement);

      contactInfoElement.appendChild(link);
    });
  }

  const headerAvatarContainer = document.getElementById("hrHeaderAvatar");
  if (headerAvatarContainer) {
    if (profileUrl) {
      const safeHref = escapeHtmlAttributeForHeader(profileUrl);
      const linkedInAriaLabel =
        currentLanguage === "ru" ? "Профиль в LinkedIn" : "LinkedIn profile";
      const safeAriaLabel = escapeHtmlAttributeForHeader(linkedInAriaLabel);
      headerAvatarContainer.innerHTML = `
      <a class="header-avatar-link" href="${safeHref}" target="_blank" rel="noopener noreferrer" aria-label="${safeAriaLabel}">
        <img id="avatar" src="" alt="Avatar" class="avatar">
      </a>`;
    } else {
      headerAvatarContainer.innerHTML = `
      <img id="avatar" src="" alt="Avatar" class="avatar">`;
    }
  }

  const avatar = document.getElementById("avatar");
  if (avatar && data.avatar) {
    loadOptimizedAvatar(avatar, data.avatar, data.firstName, data.lastName);
  }
}

/**
 * Render about section
 */
function renderAbout(data) {
  const aboutElement = document.getElementById("about");
  const content = parseLists(data.about || "");
  aboutElement.innerHTML = content || "<p></p>";
}

/**
 * Render expectation section
 */
function renderExpectation(data) {
  if (!data.expectation) {
    document.getElementById("expectationSection").style.display = "none";
    return;
  }

  document.getElementById("expectationSection").style.display = "";
  const expectationElement = document.getElementById("expectation");
  const content = parseLists(data.expectation);
  expectationElement.innerHTML = content || "<p></p>";
}

/**
 * Render languages section
 */
function renderLanguages(data) {
  const languagesElement = document.getElementById("languages");

  // Extract level from parentheses if exists, otherwise use full level
  const formatLanguageTag = (languageEntry) => {
    const levelMatch = languageEntry.level.match(/\(([^)]+)\)/);
    const levelText = levelMatch ? levelMatch[1] : languageEntry.level;
    return `${languageEntry.name} – ${levelText}`;
  };

  languagesElement.innerHTML = `
        <div class="skill-keywords">
            ${data.languages
              .map(
                (languageEntry) =>
                  `<span class="skill-keyword">${formatLanguageTag(languageEntry)}</span>`,
              )
              .join("\n            ")}
        </div>
    `;
}

/**
 * Render skills introduction text
 */
function renderSkillsIntro(data) {
  const skillsIntroElement = document.getElementById("skillsIntro");
  if (!skillsIntroElement) return;

  const intro = data.skillsIntro;
  if (!intro) return;
  skillsIntroElement.innerHTML = parseFormatting(intro);
}

/**
 * Render skills section
 */
function renderSkills(data) {
  const skillsElement = document.getElementById("skills");
  skillsElement.innerHTML = data.skills
    .map(
      (skillCategory) => `
        <div class="skill-category">
            <div class="skill-category-title">${skillCategory.category}</div>
            <div class="skill-keywords">
                ${skillCategory.keywords
                  .map(
                    (keyword) =>
                      `<span class="skill-keyword">${keyword}</span>`,
                  )
                  .join("")}
            </div>
        </div>
    `,
    )
    .join("");
}

/**
 * Render extra skills section
 */
function renderExtraSkills(data) {
  if (!data.extraSkills) {
    document.getElementById("extraSkillsSection").style.display = "none";
    return;
  }

  document.getElementById("extraSkillsSection").style.display = "";
  const extraSkillsElement = document.getElementById("extraSkills");
  const content = parseLists(data.extraSkills);
  extraSkillsElement.innerHTML = content || "<p></p>";
}

/**
 * Render interests section
 */
function renderInterests(data) {
  if (!data.interests) {
    document.getElementById("interestsSection").style.display = "none";
    return;
  }

  document.getElementById("interestsSection").style.display = "";
  const interestsElement = document.getElementById("interests");
  const content = parseLists(data.interests);
  interestsElement.innerHTML = content || "<p></p>";
}

/**
 * Adjust experience links position based on available width
 * Positions links in bottom-left of experience-content if they fit, otherwise keeps them at the bottom
 */
function adjustExperienceLinksPosition() {
  const experienceItems = document.querySelectorAll(".experience-item");

  experienceItems.forEach((experienceItemElement) => {
    const links = experienceItemElement.querySelector(".experience-links");
    const responsibilities =
      experienceItemElement.querySelector(".experience-responsibilities");
    const experienceContent =
      experienceItemElement.querySelector(".experience-content");

    if (!links || !responsibilities || !experienceContent) return;

    // Store current parent
    const currentParent = links.parentElement;
    const isInContent = currentParent === experienceContent;
    const isInResponsibilities = currentParent === responsibilities;

    // Always measure from bottom position to get natural width
    // Temporarily move to bottom if currently in responsibilities or content
    let wasMoved = false;
    if (isInResponsibilities || isInContent) {
      experienceItemElement.appendChild(links);
      wasMoved = true;
      // Force reflow to ensure accurate measurement
      void links.offsetWidth;
    }

    // Measure natural width of links (scrollWidth gives content width)
    const linksNaturalWidth = links.scrollWidth;

    // Measure available width in responsibilities column
    const responsibilitiesWidth = responsibilities.offsetWidth;

    // Check if links fit in responsibilities column (with small margin for safety)
    const margin = 5; // Small margin to account for rounding
    if (linksNaturalWidth <= responsibilitiesWidth - margin) {
      // Move links inside experience-content with absolute positioning
      if (!isInContent || links.parentElement !== experienceContent) {
        experienceContent.appendChild(links);
      }
    } else {
      // Keep links at the bottom (after experience-content)
      if (isInContent || wasMoved) {
        experienceItemElement.appendChild(links);
      }
    }
  });
}

/**
 * Render experience section
 */
function renderExperience(data) {
  const experienceElement = document.getElementById("experience");
  experienceElement.innerHTML = data.experience
    .map((experienceEntry) => {
      const companyUrl = getExperienceCompanyUrl(experienceEntry);
      const safeCompanyUrl = companyUrl
        ? // Escape double quotes for safe use inside HTML attribute values
          companyUrl.replace(/"/g, "&quot;")
        : "";
      const companyForAriaLabel = String(experienceEntry.company ?? "");
      // Escape &, <, > so company text is safe inside aria-label / interpolated HTML
      const companyForAriaLabelEscaped = companyForAriaLabel
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const siteLinkStretchLabel =
        currentLanguage === "ru"
          ? `Открыть сайт: ${companyForAriaLabelEscaped}`
          : `Open website: ${companyForAriaLabelEscaped}`;

      let linksHTML = "";
      if (experienceEntry.links && experienceEntry.links.length > 0) {
        linksHTML = `
                <div class="experience-links">
                    ${experienceEntry.links
                      .map(
                        (experienceLink) =>
                          `<a href="${experienceLink.url}" target="_blank" rel="noopener noreferrer" class="experience-link ${!experienceLink.description ? "experience-link--no-description" : ""}">
                            <div class="experience-link__preview">
                                <img
                                    src="${getFaviconUrl(experienceLink.url)}"
                                    alt="Favicon of ${getDomainFromUrl(experienceLink.url)}"
                                    class="experience-link__favicon"
                                    loading="eager"
                                    decoding="async"
                                    referrerpolicy="no-referrer"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';"
                                >
                                <span class="experience-link__fallback iconify" data-icon="${getIconForLink(experienceLink.url)}" aria-hidden="true" style="display: none;"></span>
                            </div>
                            <div class="experience-link__content">
                                <div class="experience-link__title">${experienceLink.title}</div>
                                ${experienceLink.description ? `<div class="experience-link__description">${parseFormatting(experienceLink.description)}</div>` : ""}
                            </div>
                        </a>`,
                      )
                      .join("")}
                </div>
            `;
      }

      let experienceAboutSection = "";
      if (experienceEntry.about) {
        const aboutBodyHtml = safeCompanyUrl
          ? parseListsNoLinks(experienceEntry.about)
          : parseLists(experienceEntry.about);
        experienceAboutSection = `<div class="experience-about">${aboutBodyHtml}</div>`;
      }

      return `
            <div class="experience-item">
                ${
                  safeCompanyUrl
                    ? `<div class="experience-header experience-header--has-site-link">
                    <a class="experience-header__stretch-link" href="${safeCompanyUrl}" target="_blank" rel="noopener noreferrer">
                      <span class="experience-header__stretch-link-label">${siteLinkStretchLabel}</span>
                    </a>
                    <div class="experience-header__surface">
                    <div class="experience-header__site-grid">
                    <span class="experience-company__favicon-wrap" aria-hidden="true">
                      <img
                        src="${getFaviconUrl(safeCompanyUrl)}"
                        alt=""
                        class="experience-company__favicon"
                        loading="eager"
                        decoding="async"
                        referrerpolicy="no-referrer"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';"
                      >
                      <span class="iconify experience-company__favicon-fallback" data-icon="mdi:link-variant" aria-hidden="true" style="display: none;"></span>
                    </span>`
                    : `<div class="experience-header">`
                }
                    <div class="experience-title-row">
                        <div class="experience-title-row__left">
                            <div class="experience-company">${experienceEntry.company}</div>
                            <div class="experience-position">${experienceEntry.position}</div>
                        </div>
                        <div class="experience-meta">
                            <span class="icon">
                                <span class="iconify" data-icon="mdi:calendar"></span>
                            </span>
                            <span>${experienceEntry.period}</span>
                        </div>
                    </div>
                    ${experienceAboutSection}
                ${safeCompanyUrl ? `</div></div></div>` : `</div>`}
                <div class="experience-content">
                    <div class="experience-responsibilities">
                        ${parseLists(experienceEntry.responsibilities)}
                    </div>
                    ${
                      experienceEntry.achievements
                        ? `
                        <div class="experience-achievements">
                            <div class="experience-achievements__header">
                                <span class="icon">
                                    <span class="iconify" data-icon="mdi:trophy"></span>
                                </span>
                                <span class="experience-achievements__title">${currentLanguage === "ru" ? "Ключевые достижения" : "Key Achievements"}</span>
                            </div>
                            <div class="experience-achievements__content">
                                ${parseLists(experienceEntry.achievements)}
                            </div>
                        </div>
                    `
                        : ""
                    }
                </div>
                ${linksHTML}
            </div>
        `;
    })
    .join("");

  // Adjust links position after rendering and images load
  // Use setTimeout to ensure DOM is fully rendered
  setTimeout(() => {
    adjustExperienceLinksPosition();

    // Also adjust after all images in links are loaded
    const linkImages = experienceElement.querySelectorAll(
      ".experience-link__favicon",
    );
    let imagesLoaded = 0;
    const totalImages = linkImages.length;

    if (totalImages === 0) {
      adjustExperienceLinksPosition();
    } else {
      linkImages.forEach((faviconImage) => {
        if (faviconImage.complete) {
          imagesLoaded++;
          if (imagesLoaded === totalImages) {
            adjustExperienceLinksPosition();
          }
        } else {
          faviconImage.addEventListener("load", () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
              adjustExperienceLinksPosition();
            }
          });
          faviconImage.addEventListener("error", () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
              adjustExperienceLinksPosition();
            }
          });
        }
      });
    }
  }, 0);
}

/**
 * Render projects section
 */
function renderProjects(data) {
  const projectsElement = document.getElementById("projects");
  const projectsSection = document.getElementById("projectsSection");

  // Hide section if no projects
  const hasProjects = data.projects.length > 0;
  if (!hasProjects) {
    if (projectsSection) {
      projectsSection.style.display = "none";
    }
    return;
  }

  // Show section if projects exist
  if (projectsSection) {
    projectsSection.style.display = "";
  }

  console.log(
    `[renderProjects] Начинаем рендеринг ${data.projects.length} проектов`,
  );

  const linksHTML = data.projects
    .map((projectEntry, projectIndex) => {
      console.log(
        `[renderProjects] Проект ${projectIndex + 1}: "${projectEntry.title}"`,
      );
      console.log(`[renderProjects] Ссылка проекта: ${projectEntry.link}`);

      const accessoryHTML =
        projectEntry.accessory &&
        (projectEntry.accessory.icon || projectEntry.accessory.value)
          ? `
            <div class="experience-link__accessory">
                ${projectEntry.accessory.icon ? `<span class="iconify experience-link__accessory-icon" data-icon="${projectEntry.accessory.icon}" aria-hidden="true"></span>` : ""}
                ${projectEntry.accessory.value ? `<div class="experience-link__accessory-value">${projectEntry.accessory.value}</div>` : ""}
            </div>
        `
          : "";

      return `
            <a href="${projectEntry.link}" target="_blank" rel="noopener noreferrer" class="experience-link ${!projectEntry.description ? "experience-link--no-description" : ""}">
                <div class="experience-link__preview">
                    <img
                        src="${getFaviconUrl(projectEntry.link)}"
                        alt="Favicon of ${getDomainFromUrl(projectEntry.link)}"
                        class="experience-link__favicon"
                        loading="eager"
                        decoding="async"
                        referrerpolicy="no-referrer"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';"
                    >
                    <span class="experience-link__fallback iconify" data-icon="${getIconForLink(projectEntry.link)}" aria-hidden="true" style="display: none;"></span>
                </div>
                <div class="experience-link__content">
                    <div class="experience-link__title">${projectEntry.title}</div>
                    ${projectEntry.description ? `<div class="experience-link__description">${parseFormatting(projectEntry.description)}</div>` : ""}
                </div>
                ${accessoryHTML}
            </a>
        `;
    })
    .join("");

  projectsElement.innerHTML = `
        <div class="experience-links">
            ${linksHTML}
        </div>
    `;
  console.log(`[renderProjects] Рендеринг завершен`);
}

/**
 * Render education section
 */
function renderEducation(data) {
  const educationElement = document.getElementById("education");
  educationElement.innerHTML = data.education
    .map(
      (educationEntry) => `
        <div class="education-item">
            <div class="education-degree">${educationEntry.degree}</div>
            <div class="education-university">${educationEntry.university}</div>
            <div class="education-period">
                <span class="icon">
                    <span class="iconify" data-icon="mdi:calendar"></span>
                </span>
                <span>${educationEntry.period}</span>
            </div>
        </div>
    `,
    )
    .join("");
}

/**
 * Render education & languages section (combined)
 */
function renderEducationLanguages(data) {
  const educationLanguagesElement =
    document.getElementById("educationLanguages");
  const educationLanguagesSection = document.getElementById(
    "educationLanguagesSection",
  );

  const hasEducation = data.education.length > 0;

  // Always show section (even if no education, we show languages)
  if (educationLanguagesSection) {
    educationLanguagesSection.style.display = "";
  }

  // Update section title based on education presence
  const educationLanguagesTitleElement =
    educationLanguagesSection?.querySelector(".section-title");
  if (educationLanguagesTitleElement) {
    const titleRu = hasEducation
      ? educationLanguagesTitleElement.getAttribute("data-title-ru")
      : educationLanguagesTitleElement.getAttribute("data-title-no-edu-ru");
    const titleEn = hasEducation
      ? educationLanguagesTitleElement.getAttribute("data-title-en")
      : educationLanguagesTitleElement.getAttribute("data-title-no-edu-en");
    const iconElement = educationLanguagesTitleElement.querySelector(".icon");
    const hasAccentClass =
      educationLanguagesTitleElement.classList.contains("accent-green");

    if (iconElement && titleRu && titleEn) {
      const title = currentLanguage === "ru" ? titleRu : titleEn;
      educationLanguagesTitleElement.innerHTML =
        iconElement.outerHTML + " " + title;
      if (hasAccentClass) {
        educationLanguagesTitleElement.classList.add("accent-green");
      }
    }
  }

  // Extract level from parentheses if exists, otherwise use full level
  const formatLanguageTag = (languageEntry) => {
    const levelMatch = languageEntry.level.match(/\(([^)]+)\)/);
    const levelText = levelMatch ? levelMatch[1] : languageEntry.level;
    return `${languageEntry.name} – ${levelText}`;
  };

  let content = "";

  if (data.education.length > 0) {
    content += data.education
      .map(
        (educationEntry) => `
            <div class="education-item">
                <div class="education-degree">${educationEntry.degree}</div>
                <div class="education-university">${educationEntry.university}</div>
                <div class="education-period">
                    <span class="icon">
                        <span class="iconify" data-icon="mdi:calendar"></span>
                    </span>
                    <span>${educationEntry.period}</span>
                </div>
            </div>
        `,
      )
      .join("");
  }

  if (data.languages.length > 0) {
    if (content) {
      content += '<div style="margin-top: 12px;"></div>';
    }
    content += `
            <div class="skill-keywords">
                ${data.languages
                  .map(
                    (languageEntry) =>
                      `<span class="skill-keyword">${formatLanguageTag(languageEntry)}</span>`,
                  )
                  .join("\n                ")}
            </div>
        `;
  }

  educationLanguagesElement.innerHTML = content || "<p></p>";
}

// ==================== Main Init Function ====================

/**
 * Load resume data from JSON and render
 */
async function loadResumeData(language = currentLanguage) {
  const config = getLanguageConfig(language);

  try {
    // Local dev: try API first; static hosting (GitHub Pages): use JSON from /data only
    let response = null;
    if (isLocalDevResumeServer()) {
      const apiUrl = `/api/resume?lang=${encodeURIComponent(language)}`;
      response = await fetch(apiUrl, { cache: "no-cache" }).catch(() => null);
    }

    if (!response || !response.ok) {
      if (isLocalDevResumeServer()) {
        console.log(
          `API unavailable, trying static file: ${config.staticPath}`,
        );
      }
      response = await fetch(config.staticPath, { cache: "no-cache" }).catch(
        (fetchError) => {
          console.error(
            `Failed to fetch static file ${config.staticPath}:`,
            fetchError,
          );
          throw new Error(
            `Failed to load resume data from ${config.staticPath}. Make sure the file exists and the build process completed successfully.`,
          );
        },
      );

      if (!response || !response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}. Failed to load ${config.staticPath}`,
        );
      }
    }

    const data = await response.json();
    const normalized = normalizeResumeData(data);

    currentLanguage = language;
    currentResumeData = normalized; // Store resume data for PDF filename generation

    persistLanguage(language);
    setDocumentLanguage(config);

    toggleLanguageSwitcherVisibility(normalized.hasMultilanguageFields);

    if (normalized.hasMultilanguageFields) {
      updateLanguageSwitcherUI(language);
    }

    updatePdfButtonText(language);
    updateSectionTitles(language);
    updatePdfButtonLink(); // Update PDF link when language changes
    updateBrowserUrl(); // Sync URL with current language

    // Apply accent colors from TOML
    applyAccentColors();

    // Render all sections
    renderHeader(normalized);
    renderAbout(normalized);
    renderExpectation(normalized);
    renderSkillsIntro(normalized);
    renderSkills(normalized);
    renderExtraSkills(normalized);
    renderInterests(normalized);
    renderExperience(normalized);
    renderProjects(normalized);
    renderEducationLanguages(normalized);

    if (window.AtsLayout && typeof window.AtsLayout.render === "function") {
      window.AtsLayout.render(normalized, { language: currentLanguage });
    } else {
      console.warn("AtsLayout renderer is not available");
    }

    console.log("Resume data loaded successfully!");
  } catch (error) {
    console.error(
      `Error loading resume data for language "${language}":`,
      error,
    );
    if (isLocalDevResumeServer()) {
      console.error(`Tried API: /api/resume?lang=${language}`);
    }
    console.error(`Tried static file: ${config.staticPath}`);

    const apiLine = isLocalDevResumeServer()
      ? `<li>API: /api/resume?lang=${language}</li>`
      : "";

    // Show error message to user
    document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: sans-serif;">
                <h1 style="color: #E53935;">Error Loading Resume</h1>
                <p>Could not load resume data. Tried:</p>
                <ul style="text-align: left; display: inline-block; color: #666;">
                    ${apiLine}
                    <li>Static file: ${config.staticPath}</li>
                </ul>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">Error: ${error.message}</p>
                <p style="color: #999; font-size: 12px; margin-top: 10px;">Please check the browser console for more details.</p>
            </div>
        `;
  }
}

// ==================== Initialize on Page Load ====================

// Wait for DOM to be fully loaded
function initializeResume() {
  const initialLanguage = getInitialLanguage();
  currentLanguage = initialLanguage;

  const initialConfig = getLanguageConfig(initialLanguage);
  setDocumentLanguage(initialConfig);
  updatePdfButtonText(initialLanguage);
  updateSectionTitles(initialLanguage);
  updatePdfButtonLink(); // Initialize PDF button link
  initThemeToggle();
  initLanguageSwitcher();
  initViewModeSwitcher();
  // Language switcher visibility will be set after data is loaded
  loadResumeData(initialLanguage);

  // Adjust experience links position on window resize
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      adjustExperienceLinksPosition();
    }, 100);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeResume);
} else {
  initializeResume();
}

/**
 * Normalize resume data to expected structure and defaults.
 * After this, render code may assume: arrays are arrays; optional text fields are undefined or non-empty string.
 */
function normalizeResumeData(data) {
  const src = data && typeof data === "object" ? data : {};

  const optionalString = (value) => {
    if (value == null || typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const trimStringFields = (obj) => {
    if (obj == null || typeof obj !== "object") return obj;
    const trimmed = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === "string") {
        trimmed[key] = value.trim();
      } else if (Array.isArray(value)) {
        trimmed[key] = value.map((element) =>
          typeof element === "string"
            ? element.trim()
            : trimStringFields(element),
        );
      } else if (value !== null && typeof value === "object") {
        trimmed[key] = trimStringFields(value);
      } else {
        trimmed[key] = value;
      }
    }
    return trimmed;
  };

  let normalizedAccentColor;
  if (src.accentColor) {
    if (typeof src.accentColor === "string") {
      normalizedAccentColor = String(src.accentColor).trim();
    } else {
      normalizedAccentColor = trimStringFields(src.accentColor);
    }
  } else {
    normalizedAccentColor = undefined;
  }

  return {
    avatar: src.avatar,
    firstName: src.firstName != null ? String(src.firstName).trim() : undefined,
    lastName: src.lastName != null ? String(src.lastName).trim() : undefined,
    jobTitle: typeof src.jobTitle === "string" ? src.jobTitle.trim() : "",
    email: src.email != null ? String(src.email).trim() : undefined,
    phone: src.phone != null ? String(src.phone).trim() : undefined,
    location: typeof src.location === "string" ? src.location.trim() : "",
    references: (Array.isArray(src.references) ? src.references : []).map(
      (referenceEntry) => trimStringFields(referenceEntry),
    ),
    about: typeof src.about === "string" ? src.about.trim() : "",
    expectation: optionalString(src.expectation),
    languages: (Array.isArray(src.languages) ? src.languages : []).map(
      (languageEntry) => trimStringFields(languageEntry),
    ),
    skillsIntro: optionalString(src.skillsIntro),
    skills: (Array.isArray(src.skills) ? src.skills : []).map((skillCategory) =>
      trimStringFields(skillCategory),
    ),
    extraSkills: optionalString(src.extraSkills),
    interests: optionalString(src.interests),
    experience: (Array.isArray(src.experience) ? src.experience : []).map(
      (experienceEntry) => trimStringFields(experienceEntry),
    ),
    projects: (Array.isArray(src.projects) ? src.projects : []).map(
      (projectEntry) => trimStringFields(projectEntry),
    ),
    education: (Array.isArray(src.education) ? src.education : []).map(
      (educationEntry) => trimStringFields(educationEntry),
    ),
    accentColor: normalizedAccentColor,
    hasMultilanguageFields: src.hasMultilanguageFields ?? true,
  };
}
