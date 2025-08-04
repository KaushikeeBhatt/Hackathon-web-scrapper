const devpostScraper = require('./devpostScraper');
const unstopScraper = require('./unstopScraper');
const cumulusScraper = require('./cumulusDesignCompetitions');
const allHackathonWeb = require('./allHackathonWeb');

async function getAllHackathons() {
  const results = [];

  const scrapers = [
    { name: 'Devpost', fn: devpostScraper },
    { name: 'Unstop', fn: unstopScraper },
    { name: 'Cumulus', fn: cumulusScraper },
    { name: 'AllHackathons', fn: allHackathonWeb },
  ];

  for (const { name, fn } of scrapers) {
    try {
      console.log(`🔍 Scraping ${name}...`);
      const data = await fn();
      console.log(`✅ ${name}: ${data.length} hackathons fetched`);
      results.push(...data);
    } catch (err) {
      console.error(`❌ Error in ${name}:`, err.message);
    }
  }

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



