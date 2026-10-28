const express = require("express");
const router = express.Router();
const {
    getGroups,
    createGroup,
    getGroupById,
    updateGroup,
    deleteGroup
} = require("../controllers/groupController");
const {
    getGroupBalances,
    settleGroup,
    getGroupSettlements
} = require("../controllers/settlementController");
const { protect } = require("../middleware/authMiddleware");

// All group routes are protected
router.use(protect);

router.route("/")
    .get(getGroups)
    .post(createGroup);

router.route("/:id")
    .get(getGroupById)
    .put(updateGroup)
    .delete(deleteGroup);

router.get("/:id/balances", getGroupBalances);
router.post("/:id/settle", settleGroup);
router.get("/:id/settlements", getGroupSettlements);

module.exports = router;
