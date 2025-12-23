import express from "express";
import path from "path";

const app = express();

// Parse JSON bodies for APIs
app.use(express.json());

// Serve static files at root (e.g., index.html, home.html)
app.use(express.static(path.join(process.cwd(), "public")));

// Serve static files for /apx routes
app.use("/apx", express.static(path.join(process.cwd(), "apx")));

// Example API endpoint
app.all("/ping", (req, res) => {
  console.log("Received request at /ping", req.method, req.body || "");
  res.json({ message: "pong", timestamp: Date.now() });
});

// Fallback 404 page
app.use((req, res) => {
  res.status(404).sendFile(path.join(process.cwd(), "public/404.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
