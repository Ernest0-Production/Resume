(function (window) {
    'use strict';

    /**
     * Parse text formatting for ATS-friendly mode (bold, italic)
     * Supports: **bold**, *italic*, __bold__ (underscore becomes bold)
     */
    function parseFormattingAts(text) {
        if (!text) return '';

        return (
          text
            // **text** -> bold
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            // __text__ -> bold (ATS treats underscore pairs as bold)
            .replace(/__([^_]+)__/g, "<strong>$1</strong>")
            // *text* -> italic
            .replace(/\*([^*]+)\*/g, "<em>$1</em>")
            // Single newlines -> <br>
            .replace(/\n/g, "<br>")
        );
    }

    function stripMarkdownSyntax(text = '') {
        if (!text) return '';
        return (
          text
            // Normalize Windows newlines to LF before other stripping
            .replace(/\r\n/g, "\n")
            // Remove markdown images ![alt](url)
            .replace(/!\[[^\]]*]\([^)]*\)/g, "")
            // Markdown links [label](url) -> visible label only
            .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
            // Inline code `code` or ``code`` -> inner text
            .replace(/`{1,2}([^`]+)`{1,2}/g, "$1")
            // Strikethrough ~~text~~ -> plain text
            .replace(/~~([^~]+)~~/g, "$1")
            // **bold** markers -> inner text
            .replace(/\*\*([^*]+)\*\*/g, "$1")
            // __bold__ markers -> inner text
            .replace(/__([^_]+)__/g, "$1")
            // *italic* markers -> inner text
            .replace(/\*([^*]+)\*/g, "$1")
            // _italic_ markers -> inner text
            .replace(/_([^_]+)_/g, "$1")
        );
    }

    function stripLineMarkers(line = '') {
      // Remove leading bullet or numbered-list prefix
      return line.replace(/^\s*(?:[-•*◦▪▫]\s+|\d+\.\s+)/, "").trim();
    }

    function escapeHTML(text = '') {
        return (
          text
            // Escape & for HTML text nodes
            .replace(/&/g, "&amp;")
            // Escape < for HTML text nodes
            .replace(/</g, "&lt;")
            // Escape > for HTML text nodes
            .replace(/>/g, "&gt;")
            // Escape double quotes inside attributes
            .replace(/"/g, "&quot;")
            // Escape apostrophe for HTML text/attributes
            .replace(/'/g, "&#39;")
        );
    }

    function renderPlainStructuredText(text) {
        if (!text) return '';

        const blocks = [];
        let currentListItems = [];
        let currentListType = null;

        function flushList() {
            if (currentListItems.length === 0) return;
            const tag = currentListType === 'ol' ? 'ol' : 'ul';
            const items = currentListItems.map(item => `<li>${item}</li>`).join('');
            blocks.push(`<${tag}>${items}</${tag}>`);
            currentListItems = [];
            currentListType = null;
        }

        function pushListItem(rawLine, type) {
          const cleaned = stripLineMarkers(rawLine);
          // Collapse internal whitespace to single spaces after ATS formatting
          const formatted = parseFormattingAts(cleaned)
            .replace(/\s+/g, " ")
            .trim();
          if (!formatted) return;
          if (currentListType && currentListType !== type) {
            flushList();
          }
          currentListType = type;
          currentListItems.push(formatted);
        }

        text.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                flushList();
                return;
            }

            const isBullet = /^[-•*◦▪▫]\s+/.test(trimmed);
            const isNumbered = /^\d+\.\s+/.test(trimmed);

            if (isBullet) {
                pushListItem(line, 'ul');
            } else if (isNumbered) {
                pushListItem(line, 'ol');
            } else {
              flushList();
              // Collapse whitespace in paragraph lines after ATS formatting
              const formatted = parseFormattingAts(trimmed)
                .replace(/\s+/g, " ")
                .trim();
              if (formatted) {
                blocks.push(`<p>${formatted}</p>`);
              }
            }
        });

        flushList();
        return blocks.join('');
    }

    function renderAtsExperienceItem(experienceEntry = {}, language) {
      const company = escapeHTML(experienceEntry.company || "");
      const companyUrl = getExperienceCompanyUrl(experienceEntry);
      const safeCompanyUrl = companyUrl ? escapeHTML(companyUrl) : "";
      const companyHTML = `<span class="ats-experience__company">${company}</span>`;
      // Flatten newlines in about, then strip markdown, then normalize spaces
      const aboutText = stripMarkdownSyntax(
        (experienceEntry.about || "").replace(/\n+/g, " "),
      )
        .replace(/\s+/g, " ")
        .trim();
      const position = escapeHTML(experienceEntry.position || "");
      const period = experienceEntry.period
        ? escapeHTML(experienceEntry.period)
        : "";

      const responsibilitiesHTML = experienceEntry.responsibilities
        ? renderPlainStructuredText(experienceEntry.responsibilities)
        : "";

      let achievementsHTML = "";
      if (experienceEntry.achievements) {
        const achievementsContent = renderPlainStructuredText(
          experienceEntry.achievements,
        );
        const achievementsLabel =
          language === "ru" ? "Основные достижения:" : "Key Achievements:";
        achievementsHTML = `<div class="ats-experience__achievements">
                <div class="ats-experience__achievements-label">${achievementsLabel}</div>
                ${achievementsContent}
            </div>`;
      }

      const companyRowInner = `
                <span class="ats-experience__company-wrapper">
                    <span class="iconify ats-experience__company-icon" data-icon="mdi:flag-variant" aria-hidden="true"></span>
                    ${companyHTML}
                    ${position ? ` <span class="ats-experience__separator">•</span> <span class="ats-experience__position">${position}</span>` : ""}
                </span>
                ${period ? `<span class="ats-experience__period">${period}</span>` : ""}`;

      const aboutRowHTML = aboutText
        ? `<div class="ats-experience__row"><span class="ats-experience__company-about">${escapeHTML(aboutText)}</span></div>`
        : "";

      const experienceHeaderHTML = safeCompanyUrl
        ? `<a class="ats-experience__header-link" href="${safeCompanyUrl}" target="_blank" rel="noopener noreferrer">
                <div class="ats-experience__row ats-experience__row--company">${companyRowInner}</div>
                ${aboutRowHTML}
            </a>`
        : `<div class="ats-experience__row ats-experience__row--company">${companyRowInner}</div>${aboutRowHTML}`;

      return `
            <article class="ats-experience__item">
                ${experienceHeaderHTML}
                ${responsibilitiesHTML}
                ${achievementsHTML}
            </article>
        `;
    }

    function renderAtsEducationItem(educationEntry = {}) {
      const degree = escapeHTML(educationEntry.degree || "");
      const university = escapeHTML(educationEntry.university || "");
      const period = educationEntry.period
        ? escapeHTML(educationEntry.period)
        : "";

      if (!degree && !university && !period) return "";

      return `
            <article class="ats-education__item">
                ${
                  degree
                    ? `<div class="ats-education__row">
                    <span class="ats-education__degree">${degree}</span>
                    ${period ? `<span class="ats-education__period">${period}</span>` : ""}
                </div>`
                    : ""
                }
                ${university ? `<div class="ats-education__row"><span class="ats-education__university">${university}</span></div>` : ""}
            </article>
        `;
    }

    /**
     * Telegram / etc.: иконка (favicon или mdi) + текстовая ссылка для ATS-шапки.
     */
    function renderAtsHeaderReferenceLink(containerElement, referenceEntry) {
      if (!containerElement) return;

      if (!referenceEntry || !referenceEntry.url) {
        containerElement.textContent = "";
        containerElement.style.display = "none";
        return;
      }

      containerElement.innerHTML = "";

      const iconContainer = document.createElement("span");
      iconContainer.className = "ats-header__icon";

      const favicon = document.createElement("img");
      favicon.className = "ats-header__favicon";
      favicon.src = getFaviconUrl(referenceEntry.url);
      favicon.alt = `${referenceEntry.text || referenceEntry.url} favicon`;
      favicon.loading = "lazy";
      favicon.decoding = "async";
      favicon.referrerPolicy = "no-referrer";

      const fallbackIcon = document.createElement("span");
      fallbackIcon.className = "iconify";
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

      const link = document.createElement("a");
      link.href = referenceEntry.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = referenceEntry.text || referenceEntry.url;

      containerElement.appendChild(iconContainer);
      containerElement.appendChild(link);
      containerElement.style.display = "";
    }

    function renderAtsLayout(data, options = {}) {
        if (!data) return;

        const language = options.language || 'ru';

        const atsHeaderLeft = document.getElementById("atsHeaderLeft");
        const emailElement = document.getElementById('atsEmail');
        const phoneElement = document.getElementById('atsPhone');
        const locationElement = document.getElementById('atsLocation');
        const telegramElement = document.getElementById("atsTelegram");
        const aboutElement = document.getElementById('atsAbout');
        const skillsElement = document.getElementById('atsSkills');
        const experienceElement = document.getElementById('atsExperience');
        const educationElement = document.getElementById('atsEducation');
        const languagesElement = document.getElementById('atsLanguages');

        if (atsHeaderLeft) {
          const nameParts = [data.firstName, data.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          const escapedName = escapeHTML(nameParts);
          const hasJobTitle = Boolean(data.jobTitle);
          const escapedJobTitle = hasJobTitle ? escapeHTML(data.jobTitle) : "";
          const linkedInReferenceEntry = (data.references || []).find(
            (referenceEntry) =>
              referenceEntry.url && referenceEntry.url.includes("linkedin.com"),
          );
          const profileUrl =
            linkedInReferenceEntry && linkedInReferenceEntry.url
              ? String(linkedInReferenceEntry.url).trim()
              : "";

          const jobTitleBlock = hasJobTitle
            ? `<p class="ats-header__title" id="atsJobTitle">${escapedJobTitle}</p>`
            : `<p class="ats-header__title" id="atsJobTitle" style="display:none"></p>`;

          if (profileUrl) {
            const safeHref = escapeHTML(profileUrl);
            atsHeaderLeft.innerHTML = `
      <a class="ats-header__profile-link" href="${safeHref}" target="_blank" rel="noopener noreferrer">
        <h1 class="ats-header__name" id="atsFullName">${escapedName}</h1>
        ${jobTitleBlock}
      </a>`;
          } else {
            atsHeaderLeft.innerHTML = `
      <h1 class="ats-header__name" id="atsFullName">${escapedName}</h1>
      ${jobTitleBlock}`;
          }
        }

        if (emailElement) {
            if (data.email) {
                emailElement.innerHTML = `
                    <a href="mailto:${data.email}">
                        <span class="ats-header__icon">
                            <span class="iconify" data-icon="mdi:email" aria-hidden="true"></span>
                        </span>
                        ${data.email}
                    </a>
                `;
                emailElement.style.display = '';
            } else {
                emailElement.textContent = '';
                emailElement.style.display = 'none';
            }
        }

        if (phoneElement) {
            if (data.phone) {
              // Remove spaces from phone number for a valid tel: URI
              const phoneForTelHref = data.phone.replace(/\s/g, "");
              phoneElement.innerHTML = `
                    <a href="tel:${phoneForTelHref}">
                        <span class="ats-header__icon">
                            <span class="iconify" data-icon="mdi:phone-dial" aria-hidden="true"></span>
                        </span>
                        ${data.phone}
                    </a>
                `;
              phoneElement.style.display = "";
            } else {
                phoneElement.textContent = '';
                phoneElement.style.display = 'none';
            }
        }

        if (locationElement) {
            if (data.location) {
                locationElement.innerHTML = `
                    <span class="ats-header__icon">
                        <span class="iconify" data-icon="mdi:map-marker" aria-hidden="true"></span>
                    </span>
                    <span>${data.location}</span>
                `;
                locationElement.style.display = '';
            } else {
                locationElement.textContent = '';
                locationElement.style.display = 'none';
            }
        }

        if (telegramElement) {
          const telegramRef = data.references.find(
            (referenceEntry) =>
              referenceEntry.type === "telegram" ||
              (referenceEntry.url && referenceEntry.url.includes("t.me")),
          );
          renderAtsHeaderReferenceLink(telegramElement, telegramRef);
        }

        if (aboutElement) {
            let aboutSource = data.about || '';
            if (data.extraSkills) {
                const extraSkillsLabel = language === 'ru' ? 'Extra Skills:' : 'Extra Skills:';
                aboutSource = aboutSource
                    ? `${aboutSource}\n\n${extraSkillsLabel}\n${data.extraSkills}`
                    : `${extraSkillsLabel}\n${data.extraSkills}`;
            }
            aboutElement.innerHTML = renderPlainStructuredText(aboutSource);
        }

        if (skillsElement) {
            const flattenedSkills = [];
            data.skills.forEach((skill) => {
              skill.keywords.forEach((keyword) => {
                const cleaned = stripLineMarkers(
                  stripMarkdownSyntax(keyword || ""),
                );
                if (cleaned) {
                  flattenedSkills.push(cleaned);
                }
              });
            });
            const uniqueSkills = [...new Set(flattenedSkills)];
            skillsElement.textContent = uniqueSkills.join(' • ');
        }

        if (experienceElement) {
            const experienceHTML = data.experience
              .map((experienceEntry) =>
                renderAtsExperienceItem(experienceEntry, language),
              )
              .join("");
            experienceElement.innerHTML = experienceHTML || '';
        }

        if (educationElement) {
            const educationSection = document.getElementById('atsEducationSection');
            const hasEducation = data.education.length > 0;

            if (hasEducation) {
                const educationHTML = data.education
                  .map((educationEntry) =>
                    renderAtsEducationItem(educationEntry),
                  )
                  .join("");
                educationElement.innerHTML = educationHTML || '';
                if (educationSection) {
                    educationSection.style.display = '';
                }
            } else {
                educationElement.innerHTML = '';
                if (educationSection) {
                    educationSection.style.display = 'none';
                }
            }
        }

        if (languagesElement) {
            if (data.languages.length > 0) {
              const languagesHTML = data.languages
                .map((languageEntry) => {
                  const name = escapeHTML(languageEntry.name || "");
                  const level = escapeHTML(languageEntry.level || "");
                  return name && level
                    ? `${name} – ${level}`
                    : name || level || "";
                })
                .filter(Boolean)
                .join(", ");
              languagesElement.textContent = languagesHTML || "";
            } else {
              languagesElement.textContent = "";
            }
        }
    }

    window.AtsLayout = {
      render: renderAtsLayout,
    };
})(window);

