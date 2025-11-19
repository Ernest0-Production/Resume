# CV Generator

Static HTML resume site with PDF export capability. This project allows you to maintain your resume data in a structured TOML format and automatically generates a beautiful, printable HTML resume.

## 📋 Features

- ✅ **TOML-based data structure** - Easy to update and maintain
- ✅ **Multilanguage support** - Single file with language-specific properties (Russian and English)
- ✅ **Modern, professional design** - Two-column layout with clean typography
- ✅ **SF Pro Rounded font** - Clean and professional Apple typography
- ✅ **Iconify integration** - Beautiful icons for links and sections (from https://iconify.design)
- ✅ **PDF export ready** - Print directly from browser (Ctrl+P / Cmd+P)
- ✅ **Responsive design** - Looks great on all devices
- ✅ **Text formatting support** - Bold, italic, and underline in content
- ✅ **Automatic icon detection** - LinkedIn, GitHub, Telegram icons automatically detected from URLs
- ✅ **Local development server** - Easy to preview changes
- ✅ **GitHub Pages ready** - Automatic deployment with GitHub Actions

## 🚀 Quick Start

### Prerequisites

- Node.js (version 12 or higher)

### Installation & Running

1. Navigate to the project directory:
```bash
cd cv-generator
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
npm run dev    # Same as npm start
npm run serve  # Same as npm start
```

## 📝 Editing Your Resume

### Step 1: Add Your Avatar

1. Place your avatar image in the project folder (e.g., `avatar.jpg`)
2. Or use an absolute path to your image (e.g., `/Users/username/Pictures/avatar.jpg`)
3. Update the `avatar` field in `resume.toml` with the path

### Step 2: Edit the TOML file

Open `resume.toml` in the project root and update it with your information. The file uses a multilanguage format where language-specific properties use the format `"propertyName.language"`:

```toml
# Common properties (same for all languages)
avatar = "avatar.jpg"
lastName = "Your last name"
email = "your.email@example.com"

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
- `firstName`, `pageTitle`, `jobTitle`, `location`
- `about`, `expectation`, `skillsIntro`
- `extraSkills` (array)
- `experience.about`, `experience.responsibilities`, `experience.achievements`
- `projects.description`
- `education.degree`, `education.university`

Properties without a language suffix (like `avatar`, `lastName`, `email`, `references`, `languages`, `skills`) are shared across all languages.

### Step 3: Text Formatting

You can use the following formatting in any text field:

- `**text**` - Makes text **bold**
- `*text*` - Makes text *italic*
- `__text__` - Makes text <u>underlined</u>

Example:
```toml
about = "I have **10 years** of experience in *web development*."
```

### Step 3: Switch Languages

The resume supports Russian and English. Switch languages using:
- `http://localhost:3000?lang=ru` - Russian version
- `http://localhost:3000?lang=en` - English version

The language preference is saved in your browser and will persist across sessions.

### Step 4: Preview Changes

1. Save your changes to `resume.toml`
2. Refresh your browser (F5 or Cmd+R)
3. Your updated resume will appear immediately

## 📥 Exporting to PDF

### Method 1: Browser Print (Recommended)

1. Open your resume in the browser (`http://localhost:3000`)
2. Press **Ctrl+P** (Windows/Linux) or **Cmd+P** (Mac)
3. In the print dialog:
   - **Destination**: Select "Save as PDF"
   - **Layout**: Portrait
   - **Paper size**: A4 or Letter
   - **Margins**: Default or Custom
   - **Options**: Enable "Background graphics" for best results
4. Click "Save" and choose where to save your PDF

### Method 2: Browser Menu

1. Open your resume in the browser
2. Go to **File → Print** (or right-click → Print)
3. Follow the same steps as Method 1

### Tips for Best PDF Output

- ✅ Enable "Background graphics" in print settings
- ✅ Use A4 paper size for international standard
- ✅ Check "Print headers and footers" is disabled for cleaner output
- ✅ Preview before saving to ensure everything looks correct

## 📁 Project Structure

```
cv-generator/
├── index.html          # Main HTML structure
├── styles.css          # All styling and print styles
├── script.js           # Data loading and rendering logic
├── resume.toml         # Multilanguage resume data (Russian & English)
├── server.js           # Local development server
├── package.json        # Project configuration
└── README.md          # This file
```

## 🎨 Customizing the Design

### Icons

This project uses [Iconify](https://iconify.design) for icons. Icons are automatically detected for:
- LinkedIn (`mdi:linkedin`)
- GitHub (`mdi:github`)
- Telegram (`mdi:telegram`)
- Twitter/X (`mdi:twitter`)
- And many more...

You can browse and find more icons at https://iconify.design and use them in your HTML:

```html
<span class="iconify" data-icon="mdi:icon-name"></span>
```

### Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --color-black: #000000;
    --color-blue: #2196F3;     /* Links and accents */
    --color-red: #E53935;      /* Section highlights */
    --color-gray: #666666;     /* Secondary text */
}
```

### Fonts

The project uses **SF Pro Rounded** font by default (Apple's system font). Change the font family in `styles.css`:

```css
:root {
    --font-main: 'SF Pro Rounded', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

Note: SF Pro Rounded is available on macOS/iOS by default. On other systems, it will fallback to system fonts.

### Layout

The resume uses a two-column grid layout. Adjust spacing and layout in `styles.css` under the "Main Content - Two Columns" section.

## 🔧 Troubleshooting

### Server won't start

**Error**: "Port 3000 is already in use"

**Solution**: Use a different port:
```bash
PORT=3001 npm start
```

### Resume data not loading

1. Check that `resume.toml` exists in the project root
2. Open browser console (F12) to see error messages
3. Verify TOML syntax is valid (use a TOML validator online)
4. Make sure multilanguage properties use the correct format: `"propertyName.language"`

### Styles not working in PDF

1. Enable "Background graphics" in print settings
2. Check that `@media print` styles in `styles.css` are correct
3. Try a different browser (Chrome usually has best print support)

### Images not showing

1. Use absolute URLs for images (https://...)
2. Or place images in the project folder and use relative paths
3. Check image URLs are accessible

## 🌐 Browser Support

- ✅ Chrome/Edge (Recommended for PDF export)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 🚀 Deploying to GitHub Pages

This project is ready to deploy to GitHub Pages with automatic builds via GitHub Actions.

### Quick Deploy

1. **Create a GitHub repository** and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/cv-generator.git
   git push -u origin main
   ```

2. **Generate static files** (required before first commit):
   ```bash
   npm run build
   git add .
   git commit -m "Add GitHub Pages support"
   git push
   ```

3. **Enable GitHub Pages**:
   - Go to your repository → **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
   - The site will be available at `https://YOUR_USERNAME.github.io/cv-generator/`

### Updating Your Resume

After editing `resume.toml`:
```bash
npm run build  # Generate updated JSON files
git add .
git commit -m "Update resume"
git push      # GitHub Actions will automatically deploy
```

For detailed instructions, see [DEPLOY.md](./DEPLOY.md)

## 📄 License

MIT License - feel free to use this for your personal resume!

## 🤝 Contributing

This is a personal resume template, but feel free to:
- Fork and customize for your own use
- Report bugs or issues
- Suggest improvements

## 📞 Support

If you encounter any issues:
1. Check the browser console for error messages (F12)
2. Verify your TOML syntax is valid
3. Make sure the server is running
4. Try refreshing the page (Ctrl+R / Cmd+R)

---

**Happy job hunting! 🎯**

