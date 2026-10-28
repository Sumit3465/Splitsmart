const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const secret = process.env.JWT_SECRET || "splitsmart_default_secret_2026";
            const decoded = jwt.verify(token, secret);

            req.user = await User.findById(decoded.id).select("-password");

            if (!req.user) {
                return res.status(401).json({ message: "User not found with this token" });
            }

            return next();
        } catch (error) {
            console.error("Auth error:", error.message);
            return res.status(401).json({ message: "Not authorized, token invalid or expired" });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token provided" });
    }
};

module.exports = { protect };
