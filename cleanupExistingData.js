const fs = require('fs').promises;
const path = require('path');
const { isDesignHackathon, getDesignRelevanceScore } = require('./design-hackathon-scraper/designKeywords');

async function cleanupExistingData() {
  try {
    const dataPath = path.join(__dirname, 'data', 'hackathons.json');
    const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
    
    console.log(`📊 Original hackathons: ${data.hackathons.length}`);
    
    // Filter for design hackathons only
    const designHackathons = data.hackathons.filter(hackathon => {
      const isDesign = isDesignHackathon(hackathon);
      if (isDesign) {
        hackathon.designRelevanceScore = getDesignRelevanceScore(hackathon);
        hackathon.source = hackathon.source || 'Legacy';
      }
      return isDesign;
    });
    
    console.log(`🎨 Design hackathons: ${designHackathons.length}`);
    console.log(`🧹 Removed: ${data.hackathons.length - designHackathons.length} non-design hackathons`);
    
    // Sort by design relevance score
    designHackathons.sort((a, b) => (b.designRelevanceScore || 0) - (a.designRelevanceScore || 0));
    
    // Save cleaned data
    const cleanedData = {
      timestamp: new Date().toISOString(),
      totalCount: designHackathons.length,
      hackathons: designHackathons
    };
    
    await fs.writeFile(dataPath, JSON.stringify(cleanedData, null, 2));
    console.log(`💾 Saved ${designHackathons.length} design hackathons to ${dataPath}`);
    
    // Show top design hackathons
    console.log('\n🏆 Top Design Hackathons:');
    designHackathons.slice(0, 5).forEach((h, i) => {
      console.log(`${i + 1}. ${h.title} (Score: ${(h.designRelevanceScore * 100).toFixed(1)}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error cleaning up data:', error);
  }
}

cleanupExistingData(); 