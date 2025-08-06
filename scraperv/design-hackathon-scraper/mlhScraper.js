const puppeteer = require('puppeteer');
const { isDesignHackathon, getDesignRelevanceScore } = require('./designKeywords');

async function scrapeMLHEvents(pages = 2) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const allEvents = [];
  const seenLinks = new Set();

  try {
    // MLH events page
    const url = 'https://mlh.io/events';
    console.log(`🔍 Scraping MLH: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the events to load
    await page.waitForSelector('.event-card, .event-item, [class*="event"]', { timeout: 15000 });

    const events = await page.evaluate(() => {
      const cards = document.querySelectorAll('.event-card, .event-item, [class*="event"], .card');
      const results = [];

      cards.forEach(card => {
        try {
          const title = card.querySelector('h1, h2, h3, h4, h5, h6')?.innerText.trim() || 
                       card.querySelector('.event-title, .title, .name')?.innerText.trim() || '';
          
          const link = card.querySelector('a')?.href || '';
          
          const description = card.querySelector('p, .description, .desc, .event-description')?.innerText.trim() || '';
          
          const image = card.querySelector('img')?.src || '';
          
          const host = card.querySelector('.university, .organizer, .host, .school')?.innerText.trim() || '';
          
          const prize = card.querySelector('.prize, .reward, .amount, .prize-money')?.innerText.trim() || '';
          
          const tags = Array.from(card.querySelectorAll('.tag, .category, .label, .event-type'))
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
              source: 'MLH'
            });
          }
        } catch (err) {
          console.warn('Error parsing event card:', err);
        }
      });

      return results;
    });

    // Filter out duplicates
    const uniqueEvents = events.filter(event => {
      if (seenLinks.has(event.link)) {
        return false;
      }
      seenLinks.add(event.link);
      return true;
    });

    allEvents.push(...uniqueEvents);

  } catch (error) {
    console.warn(`⚠️ Error scraping MLH: ${error.message}`);
    
    // Fallback: Try alternative approach
    try {
      await page.goto('https://mlh.io/events', { waitUntil: 'domcontentloaded' });
      
      const fallbackEvents = await page.evaluate(() => {
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
              source: 'MLH'
            });
          }
        });

        return results;
      });

      const uniqueFallback = fallbackEvents.filter(event => {
        if (seenLinks.has(event.link)) {
          return false;
        }
        seenLinks.add(event.link);
        return true;
      });

      allEvents.push(...uniqueFallback);
    } catch (fallbackError) {
      console.warn(`⚠️ Fallback scraping also failed: ${fallbackError.message}`);
    }
  }

  await browser.close();

  // Filter for design-related events only
  const designEvents = allEvents.filter(event => {
    const isDesign = isDesignHackathon(event);
    if (isDesign) {
      event.designRelevanceScore = getDesignRelevanceScore(event);
    }
    return isDesign;
  });

  console.log(`🎨 MLH: Found ${designEvents.length} design events out of ${allEvents.length} total`);
  
  return designEvents;
}

module.exports = scrapeMLHEvents;

// Test function
if (require.main === module) {
  scrapeMLHEvents()
    .then(data => {
      console.log('\n🎯 MLH Design Events:', data.length);
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.error('❌ Error while scraping MLH:', err);
    });
} 