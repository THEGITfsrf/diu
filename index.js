const express = require("express");
const serverless = require("serverless-http");
const fetch = require("node-fetch");
const parse5 = require("parse5");
const acorn = require("acorn");
const escodegen = require("escodegen");

const app = express();
app.use(express.json());

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Simple Base62 decode
function decodeBase62(str) {
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    const index = BASE62.indexOf(str[i]);
    if (index === -1) return null;
    num = num * 62 + index;
  }
  return num;
}

// Simulated DB: map IDs to URLs
const URL_MAP = {
  1: "https://example.com",
  2: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"
  // add more mappings here
};

// /apx/stuff/:b62 route
app.get("/apx/stuff/:b62", async (req, res) => {
  const targetId = decodeBase62(req.params.b62);
  if (!targetId) return res.status(400).send("Bad URL");

  const targetUrl = URL_MAP[targetId];
  if (!targetUrl) return res.status(404).send("Not Found");

  try {
    const response = await fetch(targetUrl);
    const contentType = response.headers.get("content-type") || "";

    // HTML rewriting
    if (contentType.includes("text/html")) {
      const htmlText = await response.text();
      const document = parse5.parse(htmlText);

      // Example: inject script at <head>
      const scriptNode = {
        nodeName: "script",
        tagName: "script",
        attrs: [],
        namespaceURI: "http://www.w3.org/1999/xhtml",
        childNodes: [
          {
            nodeName: "#text",
            value: 'console.log("HTML Rewritten by Proxy!");'
          }
        ]
      };

      const htmlNode = document.childNodes.find(n => n.nodeName === "html");
      if (htmlNode) {
        const head = htmlNode.childNodes.find(n => n.nodeName === "head");
        if (head) head.childNodes.push(scriptNode);
      }

      const rewrittenHtml = parse5.serialize(document);
      res.set("content-type", "text/html");
      return res.send(rewrittenHtml);

    } else if (contentType.includes("javascript")) {
      // JS rewriting
      const jsText = await response.text();
      const ast = acorn.parse(jsText, { ecmaVersion: "latest", sourceType: "module" });

      // Inject console.log at start
      ast.body.unshift({
        type: "ExpressionStatement",
        expression: {
          type: "CallExpression",
          callee: {
            type: "MemberExpression",
            object: { type: "Identifier", name: "console" },
            property: { type: "Identifier", name: "log" },
            computed: false
          },
          arguments: [{ type: "Literal", value: "JS Rewritten by Proxy!" }]
        }
      });

      const rewrittenJs = escodegen.generate(ast);
      res.set("content-type", "application/javascript");
      return res.send(rewrittenJs);

    } else {
      // Other types: proxy as-is
      const buffer = await response.arrayBuffer();
      res.set("content-type", contentType);
      return res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error: " + err.message);
  }
});

// Optional catch-all proxy for any other routes
app.all("*", async (req, res) => {
  res.status(404).send("Use /apx/stuff/:b62");
});

module.exports = serverless(app);
