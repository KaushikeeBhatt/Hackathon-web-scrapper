const puppeteer = require('puppeteer');
const { isDesignHackathon, getDesignRelevanceScore } = require('./designKeywords');

async function scrapeHackathonComDesignHackathons(pages = 2) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const allHackathons = [];
  const seenLinks = new Set();

  try {
    // Hackathon.com with design filter
    const url = 'https://www.hackathon.com/search?q=design';
    console.log(`🔍 Scraping Hackathon.com: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the hackathons to load
    await page.waitForSelector('.hackathon-card, .event-card, [class*="hackathon"]', { timeout: 15000 });

    const hackathons = await page.evaluate(() => {
      const cards = document.querySelectorAll('.hackathon-card, .event-card, [class*="hackathon"], .card');
      const results = [];

      cards.forEach(card => {
        try {
          const title = card.querySelector('h1, h2, h3, h4, h5, h6')?.innerText.trim() || 
                       card.querySelector('.title, .name')?.innerText.trim() || '';
          
          const link = card.querySelector('a')?.href || '';
          
          const description = card.querySelector('p, .description, .desc')?.innerText.trim() || '';
          
          const image = card.querySelector('img')?.src || '';
          
          const host = card.querySelector('.host, .organizer, .company')?.innerText.trim() || '';
          
          const prize = card.querySelector('.prize, .reward, .amount')?.innerText.trim() || '';
          
          const tags = Array.from(card.querySelectorAll('.tag, .category, .label'))
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
              source: 'Hackathon.com'
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
    console.warn(`⚠️ Error scraping Hackathon.com: ${error.message}`);
    
    // Fallback: Try alternative approach
    try {
      await page.goto('https://www.hackathon.com', { waitUntil: 'domcontentloaded' });
      
      const fallbackHackathons = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="event"], [class*="hackathon"], .card, .item');
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
              source: 'Hackathon.com'
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

  console.log(`🎨 Hackathon.com: Found ${designHackathons.length} design hackathons out of ${allHackathons.length} total`);
  
  return designHackathons;
}

module.exports = scrapeHackathonComDesignHackathons;

// Test function
if (require.main === module) {
  scrapeHackathonComDesignHackathons()
    .then(data => {
      console.log('\n🎯 Hackathon.com Design Hackathons:', data.length);
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.error('❌ Error while scraping Hackathon.com:', err);
    });
} 