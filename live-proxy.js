import { createServer } from "node:http";

const host = process.env.PROXY_HOST || "127.0.0.1";
const port = Number(process.env.PROXY_PORT || 4175);
const target = process.env.TARGET_URL || "http://127.0.0.1:4173";
const username = process.env.PROXY_USER || "freelancer";
const password = process.env.PROXY_PASSWORD;

if (!password) {
  console.error("Set PROXY_PASSWORD before starting the live proxy.");
  process.exit(1);
}

function unauthorized(res) {
  res.writeHead(401, {
    "www-authenticate": 'Basic realm="Freelancer Image Studio"',
    "content-type": "text/plain; charset=utf-8"
  });
  res.end("Password required");
}

function isAuthorized(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  const givenUser = decoded.slice(0, separator);
  const givenPassword = decoded.slice(separator + 1);

  return givenUser === username && givenPassword === password;
}

const server = createServer(async (req, res) => {
  if (!isAuthorized(req)) {
    unauthorized(res);
    return;
  }

  const upstreamUrl = new URL(req.url || "/", target);
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.authorization;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method || "GET") ? undefined : req,
      duplex: "half"
    });

    const responseHeaders = Object.fromEntries(upstream.headers.entries());
    res.writeHead(upstream.status, responseHeaders);

    if (upstream.body) {
      for await (const chunk of upstream.body) res.write(chunk);
    }
    res.end();
  } catch (error) {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Proxy error: ${error.message}`);
  }
});

server.listen(port, host, () => {
  console.log(`Password proxy running at http://${host}:${port}`);
  console.log(`Forwarding to ${target}`);
  console.log(`Username: ${username}`);
});
