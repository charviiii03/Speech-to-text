const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();
const mongoose = require("mongoose");

// MongoDB model
const Transcription = require("./models/Transcription");

const app = express();
const port = 5050;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5173","https://speech-frontend-5zfo.onrender.com"], // your frontend port
  credentials: true
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Multer setup
const upload = multer({ dest: "uploads/" });

// Routes
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

// Upload and transcribe audio
app.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    console.log("📥 Received file:", req.file);

    const audioBuffer = fs.readFileSync(req.file.path);
    const response = await axios.post(
      "https://api.deepgram.com/v1/listen",
      audioBuffer,
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "audio/webm",
        },
      }
    );

    const transcript = response.data.results.channels[0].alternatives[0].transcript;
    console.log("✅ Deepgram transcript:", transcript);

    // Save to MongoDB
    await Transcription.create({
      filename: req.file.originalname,
      text: transcript,
    });

    fs.unlinkSync(req.file.path); // clean up
    res.json({ transcript });
  } catch (err) {
    console.error("❌ Deepgram error:", err.response?.data || err.message);
    res.status(500).json({ transcript: "Error processing speech." });
  }
});

// Fetch transcription history
app.get("/history", async (req, res) => {
  try {
    const history = await Transcription.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// 🔥 Delete a specific transcription from history
app.delete("/history/:id", async (req, res) => {
  try {
    await Transcription.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
