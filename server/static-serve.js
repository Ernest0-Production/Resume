const fs = require("fs");
const path = require("path");

/**
 * Serve a file under projectRoot (404/500 HTML or file bytes).
 */
function serveStatic(req, res, projectRoot, getMimeType) {
  const requestPathname = req.url.split("?")[0] || "/";
  const relativePath =
    requestPathname === "/"
      ? "index.html"
      : decodeURIComponent(requestPathname).replace(/^\/+/, "");
  const filePath = path.join(projectRoot, relativePath);

  if (!filePath.startsWith(projectRoot)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("403 Forbidden");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>404 - Not Found</title>
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
                        <h1>404 - File Not Found</h1>
                        <p>The requested file was not found: ${req.url}</p>
                        <a href="/">Go to Home</a>
                    </body>
                    </html>
                `);
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`500 Internal Server Error: ${err.code}`);
      }
    } else {
      const mimeType = getMimeType(filePath);
      res.writeHead(200, { "Content-Type": mimeType });
      res.end(content);
    }
  });
}

module.exports = { serveStatic };
