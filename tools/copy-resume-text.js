const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const TOML = require("@iarna/toml");

const PROJECT_ROOT = path.join(__dirname, "..");

function stripMarkdown(text) {
  if (typeof text !== "string") return "";

  return text
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[\t ]*[-*+]\s+/gm, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function copyToClipboard(value) {
  return spawnSync("pbcopy", { input: value, encoding: "utf8" });
}

function buildCompaniesText(experience) {
  return experience
    .map((company) => {
      const companyName = stripMarkdown(company.company || "");
      const responsibilitiesRu = stripMarkdown(
        company["responsibilities.ru"] || "",
      );
      const achievementsRu = stripMarkdown(company["achievements.ru"] || "");

      return [
        companyName,
        "",
        "### Обязанности:",
        responsibilitiesRu,
        "",
        "### Основные достижения:",
        achievementsRu,
      ].join("\n");
    })
    .join("\n\n---------------\n\n");
}

function buildIntroText(data) {
  const aboutRu = stripMarkdown(data["about.ru"] || "");
  const expectationRu = stripMarkdown(data["expectation.ru"] || "");
  const extraSkillsRu = stripMarkdown(data["extraSkills.ru"] || "");

  return [
    "",
    "### Немного о себе:",
    "",
    aboutRu,
    "",
    "### Чего хочу & к чему готов:",
    "",
    expectationRu,
    "",
    "### Про навыки:",
    "",
    "Опуская базовые навыки, также подчеркну следующие:",
    extraSkillsRu,
  ].join("\n");
}

function main() {
  const tomlPath = path.join(PROJECT_ROOT, "resume.toml");
  const content = fs.readFileSync(tomlPath, "utf8");
  const data = TOML.parse(content);

  if (!Array.isArray(data.experience) || data.experience.length === 0) {
    throw new Error("В resume.toml не найден блок [[experience]].");
  }

  const introText = buildIntroText(data);
  const companiesText = buildCompaniesText(data.experience);
  const result = [introText, "", "---------------", "", companiesText].join(
    "\n",
  );
  const clipboardResult = copyToClipboard(result);

  if (clipboardResult.status !== 0) {
    const stderr =
      clipboardResult.stderr || "Неизвестная ошибка буфера обмена.";
    throw new Error(`Не удалось скопировать в буфер обмена: ${stderr}`);
  }

  console.log("✅ Текст резюме сгенерирован и скопирован в буфер обмена.");
  console.log(`Компаний: ${data.experience.length}`);
}

try {
  main();
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}
