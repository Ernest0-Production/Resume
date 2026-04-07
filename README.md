# CV Generator

Static HTML resume site with PDF export capability. This project allows you to maintain your resume data in a structured TOML format and automatically generates a beautiful, printable HTML resume.

## 📋 Features

- ✅ **TOML-based data structure** - Easy to update and maintain
- ✅ **Multilanguage support** - Single file with language-specific properties (Russian and English)
- ✅ **Two view modes** - Switch between HR-friendly and ATS-friendly resume formats
- ✅ **PDF export** - Export your resume as PDF
- ✅ **Text formatting support** - Bold, italic, and underline in content
- ✅ **OpenGraph support** - Automatically generated OpenGraph image for social media

## 🚀 Quick Start

### Prerequisites

- Node.js (version 12 or higher)

### Installation & Running

1. Navigate to the project directory:
```bash
cd <path/to/repository>
```

2. Install dependencies:
```bash
npm install
```

3. Start the local server:
```bash
npm start
```

4. The server will automatically start and open your resume in the browser at `http://localhost:3000`

### Alternative Start Commands

```bash
npm run dev           # Same as npm start
npm run serve         # Same as npm start
npm run build         # Build JSON data files and OG image for github pages
npm run generate-pdfs # Generate all PDF variants for github pages
npm run og-image      # Generate only the OpenGraph image for github pages
npm run copy-resume-text # Build plain-text RU summary and copy to clipboard
```

## 📝 Editing Your Resume

### Step 1: Edit the TOML file

Open `resume.toml` in the project root and update it with your information. The file uses a multilanguage format where language-specific properties use the format `"propertyName.language"`:

```toml
# Configuration
# Accent color (single color for all themes)
accentColor = "#0FB981"
# Or different colors for light and dark themes
accentColor.light = "#64B5F6"
accentColor.dark = "#2196F3"

# Common properties (same for all languages)
avatar = "avatar.jpg" # or remote URL (e.g., "https://example.com/avatar.jpg")
lastName = "Your last name"
email = "your.email@example.com"
phone = "+7 (926) 188-11-22"

# Multilanguage properties
"firstName.ru" = "Ваше имя"
"firstName.en" = "Your first name"

"jobTitle.ru" = "Ваша должность"
"jobTitle.en" = "Your job title"

"location.ru" = "Ваше местоположение"
"location.en" = "Your location"

"about.ru" = "Ваша биография"
"about.en" = "Your bio"

"expectation.ru" = "Ваши ожидания"
"expectation.en" = "Your expectations"

# References (same for all languages)
[[references]]
type = "website" # website/telegram/github
url  = "https://..."
text = "Display text"

# Languages section (same for all languages)
[[languages]]
name = "Language name"
level = "Proficiency level"

# Skills (same for all languages)
[[skills]]
category    = "Skill category"
description = "Category description"
keywords    = ["skill1", "skill2", "..."]

"extraSkills.ru" = ["Дополнительный навык 1", "Дополнительный навык 2"]
"extraSkills.en" = ["Additional skill 1", "Additional skill 2"]

# Experience with multilanguage fields
[[experience]]
position = "Job title"
company  = "Company name"
url      = "https://company.com..."
period   = "MM/YYYY - MM/YYYY"

"about.ru" = "О компании/проекте"
"about.en" = "About company/project"

"responsibilities.ru" = "Ваши обязанности"
"responsibilities.en" = "Your responsibilities"

"achievements.ru" = "Ваши достижения"
"achievements.en" = "Your achievements"

[[experience.links]]
title = "Link title"
url   = "https://..."

# Projects with multilanguage description
[[projects]]
title = "Project name"
link  = "https://..."

"description.ru" = "Описание проекта"
"description.en" = "Project description"

# Optional: accessory (e.g. downloads count, popularity) – iconify name like "mdi:star"
accessory = { icon = "mdi:download", value = "455" }

# Education with multilanguage fields
[[education]]
period = "YYYY - YYYY"

"degree.ru" = "Название степени"
"degree.en" = "Degree name"

"university.ru" = "Название университета"
"university.en" = "University name"
```

### Multilanguage Properties

The following properties support multiple languages using the `"propertyName.language"` format:
- `firstName`, `lastName`, `jobTitle`, `location`
- `about`, `expectation`, `skillsIntro`
- `extraSkills` (array)
- `experience.about`, `experience.responsibilities`, `experience.achievements`
- `projects.description`
- `education.degree`, `education.university`

Properties without a language suffix (like `avatar`, `email`, `references`, `languages`, `skills`) are shared across all languages.

## 💡 Tips

### Text Formatting

You can use the following formatting in any text field:

- `**text**` - Makes text **bold**
- `*text*` - Makes text *italic*
- `__text__` - Makes text <u>underlined</u>

Example:
```toml
about = "I have **10 years** of experience in *web development*."
```

### Query Parameters

Open with specific language:
- `https://username.github.io/Resume/?lang=ru` - Russian version
- `https://username.github.io/Resume/?lang=en` - English version

Open with specific view mode:
- `https://username.github.io/Resume/?tab=ats` - Russian version, ATS-friendly view
- `https://username.github.io/Resume/?tab=hr` - English version, HR-friendly view

Combine with language and view mode:
- `https://username.github.io/Resume/?lang=ru&tab=ats` - Russian version, ATS-friendly view

## 🎛️ Interface

The interface includes several controls:

- **View mode switcher** - Switch between HR-friendly and ATS-friendly resume formats
- **PDF download button** - Download your resume as PDF
- **Theme toggle** - Switch between light and dark themes
- **Language switcher** - Quick switch between Russian and English

All settings (language, theme, view mode) are saved in your browser and restored on your next visit.

## 📁 Project Structure

```bash
cv-generator/
├── index.html          # Main HTML structure
├── styles.hr.css       # HR-friendly mode styles
├── styles.ats.css      # ATS-friendly mode styles
├── script.js           # Data loading and rendering logic
├── ats-layout.js       # ATS-friendly layout renderer
├── resume.toml         # Resume data
├── server.js           # Local development server
├── build.js            # Build script for JSON data generation
├── generate-og-image.js # OpenGraph image generator
├── generate-pdfs.js     # PDF generation script
├── og-preview.html     # OpenGraph preview template
├── package.json        # Project configuration
└── README.md          # This file
```


## 🌐 Browser Support

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 📄 License

MIT License - feel free to use this for your personal resume!

---

**Happy job hunting! 🎯**
