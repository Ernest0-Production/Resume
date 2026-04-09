const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const TOML = require("@iarna/toml");
const { PORT, HOST, PROJECT_ROOT } = require("./config");
const { encodeContentDispositionFilename } = require("./content-disposition");
const { localizeResumeData } = require("../lib/resume-localize");

/**
 * Handle short PDF links: /data/resume.ats.pdf or /data/resume.hr.pdf
 * Finds the correct file based on language and serves it with personalized filename
 */
async function handleShortPdfLink(req, res, parsed) {
  try {
    const viewSuffix = parsed.pathname.includes(".ats.pdf") ? "ats" : "hr";

    const lang = (parsed.searchParams.get("lang") || "ru").toLowerCase();
    const allowedLangs = new Set(["ru", "en"]);
    if (!allowedLangs.has(lang)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: 'Unsupported language. Use "ru" or "en".' }),
      );
      return;
    }

    const actualFilename = `resume-${lang}.${viewSuffix}.pdf`;
    const actualFilePath = path.join(PROJECT_ROOT, "data", actualFilename);

    if (!fs.existsSync(actualFilePath)) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>404 - PDF Not Found</title>
                    <style>
                        body {
                            font-family: sans-serif;
                            text-align: center;
                            padding: 50px;
                        }
                        h1 { color: #E53935; }
                    </style>
                </head>
                <body>
                    <h1>404 - PDF Not Found</h1>
                    <p>The requested PDF file was not found: ${actualFilename}</p>
                    <a href="/">Go to Home</a>
                </body>
                </html>
            `);
      return;
    }

    const pdfBuffer = fs.readFileSync(actualFilePath);

    let filename = `resume.${viewSuffix}.pdf`;
    try {
      const tomlPath = path.join(PROJECT_ROOT, "resume.toml");
      const tomlText = fs.readFileSync(tomlPath, "utf8");
      const parsedToml = TOML.parse(tomlText);
      const localized = localizeResumeData(parsedToml, lang);

      const firstName = localized.firstName || "";
      const lastName = localized.lastName || "";
      const jobTitle = localized.jobTitle || "";

      const nameParts = [firstName, lastName].filter(Boolean);
      const name = nameParts.join(" ");

      if (name && jobTitle) {
        filename = `${name} – ${jobTitle}.${viewSuffix}.pdf`;
      } else if (name) {
        filename = `${name}.${viewSuffix}.pdf`;
      }
    } catch (error) {
      console.warn(
        `[API] Failed to generate custom filename, using default: ${error && error.message ? error.message : error}`,
      );
    }

    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": encodeContentDispositionFilename(filename),
      "Cache-Control": "public, max-age=3600",
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error(
      `[API] Failed to serve PDF: ${error && error.message ? error.message : error}`,
    );
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to serve PDF" }));
  }
}

/**
 * Generate PDF using headless Chromium to mimic browser print
 */
async function handlePdfRequest(req, res, parsed) {
  const lang = (parsed.searchParams.get("lang") || "ru").toLowerCase();
  const allowedLangs = new Set(["ru", "en"]);
  if (!allowedLangs.has(lang)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: 'Unsupported language. Use "ru" or "en".' }),
    );
    return;
  }

  const view =
    parsed.searchParams.get("view") === "ats-friendly"
      ? "ats-friendly"
      : "user-friendly";
  const hostHeader = req.headers.host || `${HOST}:${PORT}`;
  const proto = req.headers["x-forwarded-proto"] || "http";
  const targetUrl = `${proto}://${hostHeader}/?lang=${lang}&view=${view}`;

  console.log(`[API] Generating PDF for ${targetUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--font-render-hinting=medium",
      ],
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 45000 });
    await page.emulateMediaType("print");
    await page
      .waitForSelector(".container", { timeout: 15000 })
      .catch(() => {});

    await page.evaluate(() => {
      try {
        const imgs = Array.from(document.images || []);
        imgs.forEach((imageElement) => {
          const loadingAttr = (
            imageElement.getAttribute("loading") || ""
          ).toLowerCase();
          if (imageElement.loading === "lazy" || loadingAttr === "lazy") {
            imageElement.loading = "eager";
            imageElement.setAttribute("loading", "eager");
            const src = imageElement.currentSrc || imageElement.src;
            if (src) imageElement.src = src;
          }
        });
      } catch (error) {
        // Ignore
      }
    });

    await page.evaluate(async () => {
      const total = Math.max(
        document.body?.scrollHeight || 0,
        document.documentElement?.scrollHeight || 0,
      );
      const step = Math.max(window.innerHeight || 800, 400);
      for (
        let scrollPosition = 0;
        scrollPosition <= total;
        scrollPosition += step
      ) {
        window.scrollTo(0, scrollPosition);
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      window.scrollTo(0, 0);
    });

    await page.evaluate(async () => {
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      } catch (error) {
        // Ignore
      }
    });
    await page
      .waitForFunction(
        () => {
          try {
            return Array.from(document.images || []).every(
              (img) => img.complete,
            );
          } catch (error) {
            return true;
          }
        },
        { timeout: 15000 },
      )
      .catch(() => {});

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    const viewSuffix = view === "ats-friendly" ? "ats" : "hr";
    let filename = `resume.${viewSuffix}.pdf`;
    try {
      const tomlPath = path.join(PROJECT_ROOT, "resume.toml");
      const tomlText = fs.readFileSync(tomlPath, "utf8");
      const parsedToml = TOML.parse(tomlText);
      const localized = localizeResumeData(parsedToml, lang);

      const firstName = localized.firstName || "";
      const lastName = localized.lastName || "";
      const jobTitle = localized.jobTitle || "";

      const nameParts = [firstName, lastName].filter(Boolean);
      const name = nameParts.join(" ");

      if (name && jobTitle) {
        filename = `${name} – ${jobTitle}.${viewSuffix}.pdf`;
      } else if (name) {
        filename = `${name}.${viewSuffix}.pdf`;
      }
    } catch (error) {
      console.warn(
        `[API] Failed to generate custom filename, using default: ${error && error.message ? error.message : error}`,
      );
    }

    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": encodeContentDispositionFilename(filename),
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error(
      `[API] Failed to generate PDF: ${error && error.message ? error.message : error}`,
    );
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to generate PDF" }));
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn(
          `[API] Failed to close browser instance: ${closeError && closeError.message ? closeError.message : closeError}`,
        );
      }
    }
  }
}

module.exports = { handleShortPdfLink, handlePdfRequest };
