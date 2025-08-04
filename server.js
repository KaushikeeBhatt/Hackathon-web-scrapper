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

// Merge new hackathons with existing ones, removing duplicates
async function mergeWithExistingHackathons(newHackathons) {
  try {
    const existingData = await loadHackathonsFromFile();
    
    if (!existingData || !existingData.hackathons) {
      console.log('📄 No existing hackathons found, using only new data');
      return newHackathons;
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
    
    return uniqueHackathons;
  } catch (error) {
    console.error('❌ Error merging hackathons:', error);
    return newHackathons; // Fallback to just new hackathons
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
    });
    
    // Perform initial scraping on startup (non-blocking)
    console.log('🔄 Performing initial hackathon scraping...');
    scrapeAndSaveHackathons()
      .then(() => console.log('✅ Initial scraping completed!'))
      .catch(err => console.error('❌ Initial scraping failed:', err));
    
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
