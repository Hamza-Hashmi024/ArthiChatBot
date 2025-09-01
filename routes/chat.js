const express = require("express");
const { chatWithDB, getSchema } = require("../controllers/chatController");

const router = express.Router();

// Routes
router.post("/chat", chatWithDB);
router.get("/schema", getSchema);

module.exports = router;