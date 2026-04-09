const { spawn } = require("child_process");
const { PORT, HOST } = require("./server/config");
const { startServer } = require("./server/index.js");

module.exports = { startServer };

if (require.main === module) {
  startServer(PORT, HOST)
    .then((serverInstance) => {
      const url = `http://${HOST}:${PORT}/`;

      try {
        const p = spawn("pbcopy");
        p.on("error", () => {
          console.log(`🔗 Open in browser: ${url}`);
        });
        p.stdin.write(url);
        p.stdin.end();
        p.on("close", (code) => {
          if (code === 0) {
            console.log(`🔗 Server URL copied to clipboard: ${url}`);
          } else {
            console.log(`🔗 Open in browser: ${url}`);
          }
        });
      } catch (error) {
        console.log(`🔗 Open in browser: ${url}`);
      }

      process.on("SIGINT", () => {
        console.log("\n\n👋 Shutting down server...");
        serverInstance.close(() => {
          console.log("✅ Server stopped successfully");
          process.exit(0);
        });
      });
    })
    .catch(() => {
      process.exit(1);
    });
}
