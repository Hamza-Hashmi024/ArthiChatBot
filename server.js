const express = require("express");
const dotenv = require("dotenv");
const chatRouter = require("./routes/chat");
const pool = require("./config/db");
const cors = require("cors");


dotenv.config();

const app = express();


app.use(express.json());

app.use(cors({
  origin: "*", 
  methods: ["GET", "POST"]
}));
app.use("/api", chatRouter);
// Test Route
app.get("/", (req, res) => {
  res.send("SQL Chatbot Server is Running ");
});

app.listen(5000, () => {
  console.log(" Server running on http://localhost:5000");
});

