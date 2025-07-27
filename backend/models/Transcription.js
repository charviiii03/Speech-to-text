const mongoose = require("mongoose");

const transcriptionSchema = new mongoose.Schema({
  filename: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transcription", transcriptionSchema);
