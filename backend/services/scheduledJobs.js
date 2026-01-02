import cron from "node-cron";
import { processExpiredBatches } from "./batchService.js";
import User from "../models/User.js";

/**
 * Scheduled Jobs for Batch Management
 * Handles automatic expiration checking and spoilage creation
 */

let isJobRunning = false;

/**
 * Get system user for automated operations
 */
const getSystemUser = async () => {
  try {
    // Try to find an admin user for system operations
    let systemUser = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
    
    // If no admin found, use the first user
    if (!systemUser) {
      systemUser = await User.findOne().sort({ createdAt: 1 });
    }
    
    // If still no user found, create a system user
    if (!systemUser) {
      console.warn("⚠️ No users found, creating system user for automated operations");
      systemUser = await User.create({
        username: "system",
        email: "system@inventory.local",
        password: "system123",
        role: "admin",
        firstName: "System",
        lastName: "Automated"
      });
    }
    
    return systemUser._id;
  } catch (error) {
    console.error("Error getting system user:", error);
    throw error;
  }
};

/**
 * Check for expired batches and create automatic spoilage records
 */
const checkExpiredBatches = async () => {
  if (isJobRunning) {
    console.log("⏳ Expiration check already running, skipping...");
    return;
  }
  
  try {
    isJobRunning = true;
    console.log("🔍 Starting automatic expiration check...");
    
    const systemUserId = await getSystemUser();
    const result = await processExpiredBatches(systemUserId);
    
    if (result.processedBatches > 0) {
      console.log(`Automatic expiration check completed:`);
      console.log(`   - Processed ${result.processedBatches} expired batches`);
      console.log(`   - Created ${result.spoilageRecords} spoilage records`);
      console.log(`   - Affected ${result.expiredIngredients} ingredients`);
    } else {
      console.log("✅ Automatic expiration check completed - no expired batches found");
    }
    
  } catch (error) {
    console.error("Error in automatic expiration check:", error);
  } finally {
    isJobRunning = false;
  }
};

/**
 * Initialize scheduled jobs
 */
export const initializeScheduledJobs = async () => {
  try {
    console.log("🕐 Initializing scheduled jobs...");
    
    // Run expiration check every hour
    cron.schedule("0 * * * *", async () => {
      console.log("⏰ Running hourly expiration check...");
      await checkExpiredBatches();
    }, {
      scheduled: true,
      timezone: "Asia/Manila" // Adjust timezone as needed
    });
    
    // Run expiration check every day at 6 AM
    cron.schedule("0 6 * * *", async () => {
      console.log("⏰ Running daily expiration check...");
      await checkExpiredBatches();
    }, {
      scheduled: true,
      timezone: "Asia/Manila" // Adjust timezone as needed
    });
    
    // Run expiration check at server startup (after 30 seconds)
    setTimeout(async () => {
      console.log("🚀 Running startup expiration check...");
      await checkExpiredBatches();
    }, 30000);
    
    console.log("Scheduled jobs initialized:");
    console.log("   - Hourly expiration check: 0 * * * *");
    console.log("   - Daily expiration check: 0 6 * * *");
    console.log("   - Startup check: 30 seconds after server start");
    
    return true;
  } catch (error) {
    console.error("Error initializing scheduled jobs:", error);
    throw error;
  }
};

/**
 * Manual trigger for expiration check (for testing)
 */
export const triggerExpirationCheck = async () => {
  console.log("Manual expiration check triggered...");
  await checkExpiredBatches();
};

export default {
  initializeScheduledJobs,
  triggerExpirationCheck,
  checkExpiredBatches
};