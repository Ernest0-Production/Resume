const http = require("http");
const { pathForLog } = require("../path-for-log");
const { PORT, HOST, PROJECT_ROOT } = require("./config");
const { createRequestListener } = require("./request-handler");

const httpServer = http.createServer(createRequestListener());

/**
 * Start server function (can be called programmatically)
 */
function startServer(port = PORT, host = HOST) {
  return new Promise((resolve, reject) => {
    const serverInstance = httpServer.listen(port, host, () => {
      console.log("=".repeat(60));
      console.log("📄 CV Generator Server Started");
      console.log("=".repeat(60));
      console.log(`🌐 Server running at: http://${host}:${port}/`);
      console.log(`📁 Serving files from: ${pathForLog(PROJECT_ROOT)}`);
      console.log("");
      console.log("📝 To view your resume, open the URL above in your browser");
      console.log(
        '📥 To export to PDF: Press Ctrl+P (Cmd+P on Mac) and select "Save as PDF"',
      );
      console.log("");
      console.log("Press Ctrl+C to stop the server");
      console.log("=".repeat(60));

      resolve(serverInstance);
    });

    serverInstance.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Error: Port ${port} is already in use.`);
        console.error(
          `   Try running with a different port: PORT=3001 node server.js`,
        );
      } else {
        console.error("❌ Server error:", err);
      }
      reject(err);
    });
  });
}

module.exports = { startServer };
