// server/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const getAllHackathons = require('./design-hackathon-scraper/allHackathon');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// File paths for storing scraped data
const DATA_DIR = path.join(__dirname, 'data');
const HACKATHONS_FILE = path.join(DATA_DIR, 'hackathons.json');
const SCRAPING_LOG_FILE = path.join(DATA_DIR, 'scraping-log.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('📁 Created data directory');
  }
}

// Remove duplicates from hackathons array
function removeDuplicates(hackathons) {
  const seen = new Set();
  const uniqueHackathons = [];
  let duplicatesRemoved = 0;

  for (const hackathon of hackathons) {
    // Create a unique key based on title and link
    const title = hackathon.title?.toLowerCase().trim() || '';
    const link = hackathon.link?.toLowerCase().trim() || '';
    const key = `${title}|${link}`;
    
    if (!seen.has(key) && key !== '|') {
      seen.add(key);
      uniqueHackathons.push(hackathon);
    } else {
      duplicatesRemoved++;
    }
  }

  if (duplicatesRemoved > 0) {
    console.log(`🧹 Removed ${duplicatesRemoved} duplicate hackathons`);
  }

  return uniqueHackathons;
}

// Save hackathons data to JSON file
async function saveHackathonsToFile(hackathons) {
  try {
    await ensureDataDirectory();
    
    // Remove duplicates before saving
    const uniqueHackathons = removeDuplicates(hackathons);
    
    const timestamp = new Date().toISOString();
    const dataToSave = {
      timestamp,
      totalCount: uniqueHackathons.length,
      hackathons: uniqueHackathons
    };
    
    await fs.writeFile(HACKATHONS_FILE, JSON.stringify(dataToSave, null, 2));
    console.log(`💾 Saved ${uniqueHackathons.length} unique hackathons to ${HACKATHONS_FILE}`);
    
    // Also save to scraping log
    const logEntry = {
      timestamp,
      totalHackathons: uniqueHackathons.length,
      originalCount: hackathons.length,
      duplicatesRemoved: hackathons.length - uniqueHackathons.length,
      sources: {
        devpost: uniqueHackathons.filter(h => h.hostedBy || h.title.includes('Devpost')).length,
        unstop: uniqueHackathons.filter(h => h.host || h.link?.includes('unstop')).length,
        cumulus: uniqueHackathons.filter(h => h.link?.includes('cumulus')).length,
        allHackathons: uniqueHackathons.filter(h => h.link?.includes('allhackathons')).length
      }
    };
    
    let logData = [];
    try {
      const existingLog = await fs.readFile(SCRAPING_LOG_FILE, 'utf8');
      logData = JSON.parse(existingLog);
    } catch {
      // File doesn't exist, start with empty array
    }
    
    logData.push(logEntry);
    await fs.writeFile(SCRAPING_LOG_FILE, JSON.stringify(logData, null, 2));
    
    return dataToSave;
  } catch (error) {
    console.error('❌ Error saving data:', error);
    throw error;
  }
}

