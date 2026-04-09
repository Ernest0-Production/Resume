const fs = require("fs");
const path = require("path");
const http = require("http");
const puppeteer = require("puppeteer");
const { pathForLog } = require("../path-for-log");

const PROJECT_ROOT = path.join(__dirname, "..");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function createStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        let relativePath = decodeURIComponent(requestUrl.pathname);
        if (relativePath === "/") {
          relativePath = "/index.html";
        }

        const filePath = path.join(rootDir, relativePath);
        if (!filePath.startsWith(rootDir)) {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }

        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            res.statusCode = 404;
            res.end("Not found");
            return;
          }

          res.statusCode = 200;
          res.setHeader("Content-Type", getContentType(filePath));
          res.setHeader("Cache-Control", "no-store");
          const stream = fs.createReadStream(filePath);
          stream.on("error", (streamErr) => {
            res.statusCode = 500;
            res.end(streamErr.message);
          });
          stream.pipe(res);
        });
      } catch (error) {
        res.statusCode = 500;
        res.end(error.message);
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function waitForContent(page) {
  await Promise.all([
    page.waitForFunction(
      () => {
        var name = document.querySelector(".og-name");
        return Boolean(name && name.textContent.trim().length > 0);
      },
      { timeout: 10000 },
    ),
    page
      .waitForFunction(
        () => {
          var title = document.querySelector(".og-title");
          return Boolean(title && title.textContent.trim().length > 0);
        },
        { timeout: 10000 },
      )
      .catch(() => undefined),
    page
      .waitForFunction(
        () => {
          var subtitle = document.querySelector(".og-subtitle");
          return Boolean(subtitle && subtitle.textContent.trim().length > 0);
        },
        { timeout: 10000 },
      )
      .catch(() => undefined),
    page
      .waitForFunction(
        () => {
          var emailText = document.querySelector(
            ".og-contact-item:first-child .og-contact-text",
          );
          return Boolean(emailText && emailText.textContent.trim().length > 0);
        },
        { timeout: 10000 },
      )
      .catch(() => undefined),
    page
      .waitForFunction(
        () => {
          var telegramText = document.querySelector(
            ".og-location .og-contact-text",
          );
          return Boolean(
            telegramText && telegramText.textContent.trim().length > 0,
          );
        },
        { timeout: 10000 },
      )
      .catch(() => undefined),
    page
      .waitForFunction(
        () => {
          var avatar = document.getElementById("ogAvatar");
          return Boolean(avatar && avatar.complete);
        },
        { timeout: 10000 },
      )
      .catch(() => undefined),
    page
      .evaluate(() => {
        if (document.fonts && document.fonts.ready) {
          return document.fonts.ready.then(() => {
            return new Promise((resolve) => setTimeout(resolve, 200));
          });
        }
        return new Promise((resolve) => setTimeout(resolve, 200));
      })
      .catch(() => undefined),
    page
      .evaluate(() => {
        return new Promise((resolve) => {
          if (document.fonts && document.fonts.check) {
            document.fonts.ready.then(() => {
              const checkFont = () => {
                const fontLoaded =
                  document.fonts.check('16px "SF Pro Rounded"') ||
                  document.fonts.check("16px ui-rounded") ||
                  document.fonts.check("16px -apple-system");
                if (fontLoaded) {
                  setTimeout(resolve, 200);
                } else {
                  setTimeout(() => {
                    setTimeout(resolve, 200);
                  }, 500);
                }
              };
              checkFont();
            });
          } else {
            setTimeout(resolve, 1000);
          }
        });
      })
      .catch(() => undefined),
  ]);
}

async function generateOgImage() {
  const rootDir = PROJECT_ROOT;
  const previewPath = path.join(rootDir, "og-preview.html");
  const outputPath = path.join(rootDir, "og-image.png");

  if (!fs.existsSync(previewPath)) {
    throw new Error(`Preview file not found: ${pathForLog(previewPath)}`);
  }

  if (!fs.existsSync(path.join(rootDir, "data", "resume-en.json"))) {
    console.warn(
      "Warning: data/resume-en.json not found. Make sure npm run build ran before this step.",
    );
  }

  const { server, url: serverUrl } = await createStaticServer(rootDir);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 2,
    });
    const previewUrl = `${serverUrl}/og-preview.html`;
    await page.goto(previewUrl, { waitUntil: "networkidle0", timeout: 30000 });

    await waitForContent(page);

    await page
      .waitForFunction(
        () => {
          var iconifyElements = document.querySelectorAll(".iconify");
          if (iconifyElements.length === 0) return true;
          return Array.from(iconifyElements).every((icon) => {
            var svg = icon.querySelector("svg");
            return svg && svg.children.length > 0;
          });
        },
        { timeout: 10000 },
      )
      .catch(() => undefined);

    await page
      .waitForFunction(
        () => {
          var favicon = document.getElementById("telegramFavicon");
          var fallbackIcon = document.querySelector(
            ".og-location .fallback-icon",
          );
          if (favicon && favicon.complete && favicon.naturalWidth > 0) {
            return favicon.style.display !== "none";
          }
          if (fallbackIcon) {
            var svg = fallbackIcon.querySelector("svg");
            return svg && svg.children.length > 0;
          }
          return true;
        },
        { timeout: 10000 },
      )
      .catch(() => undefined);

    await new Promise((resolve) => setTimeout(resolve, 500));

    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: 1200, height: 630 },
      type: "png",
    });

    console.log(`✅ Generated OpenGraph image at ${pathForLog(outputPath)}`);
  } finally {
    await browser.close();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

generateOgImage().catch((error) => {
  console.error("❌ Failed to generate OpenGraph image:", error);
  process.exit(1);
});
