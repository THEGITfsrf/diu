import express from "express";
import { parse } from "node-html-parser";
import dns from "dns/promises";

const app = express();

/* ---------------- Base62 ---------------- */
const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function encodeBase62(str) {
  const buf = Buffer.from(str, "utf8");
  if (buf.length > 2048) throw new Error("URL too long");

  let num = BigInt("0x" + buf.toString("hex"));
  if (num === 0n) return "0";

  let out = "";
  while (num > 0n) {
    out = BASE62[Number(num % 62n)] + out;
    num /= 62n;
  }
  return out;
}

function decodeBase62(b62) {
  let num = 0n;
  for (const ch of b62) {
    const v = BASE62.indexOf(ch);
    if (v === -1) return null;
    num = num * 62n + BigInt(v);
  }

  let hex = num.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return Buffer.from(hex, "hex").toString("utf8");
}

/* ---------------- Security ---------------- */
function isPrivateIP(ip) {
  return (
    ip === "127.0.0.1" ||            // localhost
    ip.startsWith("10.") ||          // 10.0.0.0/8
    ip.startsWith("192.168.") ||     // 192.168.0.0/16
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) || // 172.16.0.0/12
    ip.startsWith("169.254.")        // link-local
  );
}

async function isBlockedHost(hostname) {
  if (hostname === "localhost" || hostname.endsWith(".local")) return true;

  try {
    const res = await dns.lookup(hostname, { all: true });
    return res.some(r => isPrivateIP(r.address));
  } catch {
    return true; // fail-safe block
  }
}

function safeURL(url, base) {
  try {
    const u = new URL(url, base);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.href;
  } catch {
    return null;
  }
}

/* ---------------- HTML Rewrite ---------------- */
function rewriteHTML(html, baseUrl) {
  const root = parse(html, { lowerCaseTagName: false, comment: false });

  // remove <base> tags
  root.querySelectorAll("base").forEach(b => b.remove());

  const attrs = ["href", "src", "action"];
  root.querySelectorAll("*").forEach(el => {
    for (const attr of attrs) {
      const val = el.getAttribute(attr);
      if (!val) continue;

      // skip data/blob/mailto/javascript
      if (/^(data|blob|mailto|javascript):/i.test(val)) continue;

      const full = safeURL(val, baseUrl);
      if (!full) continue;

      el.setAttribute(attr, `/apx/stuff/${encodeBase62(full)}`);
    }
  });

  return root.toString();
}

/* ---------------- Route ---------------- */
app.get("/apx/stuff/:b62", async (req, res) => {
  const target = decodeBase62(req.params.b62);
  if (!target) return res.status(400).send("Bad URL");

  let url;
  try {
    url = new URL(target);
  } catch {
    return res.status(400).send("Invalid URL");
  }

  if (await isBlockedHost(url.hostname)) {
    return res.status(403).send("Blocked host");
  }

  const response = await fetch(url, {
    redirect: "manual",
    headers: { "accept-encoding": "identity" }
  });

  // handle redirects
  if (response.status >= 300 && response.status < 400) {
    const loc = response.headers.get("location");
    if (loc) {
      const full = safeURL(loc, url.href);
      if (full) {
        return res.redirect(
          response.status,
          `/apx/stuff/${encodeBase62(full)}`
        );
      }
    }
  }

  const ct = response.headers.get("content-type") || "";

  // safe headers only
  for (const [k, v] of response.headers) {
    if (
      !["content-length", "set-cookie", "content-security-policy", "x-frame-options"].includes(k.toLowerCase())
    ) {
      res.setHeader(k, v);
    }
  }

  if (ct.includes("text/html")) {
    const html = await response.text();
    res.send(rewriteHTML(html, url.href));
  } else {
    const buf = Buffer.from(await response.arrayBuffer());
    res.send(buf);
  }
});

/* ---------------- Export ---------------- */
export default app;
