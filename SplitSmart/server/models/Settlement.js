const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: [true, "Group reference is required"]
        },
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "From user is required"]
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "To user is required"]
        },
        amount: {
            type: Number,
            required: [true, "Amount is required"],
            min: [0.01, "Amount must be greater than zero"]
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Settlement", settlementSchema);
