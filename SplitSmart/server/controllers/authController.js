const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper to generate JWT token
const generateToken = (id) => {
    const secret = process.env.JWT_SECRET || "splitsmart_default_secret_2026";
    return jwt.sign({ id }, secret, {
        expiresIn: "30d"
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Please provide name, email, and password" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check for existing user
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ message: "User with this email already exists" });
        }

        // Create new user
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password
        });

        if (user) {
            return res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            return res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user by email
        const user = await User.findOne({ email: normalizedEmail });

        if (user && (await user.matchPassword(password))) {
            return res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            return res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json(req.user);
    } catch (error) {
        console.error("GetMe error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Search users by email or name (for adding to groups)
// @route   GET /api/auth/search?query=...
// @access  Private
const searchUsers = async (req, res) => {
    try {
        const query = req.query.query;
        if (!query || query.trim().length === 0) {
            return res.json([]);
        }

        const regex = new RegExp(query.trim(), "i");
        const users = await User.find({
            $or: [{ email: regex }, { name: regex }]
        }).select("_id name email").limit(10);

        return res.json(users);
    } catch (error) {
        console.error("Search users error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    searchUsers
};
