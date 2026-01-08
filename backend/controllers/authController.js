// controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* ============================
   🔐 SIGNUP
============================ */
const signup = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Cloudinary URL
    const avatar = req.file ? req.file.path : "";

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar,
    });

    res.status(201).json({
      message: "Signup successful",
      user,
    });
  } 
  catch (err) {
    console.error("SIGNUP ERROR ❌", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


/* ============================
   🔐 LOGIN
============================ */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        about: user.about,
      },
    });
  } catch (error) {
    console.error("Login error ❌", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   LOGOUT
========================= */
const logout = (req, res) => {
  res.clearCookie("token");

  res.status(200).json({
    message: "Logged out successfully",
  });
};


// backend/controllers/authController.js

const getMe = async (req, res) => {
  try {
    res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { signup, login, logout, getMe };

