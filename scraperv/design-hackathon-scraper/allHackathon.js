const devpostScraper = require('./devpostScraper');
const unstopScraper = require('./unstopScraper');
const cumulusScraper = require('./cumulusDesignCompetitions');
const allHackathonWeb = require('./allHackathonWeb');
const devfolioScraper = require('./devfolioScraper');
const hackathonComScraper = require('./hackathonComScraper');
const hackerEarthScraper = require('./hackerEarthScraper');
const topcoderScraper = require('./topcoderScraper');
const designs99Scraper = require('./99designsScraper');
const mlhScraper = require('./mlhScraper');

async function getAllHackathons() {
  const results = [];
  let totalScraped = 0;
  let totalDesign = 0;

  const scrapers = [
    { name: 'Devpost', fn: devpostScraper },
    { name: 'Unstop', fn: unstopScraper },
    { name: 'Cumulus', fn: cumulusScraper },
    { name: 'AllHackathons', fn: allHackathonWeb },
    { name: 'Devfolio', fn: devfolioScraper },
    { name: 'Hackathon.com', fn: hackathonComScraper },
    { name: 'HackerEarth', fn: hackerEarthScraper },
    { name: 'Topcoder', fn: topcoderScraper },
    { name: '99designs', fn: designs99Scraper },
    { name: 'MLH', fn: mlhScraper },
  ];

  for (const { name, fn } of scrapers) {
    try {
      console.log(`🔍 Scraping ${name} for design hackathons...`);
      const data = await fn();
      console.log(`✅ ${name}: ${data.length} design hackathons found`);
      results.push(...data);
      totalDesign += data.length;
    } catch (err) {
      console.error(`❌ Error in ${name}:`, err.message);
    }
  }

  console.log(`\n🎨 SUMMARY:`);
  console.log(`   Total design hackathons found: ${totalDesign}`);
  console.log(`   Sources: ${results.map(h => h.source).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`);
  
  // Sort by design relevance score (highest first)
  results.sort((a, b) => (b.designRelevanceScore || 0) - (a.designRelevanceScore || 0));
  
  return results;
}

module.exports = getAllHackathons;

// to test directly
if (require.main === module) {
  getAllHackathons()
    .then(data => {
      console.log('\n🎯 Total Hackathons Fetched:', data.length);
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.error('❌ Error while fetching all hackathons:', err);
    });
}



