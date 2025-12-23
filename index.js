import express from "express";

const app = express();

// Serve static API routes
app.use(express.json());  // For parsing JSON bodies

// /ping endpoint (API route returning JSON)
app.all("/ping", (req, res) => {
  console.log("Received request at /ping");
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);
  if (req.body && Object.keys(req.body).length > 0) console.log("Body:", req.body);

  res.json({ message: "pong", timestamp: Date.now() });
});

// Default catch-all API route
app.all("/apx/*", (req, res) => {
  console.log("API request:", req.method, req.url);
  res.json({ message: "YAY" });
});

// Hardcoded HTML for the root page ("/")
app.get("/", (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Home Page</title>
    </head>
    <body>
      <h1>Welcome to the Home Page!</h1>
      <p>This is the root page served by Express with hardcoded HTML.</p>
      <a href="/home">Go to Home Page</a>
    </body>
    </html>
  `;
  res.send(html);
});

// Hardcoded HTML for the "/home" page
app.get("/home", (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Home Page</title>
    </head>
    <body>
      <h1>Welcome to the Home Page!</h1>
      <p>This is a hardcoded Home page served by Express.</p>
      <a href="/">Go back to Root Page</a>
    </body>
    </html>
  `;
  res.send(html);
});

// Fallback for all other requests (404 page or other HTML content)
app.get("*", (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 Page</title>
    </head>
    <body>
      <h1>Page Not Found</h1>
      <p>The page you are looking for doesn't exist.</p>
      <a href="/">Go back to the Home Page</a>
    </body>
    </html>
  `;
  res.status(404).send(html);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
