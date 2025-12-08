import express from "express";

const app = express();
app.use(express.json()); // parse JSON bodies

// /ping endpoint
app.all("/ping", (req, res) => {
  console.log("Received request at /ping");
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);
  if (req.body && Object.keys(req.body).length > 0) console.log("Body:", req.body);

  res.json({ message: "pong", timestamp: Date.now() });
});

// Default catch-all
app.all("*", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
