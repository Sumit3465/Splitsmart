const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Group = require("../models/Group");

// @desc    Get expenses (optionally filter by ?groupId=...)
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
    try {
        const { groupId } = req.query;

        if (groupId) {
            if (!mongoose.Types.ObjectId.isValid(groupId)) {
                return res.status(400).json({ message: "Invalid group ID format" });
            }

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: "Group not found" });
            }

            const isMember = group.members.some(
                (m) => m.toString() === req.user._id.toString()
            );
            if (!isMember) {
                return res.status(403).json({ message: "Not authorized to access this group's expenses" });
            }

            const expenses = await Expense.find({ group: groupId })
                .populate("paidBy", "name email")
                .populate("participants", "name email")
                .populate("group", "name")
                .sort({ date: -1, createdAt: -1 });

            return res.json(expenses);
        }

        // Return expenses for all groups user belongs to
        const userGroups = await Group.find({ members: req.user._id }).select("_id");
        const groupIds = userGroups.map((g) => g._id);

        const expenses = await Expense.find({ group: { $in: groupIds } })
            .populate("paidBy", "name email")
            .populate("participants", "name email")
            .populate("group", "name")
            .sort({ date: -1, createdAt: -1 });

        return res.json(expenses);
    } catch (error) {
        console.error("Get expenses error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
    try {
        const { group, description, amount, paidBy, participants, category, date } = req.body;

        if (!group || !mongoose.Types.ObjectId.isValid(group)) {
            return res.status(400).json({ message: "A valid group ID is required" });
        }

        if (!description || description.trim().length === 0) {
            return res.status(400).json({ message: "Description is required" });
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ message: "Amount must be a positive number" });
        }

        // Fetch group to verify existence and membership
        const groupDoc = await Group.findById(group);
        if (!groupDoc) {
            return res.status(404).json({ message: "Group not found" });
        }

        const isUserInGroup = groupDoc.members.some(
            (m) => m.toString() === req.user._id.toString()
        );
        if (!isUserInGroup) {
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        // Payer defaults to logged in user if not specified
        const payerId = paidBy || req.user._id;
        if (!mongoose.Types.ObjectId.isValid(payerId)) {
            return res.status(400).json({ message: "Invalid payer ID format" });
        }

        const isPayerInGroup = groupDoc.members.some(
            (m) => m.toString() === payerId.toString()
        );
        if (!isPayerInGroup) {
            return res.status(400).json({ message: "The payer must be a member of the group" });
        }

        // Validate participants (default to all group members if not specified or empty)
        let participantIds = [];
        if (Array.isArray(participants) && participants.length > 0) {
            for (const p of participants) {
                const pId = typeof p === "string" ? p : p?._id;
                if (!pId || !mongoose.Types.ObjectId.isValid(pId)) {
                    return res.status(400).json({ message: `Invalid participant ID: ${pId}` });
                }
                const isPartInGroup = groupDoc.members.some(
                    (m) => m.toString() === pId.toString()
                );
                if (!isPartInGroup) {
                    return res.status(400).json({ message: "All participants must be members of the group" });
                }
                participantIds.push(pId);
            }
        } else {
            // Default to all members of the group
            participantIds = groupDoc.members;
        }

        const expense = await Expense.create({
            group,
            description: description.trim(),
            amount: Math.round((numAmount + Number.EPSILON) * 100) / 100,
            paidBy: payerId,
            participants: participantIds,
            category: category || "Other",
            date: date ? new Date(date) : new Date()
        });

        const populatedExpense = await Expense.findById(expense._id)
            .populate("paidBy", "name email")
            .populate("participants", "name email")
            .populate("group", "name");

        return res.status(201).json(populatedExpense);
    } catch (error) {
        console.error("Create expense error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get expense by ID
// @route   GET /api/expenses/:id
// @access  Private
const getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid expense ID format" });
        }

        const expense = await Expense.findById(id)
            .populate("paidBy", "name email")
            .populate("participants", "name email")
            .populate("group", "name members");

        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        // Check if user is in group
        const isMember = expense.group.members.some(
            (m) => m.toString() === req.user._id.toString()
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not authorized to access this expense" });
        }

        return res.json(expense);
    } catch (error) {
        console.error("Get expense by ID error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid expense ID format" });
        }

        const expense = await Expense.findById(id).populate("group");
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        // Check membership
        const isMember = expense.group.members.some(
            (m) => m.toString() === req.user._id.toString()
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not authorized to modify this expense" });
        }

        const { description, amount, paidBy, participants, category, date } = req.body;

        if (description) expense.description = description.trim();
        if (amount) {
            const num = Number(amount);
            if (isNaN(num) || num <= 0) {
                return res.status(400).json({ message: "Amount must be a positive number" });
            }
            expense.amount = Math.round((num + Number.EPSILON) * 100) / 100;
        }
        if (category) expense.category = category;
        if (date) expense.date = new Date(date);

        if (paidBy) {
            if (!mongoose.Types.ObjectId.isValid(paidBy)) {
                return res.status(400).json({ message: "Invalid payer ID" });
            }
            expense.paidBy = paidBy;
        }

        if (participants && Array.isArray(participants)) {
            expense.participants = participants;
        }

        await expense.save();

        const updated = await Expense.findById(expense._id)
            .populate("paidBy", "name email")
            .populate("participants", "name email")
            .populate("group", "name");

        return res.json(updated);
    } catch (error) {
        console.error("Update expense error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid expense ID format" });
        }

        const expense = await Expense.findById(id).populate("group");
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        const isMember = expense.group.members.some(
            (m) => m.toString() === req.user._id.toString()
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not authorized to delete this expense" });
        }

        await Expense.findByIdAndDelete(id);

        return res.json({ message: "Expense deleted successfully" });
    } catch (error) {
        console.error("Delete expense error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getExpenses,
    createExpense,
    getExpenseById,
    updateExpense,
    deleteExpense
};
