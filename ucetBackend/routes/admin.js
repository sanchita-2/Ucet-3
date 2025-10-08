import express from "express";
import pool from "../db.js";   // notice .js extension required in ESM
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = express.Router();

// Middleware to check admin auth
function verifyAdmin(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Unauthorized" });
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Not admin" });
    }
    req.user = decoded;
    next();
  });
}

// =======================
// NEWS
// =======================
router.post("/news", verifyAdmin, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: "Title and content required" });
  }
  try {
    await pool.query("INSERT INTO news (title, content) VALUES (?, ?)", [
      title,
      content,
    ]);
    res.json({ message: "News added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/news", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM news ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// RESOURCES
// =======================
router.post("/resources", verifyAdmin, async (req, res) => {
  const { title, link } = req.body;
  if (!title || !link) {
    return res.status(400).json({ message: "Title and link required" });
  }
  try {
    await pool.query("INSERT INTO resources (title, link) VALUES (?, ?)", [
      title,
      link,
    ]);
    res.json({ message: "Resource added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/resources", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM resources ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
// Update news
router.put("/news/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  await pool.query("UPDATE news SET title=?, content=? WHERE id=?", [
    title,
    content,
    id,
  ]);
  res.json({ message: "News updated" });
});

// Delete news
router.delete("/news/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM news WHERE id=?", [id]);
  res.json({ message: "News deleted" });
});

// Update resource
router.put("/resources/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, link } = req.body;
  await pool.query("UPDATE resources SET title=?, link=? WHERE id=?", [
    title,
    link,
    id,
  ]);
  res.json({ message: "Resource updated" });
});

// Delete resource
router.delete("/resources/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM resources WHERE id=?", [id]);
  res.json({ message: "Resource deleted" });
});
