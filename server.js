require("dotenv").config();

const isDev = process.env.NODE_ENV !== "production";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "bian-store210",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: "lax",
    },
  })
);

// Middleware otentikasi admin
const authenticateAdmin = (req, res, next) => {
  const { username, password, token } = req.body;
  if (
    username === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD &&
    token === ADMIN_TOKEN
  ) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
};

// Middleware session admin
const isAdmin = (req, res, next) => {
  console.log("Session di isAdmin:", req.session);
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
};

// Log
app.use((req, res, next) => {
  if (isDev) console.log(`${req.method} ${req.url}`);
  next();
});

// Login admin
app.post("/admin-login", authenticateAdmin, (req, res) => {
  req.session.isAdmin = true;
  res.status(200).json({ message: "Login berhasil sebagai admin" });
});

// Logout admin
app.post("/admin-logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logout berhasil" });
  });
});

// Product(SQLite) //

// Ambil semua produk
app.get("/products", (req, res) => {
  try {
    const products = db
      .prepare("SELECT id, name, owner, version, price FROM products")
      .all();
    res.status(200).json(products);
  } catch (err) {
    if (isDev) console.error(err);
    res.status(500).json({ error: "Gagal mengambil produk." });
  }
});

// Tambah produk baru
app.post("/add-product", isAdmin, (req, res) => {
  let { name, owner, version, price } = req.body;

  name = (name || "").trim();
  owner = (owner || "").trim();
  version = (version || "").trim();

  if (typeof price === "string") price = price.replace(/\D/g, "");
  price = Number(price);

  if (!name || !owner || !version || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "Field tidak valid." });
  }

  try {
    db.prepare(
      "INSERT INTO products (name, owner, version, price) VALUES (?, ?, ?, ?)"
    ).run(name, owner, version, price);

    res.status(200).json({ message: "Produk berhasil ditambahkan!" });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT") {
      return res
        .status(409)
        .json({ error: "Produk dengan nama & versi ini sudah ada." });
    }
    console.error("Error add‑product:", err);
    res.status(500).json({ error: "Gagal menambahkan produk (server)." });
  }
});

// Hapus produk
app.delete("/products/by-name/:name", isAdmin, (req, res) => {
  const productName = decodeURIComponent(req.params.name).toLowerCase();

  try {
    const { changes } = db
      .prepare("DELETE FROM products WHERE LOWER(name) = ?")
      .run(productName);

    if (changes === 0) {
      return res.status(404).json({ error: "Produk tidak ditemukan." });
    }

    res.json({ message: "Produk berhasil dihapus." });
  } catch (err) {
    if (isDev) console.error(err);
    res.status(500).json({ error: "Gagal menghapus produk." });
  }
});

// End Product //

// 404 handler
app.use((req, res) => {
  if (isDev) console.log("Halaman tidak ditemukan:", req.url);
  res.status(404).send("Halaman tidak ditemukan.");
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  if (isDev) console.log(`Server berjalan di http://localhost:${PORT}`);
});
