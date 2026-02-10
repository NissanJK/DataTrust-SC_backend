const Dataset = require("../models/Dataset");
const BlockchainLog = require("../models/BlockchainLog");

/**
 * Reset entire system - delete all data from database
 */
exports.resetSystem = async (req, res) => {
  try {
    console.log("🔄 System reset requested...");

    // Delete all datasets
    const datasetsDeleted = await Dataset.deleteMany({});
    console.log(`✅ Deleted ${datasetsDeleted.deletedCount} datasets`);

    // Delete all blockchain logs
    const logsDeleted = await BlockchainLog.deleteMany({});
    console.log(`✅ Deleted ${logsDeleted.deletedCount} blockchain logs`);

    res.json({
      success: true,
      message: "System reset successful",
      deleted: {
        datasets: datasetsDeleted.deletedCount,
        logs: logsDeleted.deletedCount
      }
    });

    console.log("✅ System reset complete!");

  } catch (error) {
    console.error("❌ Reset error:", error);
    res.status(500).json({
      success: false,
      message: "Reset failed",
      error: error.message
    });
  }
};
