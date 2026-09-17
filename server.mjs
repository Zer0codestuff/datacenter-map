import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.cwd(), "dist");
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const send = (response, statusCode, body, contentType = "text/plain; charset=utf-8") => {
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(body);
};

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method Not Allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
  } catch {
    send(response, 400, "Bad Request");
    return;
  }

  const requestedPath = pathname === "/" ? resolve(root, "index.html") : resolve(root, `.${pathname}`);
  const isInsideRoot = requestedPath === root || requestedPath.startsWith(`${root}${sep}`);
  if (!isInsideRoot) {
    send(response, 403, "Forbidden");
    return;
  }

  const candidates = [requestedPath];
  if (pathname !== "/" && !extname(requestedPath)) {
    candidates.push(resolve(root, "index.html"));
  }

  for (const filePath of candidates) {
    try {
      const body = await readFile(filePath);
      const contentType = contentTypes[extname(filePath)] || "application/octet-stream";
      response.writeHead(200, { "Content-Type": contentType });
      if (request.method === "HEAD") {
        response.end();
      } else {
        response.end(body);
      }
      return;
    } catch (error) {
      if (error.code !== "ENOENT") {
        send(response, 500, "Internal Server Error");
        return;
      }
    }
  }

  send(response, 404, "Not Found");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Serving ${root} on port ${port}`);
});
