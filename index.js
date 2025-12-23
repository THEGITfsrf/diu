import express from "express";

const app = express();
const PORT = 3000;

// API endpoints under /apx/api
app.get("/apx/api/time", (req, res) => {
  res.json({ time: new Date().toISOString() });
});

const quotes = [
  "Keep grinding, it pays off.",
  "Stay curious, stay winning.",
  "Every day is a chance to level up.",
  "Failure is just XP for your next try."
];

app.get("/apx/api/quote", (req, res) => {
  const random = quotes[Math.floor(Math.random() * quotes.length)];
  res.json({ quote: random });
});

// Serve /apx/ main page
app.get("/apx", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Mini API Example</title>
    <style>
      body { font-family: sans-serif; padding: 20px; }
      #time, #quote { margin-top: 10px; font-weight: bold; }
    </style>
  </head>
  <body>
    <h1>Welcome to /apx/ mini API!</h1>
    <div id="time"></div>
    <div id="quote"></div>
    <script>
      async function fetchData(endpoint) {
        const res = await fetch('/apx/api/' + endpoint);
        return res.json();
      }

      async function update() {
        const timeData = await fetchData('time');
        const quoteData = await fetchData('quote');
        document.getElementById('time').innerText = 'Current Time: ' + timeData.time;
        document.getElementById('quote').innerText = 'Quote: ' + quoteData.quote;
      }

      update();
      setInterval(update, 60000); // update every 60 sec
    </script>
  </body>
  </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/apx`);
});