// Load hackathons from JSON file
async function loadHackathonsFromFile() {
  try {
    const data = await fs.readFile(HACKATHONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('📄 No existing data file found');
    return null;
  }
}

// Cleanup configuration
const CLEANUP_EXPIRED_AFTER_DAYS = parseInt(process.env.CLEANUP_EXPIRED_AFTER_DAYS) || 30; // Keep expired for 30 days
const CLEANUP_INACTIVE_AFTER_DAYS = parseInt(process.env.CLEANUP_INACTIVE_AFTER_DAYS) || 90; // Keep inactive for 90 days

// Update status of hackathons based on deadlines
function updateHackathonStatus(hackathons) {
  const now = new Date();
  let activeCount = 0;
  let expiredCount = 0;
  
  const updatedHackathons = hackathons.map(hackathon => {
    let status = 'active';
    let deadline = null;
    
    // Extract deadline from various fields
    if (hackathon.deadline) {
      deadline = new Date(hackathon.deadline);
    } else if (hackathon.applyBy) {
      deadline = new Date(hackathon.applyBy);
    } else if (hackathon.registrationDeadline) {
      deadline = new Date(hackathon.registrationDeadline);
    } else if (hackathon.endDate) {
      deadline = new Date(hackathon.endDate);
    }
    
    // Check if expired
    if (deadline && deadline < now) {
      status = 'expired';
      expiredCount++;
    } else {
      activeCount++;
    }
    
    return {
      ...hackathon,
      status,
      deadline: deadline ? deadline.toISOString() : null,
      lastUpdated: new Date().toISOString()
    };
  });
  
  console.log(`📊 Status Update: ${activeCount} active, ${expiredCount} expired`);
  return updatedHackathons;
}

// Clean up old expired and inactive hackathons
function cleanupOldHackathons(hackathons) {
  const now = new Date();
  const expiredCutoff = new Date(now.getTime() - (CLEANUP_EXPIRED_AFTER_DAYS * 24 * 60 * 60 * 1000));
  const inactiveCutoff = new Date(now.getTime() - (CLEANUP_INACTIVE_AFTER_DAYS * 24 * 60 * 60 * 1000));
  
  let removedCount = 0;
  const cleanedHackathons = hackathons.filter(hackathon => {
    let shouldRemove = false;
    
    // Remove expired hackathons older than CLEANUP_EXPIRED_AFTER_DAYS
    if (hackathon.status === 'expired' && hackathon.deadline) {
      const deadline = new Date(hackathon.deadline);
      if (deadline < expiredCutoff) {
        shouldRemove = true;
        console.log(`🗑️ Removing expired hackathon: ${hackathon.title} (expired ${Math.floor((now - deadline) / (24 * 60 * 60 * 1000))} days ago)`);
      }
    }
    
    // Remove inactive hackathons (no deadline) older than CLEANUP_INACTIVE_AFTER_DAYS
    if (!hackathon.deadline && hackathon.lastUpdated) {
      const lastUpdated = new Date(hackathon.lastUpdated);
      if (lastUpdated < inactiveCutoff) {
        shouldRemove = true;
        console.log(`🗑️ Removing inactive hackathon: ${hackathon.title} (inactive ${Math.floor((now - lastUpdated) / (24 * 60 * 60 * 1000))} days)`);
      }
    }
    
    if (shouldRemove) {
      removedCount++;
      return false;
    }
    return true;
  });
  
  if (removedCount > 0) {
    console.log(`🧹 Cleanup: Removed ${removedCount} old hackathons`);
    console.log(`📊 Remaining: ${cleanedHackathons.length} hackathons`);
  }
  
  return cleanedHackathons;
}

// Update existing hackathons with fresh data
async function updateExistingHackathons(existingHackathons) {
  try {
    console.log('🔄 Updating existing hackathons...');
    
    // Update status first
    const statusUpdatedHackathons = updateHackathonStatus(existingHackathons);
    
    // Get fresh data from scrapers
    const freshHackathons = await getAllHackathons();
    
    // Create a map of existing hackathons by unique key
    const existingMap = new Map();
    statusUpdatedHackathons.forEach(hackathon => {
      const key = `${hackathon.title?.toLowerCase().trim()}|${hackathon.link?.toLowerCase().trim()}`;
      if (key !== '|') {
        existingMap.set(key, hackathon);
      }
    });
    
    // Update existing hackathons with fresh data
    let updatedCount = 0;
    freshHackathons.forEach(freshHackathon => {
      const key = `${freshHackathon.title?.toLowerCase().trim()}|${freshHackathon.link?.toLowerCase().trim()}`;
      if (key !== '|' && existingMap.has(key)) {
        const existing = existingMap.get(key);
        
        // Check if any important fields have changed
        const hasChanges = 
          existing.prize !== freshHackathon.prize ||
          existing.deadline !== freshHackathon.deadline ||
          existing.description !== freshHackathon.description ||
          existing.tags?.join(',') !== freshHackathon.tags?.join(',');
        
        if (hasChanges) {
          // Merge fresh data with existing data
          Object.assign(existing, {
            ...freshHackathon,
            status: existing.status, // Preserve status
            lastUpdated: new Date().toISOString()
          });
          updatedCount++;
        }
      }
    });
    
    console.log(`🔄 Updated ${updatedCount} hackathons with fresh data`);
    
    // Update status again after merging fresh data
    const finalHackathons = updateHackathonStatus(Array.from(existingMap.values()));
    
    // Clean up old hackathons
    const cleanedHackathons = cleanupOldHackathons(finalHackathons);
    
    return cleanedHackathons;
  } catch (error) {
    console.error('❌ Error updating existing hackathons:', error);
    return existingHackathons; // Return original if update fails
  }
}

// Merge new hackathons with existing ones, removing duplicates
async function mergeWithExistingHackathons(newHackathons) {
  try {
    const existingData = await loadHackathonsFromFile();
    
    if (!existingData || !existingData.hackathons) {
      console.log('📄 No existing hackathons found, using only new data');
      return updateHackathonStatus(newHackathons);
    }
    
    const existingHackathons = existingData.hackathons;
    const allHackathons = [...existingHackathons, ...newHackathons];
    
    console.log(`📊 Merging ${existingHackathons.length} existing + ${newHackathons.length} new hackathons`);
    
    // Remove duplicates from the combined array
    const uniqueHackathons = removeDuplicates(allHackathons);
    
    const newCount = uniqueHackathons.length - existingHackathons.length;
    if (newCount > 0) {
      console.log(`✨ Added ${newCount} new unique hackathons`);
    } else {
      console.log('ℹ️ No new hackathons found');
    }
    
    // Update status for all hackathons
    return updateHackathonStatus(uniqueHackathons);
  } catch (error) {
    console.error('❌ Error merging hackathons:', error);
    return updateHackathonStatus(newHackathons); // Fallback to just new hackathons
  }
}

// Scrape and save hackathons
async function scrapeAndSaveHackathons() {
  try {
    console.log('🚀 Starting hackathon scraping...');
    const newHackathons = await getAllHackathons();
    console.log(`✅ Scraped ${newHackathons.length} hackathons successfully`);
    
    // Merge with existing hackathons to prevent duplicates across sessions
    const allHackathons = await mergeWithExistingHackathons(newHackathons);
    
    const savedData = await saveHackathonsToFile(allHackathons);
    return savedData;
  } catch (error) {
    console.error('❌ Error during scraping:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Design Hackathon API is running 🚀',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      hackathons: '/api/hackathons',
      scrape: '/api/scrape',
      stats: '/api/stats',
      cleanup: '/api/cleanup'
    }
  });
});

