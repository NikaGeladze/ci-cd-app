const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    version: process.env.npm_package_version || "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/greet/:name", (req, res) => {
  const { name } = req.params;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (name.length > 50) {
    return res
      .status(400)
      .json({ error: "Name must be 50 characters or fewer" });
  }
  res.json({ message: `Hello, ${name}! Deployed via CI/CD.` });
});

app.get("/api/add", (req, res) => {
  const a = parseFloat(req.query.a);
  const b = parseFloat(req.query.b);
  if (isNaN(a) || isNaN(b)) {
    return res
      .status(400)
      .json({ error: "Query params a and b must be numbers" });
  }
  res.json({ result: a + b });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

module.exports = app;
