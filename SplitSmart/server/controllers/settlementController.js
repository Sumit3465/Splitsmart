const mongoose = require("mongoose");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const optimizeSettlements = require("../algorithms/settlement");

// Helper: Calculate group balances from MongoDB expenses
async function calculateGroupBalancesHelper(groupId) {
    const group = await Group.findById(groupId).populate("members", "name email");
    if (!group) return null;

    const expenses = await Expense.find({ group: groupId }).populate("paidBy", "name email").populate("participants", "name email");

    // Initialize balance map for each group member
    const balanceMap = {};
    for (const member of group.members) {
        const idStr = member._id.toString();
        balanceMap[idStr] = {
            memberId: idStr,
            name: member.name,
            email: member.email,
            paidCents: 0,
            owedCents: 0
        };
    }

    for (const expense of expenses) {
        const totalCents = Math.round((expense.amount + Number.EPSILON) * 100);
        const payerId = expense.paidBy._id.toString();

        if (balanceMap[payerId]) {
            balanceMap[payerId].paidCents += totalCents;
        }

        const participants = expense.participants.length > 0 ? expense.participants : group.members;
        const count = participants.length;
        if (count > 0) {
            const baseCents = Math.floor(totalCents / count);
            let remainderCents = totalCents - (baseCents * count);

            for (const participant of participants) {
                const partId = participant._id.toString();
                let shareCents = baseCents;
                if (remainderCents > 0) {
                    shareCents += 1;
                    remainderCents -= 1;
                }

                if (balanceMap[partId]) {
                    balanceMap[partId].owedCents += shareCents;
                }
            }
        }
    }

    // Convert to readable currency amounts and compute net balance
    return Object.values(balanceMap).map((item) => {
        const netCents = item.paidCents - item.owedCents;
        return {
            memberId: item.memberId,
            name: item.name,
            email: item.email,
            paid: item.paidCents / 100,
            owed: item.owedCents / 100,
            balance: netCents / 100
        };
    });
}

// @desc    Get current calculated balances for a group
// @route   GET /api/groups/:id/balances
// @access  Private
async function getGroupBalances(req, res) {
    try {
        const groupId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({ message: "Invalid group ID format" });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Verify user is a member of the group
        const isMember = group.members.some(
            (m) => m.toString() === req.user._id.toString()
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not authorized to access this group" });
        }

        const balances = await calculateGroupBalancesHelper(groupId);
        return res.json({ groupId, balances });
    } catch (error) {
        console.error("Get balances error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

// @desc    Calculate and persist optimized settlements for a group
// @route   POST /api/groups/:id/settle
// @access  Private
async function settleGroup(req, res) {
    try {
        const groupId = req.params.id;

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
            return res.status(403).json({ message: "Not authorized to settle this group" });
        }

        let balances = req.body.balances;

        // If balances were not provided in request body, calculate them from database
        if (!balances || !Array.isArray(balances) || balances.length === 0) {
            balances = await calculateGroupBalancesHelper(groupId);
        } else {
            // Validate provided balances
            for (const person of balances) {
                if (!person.memberId || !mongoose.Types.ObjectId.isValid(person.memberId)) {
                    return res.status(400).json({
                        message: `Invalid member ID format for member: ${person.name || person.memberId}`
                    });
                }
                if (typeof person.balance !== "number" || isNaN(person.balance)) {
                    return res.status(400).json({
                        message: "Each member balance must be a valid number"
                    });
                }
            }
        }

        // Run optimized settlement algorithm
        const transactions = optimizeSettlements(balances);

        // Remove previous settlements for this group
        await Settlement.deleteMany({ group: groupId });

        // Save new settlements using real User ObjectIds
        const settlementsToSave = transactions.map((t) => ({
            group: groupId,
            from: t.from,
            to: t.to,
            amount: t.amount
        }));

        if (settlementsToSave.length > 0) {
            await Settlement.insertMany(settlementsToSave);
        }

        return res.json({
            groupId,
            transactions,
            transactionCount: transactions.length
        });
    } catch (error) {
        console.error("Settlement error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

// @desc    Get saved settlements for a group
// @route   GET /api/groups/:id/settlements
// @access  Private
async function getGroupSettlements(req, res) {
    try {
        const groupId = req.params.id;

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
            return res.status(403).json({ message: "Not authorized to access this group" });
        }

        const settlements = await Settlement.find({ group: groupId })
            .populate("from", "name email")
            .populate("to", "name email")
            .sort({ createdAt: -1 });

        return res.json({ groupId, settlements });
    } catch (error) {
        console.error("Get settlements error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

module.exports = {
    getGroupBalances,
    settleGroup,
    getGroupSettlements,
    calculateGroupBalancesHelper
};
