const Dataset = require("../models/Dataset");
const BlockchainLog = require("../models/BlockchainLog");
const { decrypt } = require("../utils/crypto");
const { evaluatePolicy } = require("../utils/policy");

exports.requestAccess = async (req, res) => {
  try {
    const { category, role, attribute } = req.body;

    if (!category || !role || !attribute) {
      return res.status(400).json({ 
        message: "Missing required fields: category, role, and attribute are required" 
      });
    }

    const datasets = await Dataset.find({
      "metadata.Data_Category": category
    });

    if (!datasets.length) {
      return res.status(404).json({ 
        message: `No datasets found for category: ${category}` 
      });
    }

    const grantedRecords = [];

    for (const record of datasets) {
      const granted = evaluatePolicy(record.policy, role, attribute);

      await BlockchainLog.create({
        type: "ACCESS_REQUEST",
        hash: record.hash,
        role,
        attribute,
        policy: record.policy,
        granted
      });

      if (granted) {
        try {
          const decryptedData = decrypt(record.encryptedPayload);
          grantedRecords.push({
            hash: record.hash,
            data: decryptedData
          });
        } catch (decryptError) {
          console.error("Decryption error:", decryptError);
        }
      }
    }

    if (!grantedRecords.length) {
      return res.status(403).json({ 
        message: "Access denied: Policy requirements not met for any records" 
      });
    }

    res.json({
      category,
      count: grantedRecords.length,
      records: grantedRecords
    });

  } catch (error) {
    console.error("Access request error:", error);
    res.status(500).json({ 
      message: "Internal server error during access request" 
    });
  }
};

// FIXED: Return ALL logs without limit
exports.getLogs = async (req, res) => {
  try {
    // Remove .limit() to get all logs
    const logs = await BlockchainLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error("Get logs error:", error);
    res.status(500).json({ 
      message: "Failed to retrieve logs" 
    });
  }
};
