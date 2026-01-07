const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const TOML = require('@iarna/toml');

// Import server functions
const server = require('./server.js');

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

/**
 * Wait for server to be ready
 */
async function waitForServer(url, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await fetch(url);
            console.log(`✅ Server is ready at ${url}`);
            return true;
        } catch (error) {
            console.log(`⏳ Waiting for server... (attempt ${i + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    throw new Error(`Server did not start within ${maxAttempts} seconds`);
}

/**
 * Generate PDF for a specific language and view mode
 */
async function generatePDF(browser, lang, view, outputDir) {
    const url = `http://${HOST}:${PORT}/?lang=${lang}&view=${view}`;
    const viewSuffix = view === 'ats-friendly' ? 'ats' : 'hr';
    const outputFile = path.join(outputDir, `resume-${lang}-${viewSuffix}.pdf`);

    console.log(`📄 Generating PDF: ${lang}-${viewSuffix}`);
    console.log(`   URL: ${url}`);
    console.log(`   Output: ${outputFile}`);

    const page = await browser.newPage();

    try {
        // Navigate to the page
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });

        // Emulate print media
        await page.emulateMediaType('print');

        // Wait for content to load
        const selector = view === 'ats-friendly' ? '#atsLayout' : '.container';
        await page.waitForSelector(selector, { timeout: 15000 }).catch(() => {
            console.warn(`⚠️  Selector ${selector} not found, continuing anyway`);
        });

        // Ensure lazy images are loaded
        await page.evaluate(() => {
            try {
                const imgs = Array.from(document.images || []);
                imgs.forEach(img => {
                    const loadingAttr = (img.getAttribute('loading') || '').toLowerCase();
                    if (img.loading === 'lazy' || loadingAttr === 'lazy') {
                        img.loading = 'eager';
                        img.setAttribute('loading', 'eager');
                        const src = img.currentSrc || img.src;
                        if (src) img.src = src;
                    }
                });
            } catch (e) {
                // Ignore
            }
        });

        // Scroll through the page to trigger lazy loading
        await page.evaluate(async () => {
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            const total = Math.max(
                document.body?.scrollHeight || 0,
                document.documentElement?.scrollHeight || 0
            );
            const step = Math.max(window.innerHeight || 800, 400);
            for (let y = 0; y <= total; y += step) {
                window.scrollTo(0, y);
                await sleep(50);
            }
            window.scrollTo(0, 0);
        });

        // Wait for images to load
        await page.evaluate(() => {
            return Promise.all(
                Array.from(document.images || [])
                    .filter(img => !img.complete)
                    .map(img => new Promise((resolve) => {
                        img.addEventListener('load', resolve, { once: true });
                        img.addEventListener('error', resolve, { once: true });
                    }))
            );
        });

        // Additional wait for any remaining async operations
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0.5cm',
                right: '0.5cm',
                bottom: '0.5cm',
                left: '0.5cm'
            },
            preferCSSPageSize: true,
        });

        // Save PDF to file
        fs.writeFileSync(outputFile, pdfBuffer);
        console.log(`✅ Generated: ${outputFile}`);

    } catch (error) {
        console.error(`❌ Error generating ${lang}-${viewSuffix} PDF:`, error.message);
        throw error;
    } finally {
        await page.close();
    }
}

/**
 * Main function to generate all PDFs
 */
async function generateAllPDFs() {
    const outputDir = path.join(__dirname, 'data');

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let serverInstance = null;
    let browser = null;

    try {
        // Start server
        console.log('🚀 Starting server...');
        serverInstance = await server.startServer(PORT);

        // Wait for server to be ready
        await waitForServer(`http://${HOST}:${PORT}`);

        // Launch browser
        console.log('🌐 Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--font-render-hinting=medium',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
        });

        // Generate PDFs for all combinations
        const languages = ['ru', 'en'];
        const views = ['user-friendly', 'ats-friendly'];

        console.log('\n📋 Generating PDFs for all combinations...\n');

        for (const lang of languages) {
            for (const view of views) {
                await generatePDF(browser, lang, view, outputDir);
            }
        }

        console.log('\n✅ All PDFs generated successfully!');
        console.log(`📁 Output directory: ${outputDir}`);

    } catch (error) {
        console.error('❌ PDF generation failed:', error);
        process.exit(1);
    } finally {
        // Cleanup
        if (browser) {
            await browser.close();
            console.log('🌐 Browser closed');
        }

        if (serverInstance) {
            serverInstance.close();
            console.log('🛑 Server stopped');
        }
    }
}

// Run if called directly
if (require.main === module) {
    generateAllPDFs();
}

module.exports = { generateAllPDFs };

