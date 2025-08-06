const puppeteer = require('puppeteer');
const { isDesignHackathon, getDesignRelevanceScore } = require('./designKeywords');

async function scrapeDevpostDesignHackathons(pages = 3) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const allHackathons = [];
  const seenLinks = new Set();

  for (let i = 1; i <= pages; i++) {
    const url = `https://devpost.com/hackathons?search=design&status[]=open&themes[]=Design&page=${i}`;
    console.log(`🔎 Scraping Page ${i}: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.hackathon-tile');

    const hackathonsOnPage = await page.evaluate(() => {
      const tiles = document.querySelectorAll('.hackathon-tile');
      const results = [];

      tiles.forEach(tile => {
        const title = tile.querySelector('h3.mb-4')?.innerText.trim() || 'No title';
        const link = tile.querySelector('a')?.href || '';
        const description = tile.querySelector('.challenge-info > p')?.innerText || '';
        const image = tile.querySelector('img')?.src || '';
        const hostedBy = tile.querySelector('.host-label')?.textContent.trim() || 'unknown';
        
        // Extract themes/tags
        const themeElements = tile.querySelectorAll('.theme-label');
        const tags = Array.from(themeElements).map(el => el.textContent.trim());

        results.push({ 
          title, 
          link, 
          description, 
          image, 
          hostedBy, 
          tags,
          source: 'Devpost'
        });
      });

      return results;
    });

    // Filter out duplicates within the same scraping session
    const uniqueHackathonsOnPage = hackathonsOnPage.filter(hackathon => {
      if (seenLinks.has(hackathon.link)) {
        return false;
      }
      seenLinks.add(hackathon.link);
      return true;
    });

    allHackathons.push(...uniqueHackathonsOnPage);
    
    // If no new hackathons found, stop pagination
    if (uniqueHackathonsOnPage.length === 0) {
      console.log(`📄 No new hackathons found on page ${i}, stopping pagination`);
      break;
    }
  }

  await browser.close();
  
  // Filter for design-related hackathons only
  const designHackathons = allHackathons.filter(hackathon => {
    const isDesign = isDesignHackathon(hackathon);
    if (isDesign) {
      hackathon.designRelevanceScore = getDesignRelevanceScore(hackathon);
    }
    return isDesign;
  });

  console.log(`🎨 Devpost: Found ${designHackathons.length} design hackathons out of ${allHackathons.length} total`);
  
  return designHackathons;
}

module.exports = scrapeDevpostDesignHackathons;

// Test function
if (require.main === module) {
  scrapeDevpostDesignHackathons()
    .then(data => {
      console.log('\n🎯 Devpost Design Hackathons:', data.length);
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.error('❌ Error while scraping Devpost:', err);
    });
}
