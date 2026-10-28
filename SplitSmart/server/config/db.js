const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log(`MongoDB connected successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        console.error("👉 Make sure your IP address is whitelisted in MongoDB Atlas (Network Access -> Add IP Address -> Allow Access from Anywhere: 0.0.0.0/0)");
    }
};

module.exports = connectDB;
