import express from "express";

const app = express();

/* ---------------- Helpers ---------------- */
const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function encodeBase62(str) {
  const bytes = Buffer.from(str, "utf8");
  let num = BigInt("0x" + bytes.toString("hex"));

  if (num === 0n) return "0";

  let out = "";
  while (num > 0) {
    out = BASE62[Number(num % 62n)] + out;
    num /= 62n;
  }
  return out;
}

function decodeBase62(b62) {
  let num = 0n;

  for (const ch of b62) {
    const val = BASE62.indexOf(ch);
    if (val === -1) return null;
    num = num * 62n + BigInt(val);
  }

  let hex = num.toString(16);
  if (hex.length % 2) hex = "0" + hex;

  return Buffer.from(hex, "hex").toString("utf8");
}

function decodeBase64(str) {
  try {
    return Buffer.from(str, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

function rewriteHTML(html, baseUrl) {
  html = html.replace(
    /(href|src)="(https?:\/\/[^"]+)"/g,
    (m, attr, url) => {
      const proxied = `/apx/stuff/${encodeBase62(url)}`;
      return `${attr}="${proxied}"`;
    }
  );

  html = html.replace(
    /(href|src)="(\/[^"]*)"/g,
    (m, attr, url) => {
      const fullUrl = new URL(url, baseUrl).href;
      const proxied = `/apx/stuff/${encodeBase62(fullUrl)}`;
      return `${attr}="${proxied}"`;
    }
  );

  return html;
}


/* ---------------- Routes ---------------- */

// Proxy & rewrite endpoint
app.get("/apx/stuff/:b62", async (req, res) => {
  const target = decodeBase62(req.params.b62);
  if (!target) {
    return res.status(400).json({ error: "Invalid base62 URL" });
  }

  try {
     const response = await fetch(target, {
      headers: {
        "accept-encoding": "identity"
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // Strip iframe-blocking headers
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
