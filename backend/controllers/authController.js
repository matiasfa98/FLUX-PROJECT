const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// ======================================
// CREATE JWT
// ======================================

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
};


// ======================================
// SIGNUP
// ======================================

const signup = async (req, res) => {
  try {
    const {
      username,
      email,
      password
    } = req.body;


    // Check fields

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required"
      });
    }


    // Check password length

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }


    // Check existing username

    const usernameExists = await User.findOne({
      username
    });

    if (usernameExists) {
      return res.status(409).json({
        message: "Username already exists"
      });
    }


    // Check existing email

    const emailExists = await User.findOne({
      email
    });

    if (emailExists) {
      return res.status(409).json({
        message: "Email already exists"
      });
    }


    // Hash password

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );


    // Create user

    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });


    // Create JWT

    const token = createToken(user);


    // Send response

    res.status(201).json({
      message: "Account created successfully",

      token,

      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }
    });

  } catch (error) {

    console.error("Signup error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// ======================================
// LOGIN
// ======================================

const login = async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;


    // Check fields

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }


    // Find user

    const user = await User.findOne({
      email
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }


    // Compare password

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }


    // Set user online

    user.status = "online";

    await user.save();


    // Create JWT

    const token = createToken(user);


    // Send response

    res.status(200).json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }
    });

  } catch (error) {

    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// ======================================
// GET CURRENT USER
// ======================================

const getMe = async (req, res) => {
  try {

    const user = await User
      .findById(req.user.id)
      .select("-password");


    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }


    res.status(200).json({
      user
    });

  } catch (error) {

    console.error("Get user error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


module.exports = {
  signup,
  login,
  getMe
};