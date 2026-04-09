/**
 * Shared multilanguage TOML → plain object helpers (Node: server, build, generate-pdfs).
 */

/**
 * Check if TOML data contains any language-specific fields (with .ru or .en suffix)
 */
function hasMultilanguageFields(data) {
  function checkObject(obj) {
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      if (key.match(/^(.+)\.([a-z]{2})$/)) {
        return true;
      }

      const value = obj[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            if (checkObject(item)) return true;
          }
        }
      } else if (typeof value === "object" && value !== null) {
        if (checkObject(value)) return true;
      }
    }
    return false;
  }

  return checkObject(data);
}

/**
 * Localize resume data from multilanguage TOML
 * Extracts values for the specified language from keys like "propertyName.language"
 * Fields without language suffix are used for all languages
 */
function localizeResumeData(data, lang) {
  const result = {};

  function processObject(obj, targetObj) {
    const langSpecificKeys = new Set();
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      const match = key.match(/^(.+)\.([a-z]{2})$/);
      if (match) {
        const [, propName, keyLang] = match;
        if (keyLang === lang) {
          langSpecificKeys.add(propName);
        }
      }
    }

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];

      const match = key.match(/^(.+)\.([a-z]{2})$/);
      if (match) {
        const [, propName, keyLang] = match;
        if (keyLang === lang) {
          targetObj[propName] =
            typeof value === "string" ? value.trim() : value;
        }
      } else {
        if (langSpecificKeys.has(key)) {
          continue;
        }

        if (Array.isArray(value)) {
          if (
            value.length > 0 &&
            typeof value[0] === "object" &&
            value[0] !== null
          ) {
            targetObj[key] = value.map((item) => {
              const processedItem = {};
              processObject(item, processedItem);
              return processedItem;
            });
          } else {
            targetObj[key] = value.map((element) =>
              typeof element === "string" ? element.trim() : element,
            );
          }
        } else if (typeof value === "object" && value !== null) {
          targetObj[key] = {};
          processObject(value, targetObj[key]);
        } else {
          targetObj[key] = typeof value === "string" ? value.trim() : value;
        }
      }
    }
  }

  processObject(data, result);
  return result;
}

module.exports = { hasMultilanguageFields, localizeResumeData };
