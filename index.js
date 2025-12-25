import express from "express";

const app = express();

/* ---------------- Helpers ---------------- */

function decodeBase64(str) {
  try {
    return Buffer.from(str, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

function rewriteHTML(html, baseUrl) {
  // Example text replacement
  html = html.replace(/Example/g, "MiniProxy");

  // Rewrite absolute links
  html = html.replace(
    /(href|src)="(https?:\/\/[^"]+)"/g,
    (m, attr, url) => {
      const proxied = `/apx/stuff/${Buffer.from(url).toString("base64")}`;
      return `${attr}="${proxied}"`;
    }
  );

  // Rewrite relative links
  html = html.replace(
    /(href|src)="(\/[^"]*)"/g,
    (m, attr, url) => {
      const fullUrl = new URL(url, baseUrl).href;
      const proxied = `/apx/stuff/${Buffer.from(fullUrl).toString("base64")}`;
      return `${attr}="${proxied}"`;
    }
  );

  return html;
}

/* ---------------- Routes ---------------- */

// Proxy & rewrite endpoint
app.get("/apx/stuff/:b64", async (req, res) => {
  const target = decodeBase64(req.params.b64);
  if (!target) {
    return res.status(400).json({ error: "Invalid base64 URL" });
  }

  try {
    const response = await fetch(target);
    const contentType = response.headers.get("content-type") || "";
    response.headers.forEach((value, key) => {
      if (!["x-frame-options", "content-security-policy"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    if (contentType.includes("text/html")) {
      let html = await response.text();
      html = rewriteHTML(html, target);
      res.set("content-type", contentType);
      res.send(html);
    } else {
      const buffer = Buffer.from(await response.arrayBuffer());
      res.set("content-type", contentType);
      res.send(buffer);
    }
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch URL",
      details: err.message
    });
  }
});

// Test page
app.get("/apx", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mini Rewriter Proxy</title>
</head>
<body>
  <h1>Mini Rewriter Proxy</h1>
  <input id="url" placeholder="Enter URL" style="width:300px;">
  <button onclick="go()">Fetch & Rewrite</button>
  <iframe id="frame" style="width:100%; height:500px; margin-top:10px;"></iframe>

  <script>
    function go() {
      const url = document.getElementById('url').value;
      const b64 = btoa(url);
      document.getElementById('frame').src = '/api/apx/stuff/' + b64;
    }
  </script>
</body>
</html>`);
});

/* ---------------- Export ---------------- */

// IMPORTANT: export the app — no app.listen()
export default app;
