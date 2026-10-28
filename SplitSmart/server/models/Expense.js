const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: [true, "Group reference is required"]
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true
        },
        amount: {
            type: Number,
            required: [true, "Amount is required"],
            min: [0.01, "Amount must be greater than zero"]
        },
        category: {
            type: String,
            default: "Other"
        },
        date: {
            type: Date,
            default: Date.now
        },
        paidBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Payer is required"]
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Expense", expenseSchema);
