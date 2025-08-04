const puppeteer = require('puppeteer');
const { isDesignHackathon, getDesignRelevanceScore } = require('./designKeywords');

async function scrapeDevfolioDesignHackathons(pages = 2) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const allHackathons = [];
  const seenLinks = new Set();

  try {
    // Devfolio has a good API-like structure, let's try their hackathons page
    const url = 'https://devfolio.co/hackathons';
    console.log(`🔍 Scraping Devfolio: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the hackathons to load
    await page.waitForSelector('[data-testid="hackathon-card"]', { timeout: 15000 });

    const hackathons = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="hackathon-card"]');
      const results = [];

      cards.forEach(card => {
        try {
          const title = card.querySelector('h3')?.innerText.trim() || 
                       card.querySelector('[data-testid="hackathon-title"]')?.innerText.trim() || '';
          
          const link = card.querySelector('a')?.href || '';
          
          const description = card.querySelector('p')?.innerText.trim() || 
                            card.querySelector('[data-testid="hackathon-description"]')?.innerText.trim() || '';
          
          const image = card.querySelector('img')?.src || '';
          
          const host = card.querySelector('[data-testid="hackathon-host"]')?.innerText.trim() || 
                      card.querySelector('.host')?.innerText.trim() || '';
          
          const prize = card.querySelector('[data-testid="prize-amount"]')?.innerText.trim() || 
                       card.querySelector('.prize')?.innerText.trim() || '';
          
          const tags = Array.from(card.querySelectorAll('[data-testid="hackathon-tag"]'))
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
              source: 'Devfolio'
            });
          }
        } catch (err) {
          console.warn('Error parsing hackathon card:', err);
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
    console.warn(`⚠️ Error scraping Devfolio: ${error.message}`);
    
    // Fallback: Try alternative selectors
    try {
      await page.goto('https://devfolio.co/hackathons', { waitUntil: 'domcontentloaded' });
      
      const fallbackHackathons = await page.evaluate(() => {
        const cards = document.querySelectorAll('.hackathon-card, .card, [class*="hackathon"]');
        const results = [];

        cards.forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, h5, h6')?.innerText.trim() || '';
          const link = card.querySelector('a')?.href || '';
          const description = card.querySelector('p')?.innerText.trim() || '';
          const image = card.querySelector('img')?.src || '';

          if (title && link) {
            results.push({
              title,
              link,
              description,
              image,
              source: 'Devfolio'
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

  console.log(`🎨 Devfolio: Found ${designHackathons.length} design hackathons out of ${allHackathons.length} total`);
  
  return designHackathons;
}

module.exports = scrapeDevfolioDesignHackathons;

// Test function
if (require.main === module) {
  scrapeDevfolioDesignHackathons()
    .then(data => {
      console.log('\n🎯 Devfolio Design Hackathons:', data.length);
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.error('❌ Error while scraping Devfolio:', err);
    });
} 