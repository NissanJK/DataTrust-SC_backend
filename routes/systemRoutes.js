const express = require("express");
const router = express.Router();
const { resetSystem } = require("../controllers/systemController");

// Reset entire system
router.post("/reset", resetSystem);

module.exports = router;
