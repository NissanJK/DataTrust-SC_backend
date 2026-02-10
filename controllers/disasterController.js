const Dataset = require("../models/Dataset");
const { analyzeDataForDisasters, THRESHOLDS } = require("../utils/disasterMonitoring");

/**
 * Get disaster alerts for all sectors
 * FIXED: Only analyzes last 10 records per sector for real-time updates
 */
exports.getDisasterAlerts = async (req, res) => {
  try {
    const sectors = ['sector1', 'sector2', 'sector3', 'sector4', 'sector5'];
    const allDataToAnalyze = [];
    
    // FIXED: Get only last 10 records per sector (not last 24 hours)
    for (const sector of sectors) {
      const sectorData = await Dataset.find({
        "metadata.Sector": sector
      }).sort({ createdAt: -1 }).limit(10);
      
      allDataToAnalyze.push(...sectorData);
    }

    const { alerts, sectorStats } = analyzeDataForDisasters(allDataToAnalyze);

    res.json({
      success: true,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
      warningAlerts: alerts.filter(a => a.severity === 'WARNING').length,
      cautionAlerts: alerts.filter(a => a.severity === 'CAUTION').length,
      alerts,
      sectorStats,
      dataAnalyzed: allDataToAnalyze.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error("Disaster alerts error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to generate disaster alerts",
      error: error.message 
    });
  }
};

/**
 * Get alerts for specific sector
 * FIXED: Only analyzes last 10 records for real-time updates
 */
exports.getSectorAlerts = async (req, res) => {
  try {
    const { sector } = req.params;

    if (!sector || !sector.match(/^sector[1-5]$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sector. Use sector1, sector2, sector3, sector4, or sector5"
      });
    }

    // FIXED: Only get last 10 records (not 100)
    const sectorData = await Dataset.find({
      "metadata.Sector": sector
    }).sort({ createdAt: -1 }).limit(10);

    if (sectorData.length === 0) {
      return res.json({
        success: true,
        sector,
        alerts: [],
        message: "No data available for this sector"
      });
    }

    const { alerts } = analyzeDataForDisasters(sectorData);

    res.json({
      success: true,
      sector,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
      alerts,
      dataAnalyzed: sectorData.length
    });

  } catch (error) {
    console.error("Sector alerts error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to get sector alerts",
      error: error.message 
    });
  }
};

/**
 * Get sector statistics and current status
 * UPDATED: Uses only last 10 records for real-time dynamic status
 */
exports.getSectorStats = async (req, res) => {
  try {
    const sectors = ['sector1', 'sector2', 'sector3', 'sector4', 'sector5'];
    const stats = {};

    for (const sector of sectors) {
      // FIXED: Only last 10 records for real-time status (updates dynamically)
      const sectorData = await Dataset.find({
        "metadata.Sector": sector
      }).sort({ createdAt: -1 }).limit(10);

      if (sectorData.length === 0) {
        stats[sector] = {
          status: 'NO_DATA',
          recordCount: 0
        };
        continue;
      }

      // Get latest readings
      const latest = sectorData[0].metadata;
      
      // Calculate averages
      const validTemp = sectorData
        .map(d => d.metadata.Temperature_C)
        .filter(t => t !== null && t !== undefined);
      
      const validAQI = sectorData
        .map(d => d.metadata.Air_Quality_Index)
        .filter(a => a !== null && a !== undefined);
      
      const validTraffic = sectorData
        .map(d => d.metadata.Traffic_Density)
        .filter(t => t !== null && t !== undefined);
      
      const validEnergy = sectorData
        .map(d => d.metadata.Energy_Consumption_kWh)
        .filter(e => e !== null && e !== undefined);

      const avgTemp = validTemp.length > 0 
        ? validTemp.reduce((a, b) => a + b, 0) / validTemp.length 
        : null;
      
      const avgAQI = validAQI.length > 0 
        ? validAQI.reduce((a, b) => a + b, 0) / validAQI.length 
        : null;
      
      const avgTraffic = validTraffic.length > 0 
        ? validTraffic.reduce((a, b) => a + b, 0) / validTraffic.length 
        : null;
      
      const avgEnergy = validEnergy.length > 0 
        ? validEnergy.reduce((a, b) => a + b, 0) / validEnergy.length 
        : null;

      // Determine overall status
      let status = 'NORMAL';
      if (
        (avgTemp && avgTemp >= 38) ||
        (avgAQI && avgAQI >= 250) ||
        (avgTraffic && avgTraffic >= 85) ||
        (avgEnergy && avgEnergy >= 500)
      ) {
        status = 'CRITICAL';
      } else if (
        (avgTemp && avgTemp >= 35) ||
        (avgAQI && avgAQI >= 200) ||
        (avgTraffic && avgTraffic >= 70) ||
        (avgEnergy && avgEnergy >= 450)
      ) {
        status = 'WARNING';
      } else if (
        (avgTemp && avgTemp >= 32) ||
        (avgAQI && avgAQI >= 150) ||
        (avgTraffic && avgTraffic >= 50) ||
        (avgEnergy && avgEnergy >= 350)
      ) {
        status = 'CAUTION';
      }

      stats[sector] = {
        status,
        recordCount: sectorData.length,
        latest: {
          temperature: latest.Temperature_C,
          aqi: latest.Air_Quality_Index,
          traffic: latest.Traffic_Density,
          energy: latest.Energy_Consumption_kWh,
          timestamp: sectorData[0].createdAt
        },
        averages: {
          temperature: avgTemp ? parseFloat(avgTemp.toFixed(2)) : null,
          aqi: avgAQI ? parseFloat(avgAQI.toFixed(2)) : null,
          traffic: avgTraffic ? parseFloat(avgTraffic.toFixed(2)) : null,
          energy: avgEnergy ? parseFloat(avgEnergy.toFixed(2)) : null
        }
      };
    }

    res.json({
      success: true,
      sectors: stats,
      timestamp: new Date()
    });

  } catch (error) {
    console.error("Sector stats error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to get sector statistics",
      error: error.message 
    });
  }
};

/**
 * Get disaster thresholds
 */
exports.getThresholds = async (req, res) => {
  try {
    res.json({
      success: true,
      thresholds: THRESHOLDS
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Failed to get thresholds" 
    });
  }
};