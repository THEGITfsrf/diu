import fetch from "node-fetch";

export default async function handler(req, res) {
  const { b64 } = req.query; // Vercel passes dynamic segment as query
  if (!b64) return res.status(400).json({ error: "Missing b64 parameter" });

  let target;
  try {
    target = Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    return res.status(400).json({ error: "Invalid base64" });
  }

  try {
    const response = await fetch(target);
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Rewrite HTML text
      html = html.replace(/Example/g, "MiniProxy");

      // Rewrite absolute links
      html = html.replace(/(href|src)="(https?:\/\/[^"]+)"/g, (m, attr, url) => {
        return `${attr}="/api/apx/stuff/${Buffer.from(url).toString("base64")}"`;
      });

      // Rewrite relative links
      html = html.replace(/(href|src)="(\/[^"]*)"/g, (m, attr, url) => {
        const fullUrl = new URL(url, target).href;
        return `${attr}="/api/apx/stuff/${Buffer.from(fullUrl).toString("base64")}"`;
      });

      res.setHeader("content-type", contentType);
      res.status(200).send(html);
    } else {
      const buffer = await response.arrayBuffer();
      res.setHeader("content-type", contentType);
      res.status(200).send(Buffer.from(buffer));
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch URL", details: err.message });
  }
}