// Get hackathons from saved file
app.get('/api/hackathons', async (req, res) => {
  try {
    const data = await loadHackathonsFromFile();
    if (!data) {
      return res.status(404).json({ 
        error: 'No hackathon data found. Run /api/scrape first.' 
      });
    }
    res.json(data);
  } catch (error) {
    console.error('❌ Error loading hackathons:', error);
    res.status(500).json({ error: 'Failed to load hackathons' });
  }
});

// Trigger new scraping
app.post('/api/scrape', async (req, res) => {
  try {
    console.log('🔄 Manual scraping triggered via API');
    const data = await scrapeAndSaveHackathons();
    res.json({
      message: 'Scraping completed successfully',
      data
    });
  } catch (error) {
    console.error('❌ Error during API scraping:', error);
    res.status(500).json({ error: 'Failed to scrape hackathons' });
  }
});

// Get scraping statistics
app.get('/api/stats', async (req, res) => {
  try {
    const logData = await fs.readFile(SCRAPING_LOG_FILE, 'utf8');
    const logs = JSON.parse(logData);
    
    // Get current hackathon data for design analysis
    const currentData = await loadHackathonsFromFile();
    const designStats = currentData ? {
      totalDesignHackathons: currentData.hackathons.length,
      sources: currentData.hackathons.reduce((acc, h) => {
        acc[h.source || 'Unknown'] = (acc[h.source || 'Unknown'] || 0) + 1;
        return acc;
      }, {}),
      averageRelevanceScore: currentData.hackathons.length > 0 
        ? (currentData.hackathons.reduce((sum, h) => sum + (h.designRelevanceScore || 0), 0) / currentData.hackathons.length).toFixed(3)
        : 0,
      topDesignHackathons: currentData.hackathons
        .sort((a, b) => (b.designRelevanceScore || 0) - (a.designRelevanceScore || 0))
        .slice(0, 5)
        .map(h => ({ title: h.title, score: h.designRelevanceScore, source: h.source }))
    } : null;
    
    const stats = {
      totalScrapingSessions: logs.length,
      latestScraping: logs[logs.length - 1] || null,
      averageHackathonsPerSession: logs.length > 0 
        ? Math.round(logs.reduce((sum, log) => sum + log.totalHackathons, 0) / logs.length)
        : 0,
      designStats
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load statistics' });
  }
});

// Clean up duplicates from existing data
app.post('/api/cleanup', async (req, res) => {
  try {
    console.log('🧹 Manual cleanup triggered via API');
    
    const existingData = await loadHackathonsFromFile();
    if (!existingData || !existingData.hackathons) {
      return res.status(404).json({ error: 'No hackathon data found to clean up' });
    }
    
    const originalCount = existingData.hackathons.length;
    const uniqueHackathons = removeDuplicates(existingData.hackathons);
    const duplicatesRemoved = originalCount - uniqueHackathons.length;
    
    if (duplicatesRemoved > 0) {
      const timestamp = new Date().toISOString();
      const cleanedData = {
        timestamp,
        totalCount: uniqueHackathons.length,
        hackathons: uniqueHackathons
      };
      
      await fs.writeFile(HACKATHONS_FILE, JSON.stringify(cleanedData, null, 2));
      console.log(`🧹 Cleaned up ${duplicatesRemoved} duplicates`);
      
      res.json({
        message: 'Cleanup completed successfully',
        originalCount,
        finalCount: uniqueHackathons.length,
        duplicatesRemoved
      });
    } else {
      res.json({
        message: 'No duplicates found',
        count: originalCount
      });
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to clean up duplicates' });
  }
});

// Update existing hackathons with fresh data
app.post('/api/update', async (req, res) => {
  try {
    console.log('🔄 Manual update triggered via API');
    
    const existingData = await loadHackathonsFromFile();
    if (!existingData || !existingData.hackathons) {
      return res.status(404).json({ error: 'No hackathon data found to update' });
    }
    
    const updatedHackathons = await updateExistingHackathons(existingData.hackathons);
    const timestamp = new Date().toISOString();
    
    const updatedData = {
      timestamp,
      totalCount: updatedHackathons.length,
      hackathons: updatedHackathons
    };
    
    await fs.writeFile(HACKATHONS_FILE, JSON.stringify(updatedData, null, 2));
    console.log(`🔄 Updated ${updatedHackathons.length} hackathons`);
    
    res.json({
      message: 'Update completed successfully',
      updatedCount: updatedHackathons.length,
      data: updatedData
    });
  } catch (error) {
    console.error('❌ Error during update:', error);
    res.status(500).json({ error: 'Failed to update hackathons' });
  }
});

// Manual cleanup of old hackathons
app.post('/api/cleanup-old', async (req, res) => {
  try {
    console.log('🧹 Manual cleanup of old hackathons triggered via API');
    
    const existingData = await loadHackathonsFromFile();
    if (!existingData || !existingData.hackathons) {
      return res.status(404).json({ error: 'No hackathon data found to clean up' });
    }
    
    const originalCount = existingData.hackathons.length;
    const cleanedHackathons = cleanupOldHackathons(existingData.hackathons);
    const removedCount = originalCount - cleanedHackathons.length;
    
    if (removedCount > 0) {
      const timestamp = new Date().toISOString();
      const cleanedData = {
        timestamp,
        totalCount: cleanedHackathons.length,
        hackathons: cleanedHackathons
      };
      
      await fs.writeFile(HACKATHONS_FILE, JSON.stringify(cleanedData, null, 2));
      console.log(`🧹 Cleaned up ${removedCount} old hackathons`);
      
      res.json({
        message: 'Cleanup completed successfully',
        originalCount,
        finalCount: cleanedHackathons.length,
        removedCount,
        cleanupSettings: {
          expiredAfterDays: CLEANUP_EXPIRED_AFTER_DAYS,
          inactiveAfterDays: CLEANUP_INACTIVE_AFTER_DAYS
        }
      });
    } else {
      res.json({
        message: 'No old hackathons found to clean up',
        count: originalCount,
        cleanupSettings: {
          expiredAfterDays: CLEANUP_EXPIRED_AFTER_DAYS,
          inactiveAfterDays: CLEANUP_INACTIVE_AFTER_DAYS
        }
      });
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to clean up old hackathons' });
  }
});

// Trigger auto-shutdown
app.post('/api/shutdown', async (req, res) => {
  try {
    console.log('🛑 Manual shutdown triggered via API');
    res.json({ message: 'Shutdown initiated', timestamp: new Date().toISOString() });
    
    // Shutdown after response
    setTimeout(() => {
      console.log('🛑 Shutting down server...');
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    res.status(500).json({ error: 'Failed to shutdown' });
  }
});

// Auto-shutdown configuration
const AUTO_SHUTDOWN = process.env.AUTO_SHUTDOWN === 'true';
const SHUTDOWN_DELAY = parseInt(process.env.SHUTDOWN_DELAY) || 30000; // 30 seconds default



// Start server and initial scraping
async function startServer() {
  try {
    // Ensure data directory exists
    await ensureDataDirectory();
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Design Hackathon API running on http://localhost:${PORT}`);
      console.log('📋 Available endpoints:');
      console.log(`   GET  /api/health     - Health check`);
      console.log(`   GET  /api/hackathons - Get scraped hackathons`);
      console.log(`   POST /api/scrape     - Trigger new scraping`);
      console.log(`   GET  /api/stats      - Get scraping statistics`);
      console.log(`   POST /api/cleanup    - Clean up duplicates`);
      console.log(`   POST /api/update     - Update existing hackathons`);
      console.log(`   POST /api/cleanup-old - Clean up old expired hackathons`);
      console.log(`   POST /api/shutdown   - Trigger auto-shutdown`);
      
      if (AUTO_SHUTDOWN) {
        console.log(`⏰ Auto-shutdown enabled (${SHUTDOWN_DELAY}ms delay)`);
      }
      
      console.log(`🧹 Auto-cleanup settings:`);
      console.log(`   Expired hackathons: ${CLEANUP_EXPIRED_AFTER_DAYS} days`);
      console.log(`   Inactive hackathons: ${CLEANUP_INACTIVE_AFTER_DAYS} days`);
    });
    
    // Perform initial scraping on startup (non-blocking)
    console.log('🔄 Performing initial hackathon scraping...');
    scrapeAndSaveHackathons()
      .then(() => {
        console.log('✅ Initial scraping completed!');
        
        // Auto-shutdown if enabled
        if (AUTO_SHUTDOWN) {
          console.log(`⏰ Auto-shutdown in ${SHUTDOWN_DELAY}ms...`);
          setTimeout(() => {
            console.log('🛑 Auto-shutting down server...');
            server.close(() => {
              console.log('✅ Server closed');
              process.exit(0);
            });
          }, SHUTDOWN_DELAY);
        }
      })
      .catch(err => {
        console.error('❌ Initial scraping failed:', err);
        if (AUTO_SHUTDOWN) {
          console.log(`⏰ Auto-shutdown in ${SHUTDOWN_DELAY}ms despite error...`);
          setTimeout(() => {
            console.log('🛑 Auto-shutting down server...');
            server.close(() => {
              console.log('✅ Server closed');
              process.exit(1);
            });
          }, SHUTDOWN_DELAY);
        }
      });
    
    // Keep the server running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
