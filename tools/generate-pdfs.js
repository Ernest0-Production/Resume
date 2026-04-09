const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { pathForLog } = require("../path-for-log");

const server = require("../server.js");

const PROJECT_ROOT = path.join(__dirname, "..");

const PORT = process.env.PORT || 3000;
const HOST = "localhost";

/**
 * Wait for server to be ready
 */
async function waitForServer(url, maxAttempts = 30) {
  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex++) {
    try {
      await fetch(url);
      console.log(`✅ Server is ready at ${url}`);
      return true;
    } catch (error) {
      console.log(
        `⏳ Waiting for server... (attempt ${attemptIndex + 1}/${maxAttempts})`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Server did not start within ${maxAttempts} seconds`);
}

/**
 * Generate PDF for a specific language and view mode
 */
async function generatePDF(browser, lang, view, outputDir) {
  const url = `http://${HOST}:${PORT}/?lang=${lang}&view=${view}`;
  const viewSuffix = view === "ats-friendly" ? "ats" : "hr";

  const filename = `resume-${lang}.${viewSuffix}.pdf`;
  const outputFile = path.join(outputDir, filename);

  console.log(`📄 Generating PDF: ${lang}-${viewSuffix}`);
  console.log(`   URL: ${url}`);
  console.log(`   Output: ${pathForLog(outputFile)}`);

  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });

    await page.emulateMediaType("print");

    const selector = view === "ats-friendly" ? "#atsLayout" : ".container";
    await page.waitForSelector(selector, { timeout: 15000 }).catch(() => {
      console.warn(`⚠️  Selector ${selector} not found, continuing anyway`);
    });

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
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      window.scrollTo(0, 0);
    });

    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images || [])
          .filter((imageElement) => !imageElement.complete)
          .map(
            (imageElement) =>
              new Promise((resolve) => {
                imageElement.addEventListener("load", resolve, {
                  once: true,
                });
                imageElement.addEventListener("error", resolve, {
                  once: true,
                });
              }),
          ),
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
      preferCSSPageSize: true,
    });

    fs.writeFileSync(outputFile, pdfBuffer);
    console.log(`✅ Generated: ${pathForLog(outputFile)}`);
  } catch (error) {
    console.error(
      `❌ Error generating ${lang}-${viewSuffix} PDF:`,
      error.message,
    );
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * Main function to generate all PDFs
 */
async function generateAllPDFs() {
  const outputDir = path.join(PROJECT_ROOT, "data");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let serverInstance = null;
  let browser = null;

  try {
    console.log("🚀 Starting server...");
    serverInstance = await server.startServer(PORT);

    await waitForServer(`http://${HOST}:${PORT}`);

    console.log("🌐 Launching browser...");
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--font-render-hinting=medium",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });

    const languages = ["ru", "en"];
    const views = ["user-friendly", "ats-friendly"];

    console.log("\n📋 Generating PDFs for all combinations...\n");

    for (const lang of languages) {
      for (const view of views) {
        await generatePDF(browser, lang, view, outputDir);
      }
    }

    console.log("\n✅ All PDFs generated successfully!");
    console.log(`📁 Output directory: ${pathForLog(outputDir)}`);
  } catch (error) {
    console.error("❌ PDF generation failed:", error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log("🌐 Browser closed");
    }

    if (serverInstance) {
      serverInstance.close();
      console.log("🛑 Server stopped");
    }
  }
}

if (require.main === module) {
  generateAllPDFs();
}

module.exports = { generateAllPDFs };
