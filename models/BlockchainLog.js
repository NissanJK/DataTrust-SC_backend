const mongoose = require("mongoose");

const BlockchainLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["DATA_REGISTER", "ACCESS_REQUEST"],
    required: true
  },
  hash: String,
  role: String,
  owner: String,
  attribute: String, // FIXED: Added missing attribute field
  policy: String,
  granted: Boolean,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("BlockchainLog", BlockchainLogSchema);
