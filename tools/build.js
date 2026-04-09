const fs = require("fs");
const path = require("path");
const TOML = require("@iarna/toml");
const { pathForLog } = require("../path-for-log");
const {
  hasMultilanguageFields,
  localizeResumeData,
} = require("../lib/resume-localize");

const PROJECT_ROOT = path.join(__dirname, "..");

/**
 * Build static JSON files from TOML for GitHub Pages
 */
function build() {
  const tomlPath = path.join(PROJECT_ROOT, "resume.toml");
  const outputDir = path.join(PROJECT_ROOT, "data");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const tomlContent = fs.readFileSync(tomlPath, "utf8");
  const parsedToml = TOML.parse(tomlContent);

  const hasMultilang = hasMultilanguageFields(parsedToml);

  const languages = ["ru", "en"];
  languages.forEach((lang) => {
    const localized = localizeResumeData(parsedToml, lang);
    localized.hasMultilanguageFields = hasMultilang;
    const jsonPath = path.join(outputDir, `resume-${lang}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(localized, null, 2), "utf8");
    console.log(`✅ Generated ${pathForLog(jsonPath)}`);
  });

  console.log("\n✅ Build completed successfully!");
}

try {
  build();
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
