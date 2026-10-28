const mongoose = require("mongoose");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const User = require("../models/User");

// @desc    Get all groups for current user
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
    try {
        const groups = await Group.find({
            members: req.user._id
        })
            .populate("members", "name email")
            .populate("createdBy", "name email")
            .sort({ updatedAt: -1 });

        return res.json(groups);
    } catch (error) {
        console.error("Get groups error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
    try {
        const { name, description, members = [] } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: "Group name is required" });
        }

        // Always include the logged in user as a member
        const memberIds = new Set();
        memberIds.add(req.user._id.toString());

        // Process provided members
        for (const m of members) {
            let memberId = typeof m === "string" ? m : m?._id || m?.id;
            if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
                memberIds.add(memberId.toString());
            } else if (typeof m === "string" && m.includes("@")) {
                // If an email was passed, find corresponding user
                const found = await User.findOne({ email: m.trim().toLowerCase() });
                if (found) {
                    memberIds.add(found._id.toString());
                }
            }
        }

        const group = await Group.create({
            name: name.trim(),
            description: description ? description.trim() : "",
            members: Array.from(memberIds),
            createdBy: req.user._id
        });

        const populatedGroup = await Group.findById(group._id)
            .populate("members", "name email")
            .populate("createdBy", "name email");

        return res.status(201).json(populatedGroup);
    } catch (error) {
        console.error("Create group error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get a single group by ID
// @route   GET /api/groups/:id
// @access  Private
const getGroupById = async (req, res) => {
    try {
        const groupId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({ message: "Invalid group ID format" });
        }

        const group = await Group.findById(groupId)
            .populate("members", "name email")
            .populate("createdBy", "name email");

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if user is a member
        const isMember = group.members.some(
            (m) => m._id.toString() === req.user._id.toString()
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not authorized to access this group" });
        }

        return res.json(group);
    } catch (error) {
        console.error("Get group by ID error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Update a group
// @route   PUT /api/groups/:id
// @access  Private
const updateGroup = async (req, res) => {
    try {
        const groupId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({ message: "Invalid group ID format" });
        }

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if user is a member
        const isMember = group.members.some(
            (m) => m.toString() === req.user._id.toString()
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not authorized to update this group" });
        }

        const { name, description, members } = req.body;

        if (name && name.trim().length > 0) {
            group.name = name.trim();
        }
        if (description !== undefined) {
            group.description = description.trim();
        }

        if (members && Array.isArray(members)) {
            const memberIds = new Set();
            memberIds.add(req.user._id.toString()); // Keep current user

            for (const m of members) {
                let id = typeof m === "string" ? m : m?._id || m?.id;
                if (id && mongoose.Types.ObjectId.isValid(id)) {
                    memberIds.add(id.toString());
                }
            }
            group.members = Array.from(memberIds);
        }

        await group.save();

        const updated = await Group.findById(group._id)
            .populate("members", "name email")
            .populate("createdBy", "name email");

        return res.json(updated);
    } catch (error) {
        console.error("Update group error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Delete a group
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = async (req, res) => {
    try {
        const groupId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({ message: "Invalid group ID format" });
        }

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if user is a member or creator
        const isMember = group.members.some(
            (m) => m.toString() === req.user._id.toString()
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not authorized to delete this group" });
        }

        await Group.findByIdAndDelete(groupId);
        // Cascade delete expenses & settlements
        await Expense.deleteMany({ group: groupId });
        await Settlement.deleteMany({ group: groupId });

        return res.json({ message: "Group and its associated records deleted successfully" });
    } catch (error) {
        console.error("Delete group error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getGroups,
    createGroup,
    getGroupById,
    updateGroup,
    deleteGroup
};
