const puppeteer = require('puppeteer');
const { isDesignHackathon, getDesignRelevanceScore } = require('./designKeywords');

async function scrapeHackerEarthDesignHackathons(pages = 2) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const allHackathons = [];
  const seenLinks = new Set();

  try {
    // HackerEarth challenges with design focus
    const url = 'https://www.hackerearth.com/challenges/';
    console.log(`🔍 Scraping HackerEarth: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the challenges to load
    await page.waitForSelector('.challenge-card, .challenge-list-item, [class*="challenge"]', { timeout: 15000 });

    const hackathons = await page.evaluate(() => {
      const cards = document.querySelectorAll('.challenge-card, .challenge-list-item, [class*="challenge"], .card');
      const results = [];

      cards.forEach(card => {
        try {
          const title = card.querySelector('h1, h2, h3, h4, h5, h6')?.innerText.trim() || 
                       card.querySelector('.challenge-title, .title, .name')?.innerText.trim() || '';
          
          const link = card.querySelector('a')?.href || '';
          
          const description = card.querySelector('p, .description, .desc, .challenge-description')?.innerText.trim() || '';
          
          const image = card.querySelector('img')?.src || '';
          
          const host = card.querySelector('.company, .organizer, .host')?.innerText.trim() || '';
          
          const prize = card.querySelector('.prize, .reward, .amount, .prize-money')?.innerText.trim() || '';
          
          const tags = Array.from(card.querySelectorAll('.tag, .category, .label, .challenge-type'))
            .map(tag => tag.textContent.trim())
            .filter(tag => tag.length > 0);

          if (title && link) {
            results.push({
              title,
              link,
              description,
              image,
              host,
              prize,
              tags,
              source: 'HackerEarth'
            });
          }
        } catch (err) {
          console.warn('Error parsing challenge card:', err);
        }
      });

      return results;
    });

    // Filter out duplicates
    const uniqueHackathons = hackathons.filter(hackathon => {
      if (seenLinks.has(hackathon.link)) {
        return false;
      }
      seenLinks.add(hackathon.link);
      return true;
    });

    allHackathons.push(...uniqueHackathons);

  } catch (error) {
    console.warn(`⚠️ Error scraping HackerEarth: ${error.message}`);
    
    // Fallback: Try alternative approach
    try {
      await page.goto('https://www.hackerearth.com/challenges/hackathon/', { waitUntil: 'domcontentloaded' });
      
      const fallbackHackathons = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="challenge"], [class*="hackathon"], .card, .item');
        const results = [];

        cards.forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, h5, h6, .title')?.innerText.trim() || '';
          const link = card.querySelector('a')?.href || '';
          const description = card.querySelector('p, .description')?.innerText.trim() || '';
          const image = card.querySelector('img')?.src || '';

          if (title && link) {
            results.push({
              title,
              link,
              description,
              image,
              source: 'HackerEarth'
            });
          }
        });

        return results;
      });

      const uniqueFallback = fallbackHackathons.filter(hackathon => {
        if (seenLinks.has(hackathon.link)) {
          return false;
        }
        seenLinks.add(hackathon.link);
        return true;
      });

      allHackathons.push(...uniqueFallback);
    } catch (fallbackError) {
      console.warn(`⚠️ Fallback scraping also failed: ${fallbackError.message}`);
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

  console.log(`🎨 HackerEarth: Found ${designHackathons.length} design hackathons out of ${allHackathons.length} total`);
  
  return designHackathons;
}

module.exports = scrapeHackerEarthDesignHackathons;

// Test function
if (require.main === module) {
  scrapeHackerEarthDesignHackathons()
    .then(data => {
      console.log('\n🎯 HackerEarth Design Hackathons:', data.length);
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.error('❌ Error while scraping HackerEarth:', err);
    });
} 