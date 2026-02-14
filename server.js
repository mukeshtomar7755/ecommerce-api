const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();
const auth = require("./authMiddleware");
const User = require("./models/user"); // 👈 FIXED PATH
const Product = require("./models/product");


const app = express();
app.use(cors());
app.use(express.json());

// Home
app.get("/", (req, res) => {
  res.send("Login API Running 🚀");
});

// 🔐 Register API (single, clean version)
app.post("/api/register", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashed = bcrypt.hashSync(password, 8);

    const user = new User({
      email,
      password: hashed,
      role: role || "Agent",
    });

    await user.save();
    res.json({ message: "User registered successfully ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔐 Login API
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User not found" });

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔐 Protected APIs
app.get("/api/profile", auth, (req, res) => {
  res.json({
    message: "You are authorized 🎉",
    userId: req.userId,
    role: req.userRole,
  });
});

app.get("/api/admin-only", auth, (req, res) => {
  if (req.userRole !== "SuperAdmin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  res.json({ message: "Welcome SuperAdmin" });
});

app.get("/api/products", async (req, res) => {
  const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
  res.json(products);
});

app.post("/api/products", auth, async (req, res) => {
  if (req.userRole !== "Admin" && req.userRole !== "SuperAdmin") {
    return res.status(403).json({ message: "Only Admin can add products" });
  }

  const { name, description, imageUrl, category, stock } = req.body;

  const rawPrice = req.body.price;
  const price = Number(String(rawPrice).replace(/[^0-9.]/g, ""));

  if (!price || isNaN(price)) {
    return res.status(400).json({ message: "Invalid price" });
  }

  if (!name || !price) {
    return res.status(400).json({ message: "Name and price required" });
  }

  const product = new Product({
    name,
    price,
    description,
    imageUrl,
    category,
    stock,
  });

  await product.save();
  res.json({ message: "Product created ✅", product });
});

app.delete("/api/products/:id", auth, async (req, res) => {
  if (req.userRole !== "Admin" && req.userRole !== "SuperAdmin") {
    return res.status(403).json({ message: "Only Admin can delete products" });
  }

  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Product deleted 🗑️" });
});

app.post("/api/products/bulk", auth, async (req, res) => {
  // console.log("REQ BODY:", req.body);
  if (req.userRole !== "Admin" && req.userRole !== "SuperAdmin") {
    return res.status(403).json({ message: "Only Admin can add products" });
  }

  const products = req.body; // array expected

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: "Send array of products" });
  }

  const created = await Product.insertMany(products);
  res.json({ message: `${created.length} products added ✅`, created });
});



// 🔌 MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB error ❌", err));

// ▶️ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
