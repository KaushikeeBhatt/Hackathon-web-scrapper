const puppeteer = require('puppeteer');
const { isDesignHackathon, getDesignRelevanceScore } = require('./designKeywords');

async function scrapeTopcoderDesignChallenges(pages = 2) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const allChallenges = [];
  const seenLinks = new Set();

  try {
    // Topcoder challenges with design focus
    const url = 'https://www.topcoder.com/challenges';
    console.log(`🔍 Scraping Topcoder: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the challenges to load
    await page.waitForSelector('.challenge-card, .challenge-item, [class*="challenge"]', { timeout: 15000 });

    const challenges = await page.evaluate(() => {
      const cards = document.querySelectorAll('.challenge-card, .challenge-item, [class*="challenge"], .card');
      const results = [];

      cards.forEach(card => {
        try {
          const title = card.querySelector('h1, h2, h3, h4, h5, h6')?.innerText.trim() || 
                       card.querySelector('.challenge-title, .title, .name')?.innerText.trim() || '';
          
          const link = card.querySelector('a')?.href || '';
          
          const description = card.querySelector('p, .description, .desc, .challenge-description')?.innerText.trim() || '';
          
          const image = card.querySelector('img')?.src || '';
          
          const host = card.querySelector('.company, .organizer, .host, .sponsor')?.innerText.trim() || '';
          
          const prize = card.querySelector('.prize, .reward, .amount, .prize-money')?.innerText.trim() || '';
          
          const tags = Array.from(card.querySelectorAll('.tag, .category, .label, .challenge-type, .track'))
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
              source: 'Topcoder'
            });
          }
        } catch (err) {
          console.warn('Error parsing challenge card:', err);
        }
      });

      return results;
    });

    // Filter out duplicates
    const uniqueChallenges = challenges.filter(challenge => {
      if (seenLinks.has(challenge.link)) {
        return false;
      }
      seenLinks.add(challenge.link);
      return true;
    });

    allChallenges.push(...uniqueChallenges);

  } catch (error) {
    console.warn(`⚠️ Error scraping Topcoder: ${error.message}`);
    
    // Fallback: Try alternative approach
    try {
      await page.goto('https://www.topcoder.com/challenges?tracks[0]=Design', { waitUntil: 'domcontentloaded' });
      
      const fallbackChallenges = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="challenge"], [class*="design"], .card, .item');
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
              source: 'Topcoder'
            });
          }
        });

        return results;
      });

      const uniqueFallback = fallbackChallenges.filter(challenge => {
        if (seenLinks.has(challenge.link)) {
          return false;
        }
        seenLinks.add(challenge.link);
        return true;
      });

      allChallenges.push(...uniqueFallback);
    } catch (fallbackError) {
      console.warn(`⚠️ Fallback scraping also failed: ${fallbackError.message}`);
    }
  }

  await browser.close();

  // Filter for design-related challenges only
  const designChallenges = allChallenges.filter(challenge => {
    const isDesign = isDesignHackathon(challenge);
    if (isDesign) {
      challenge.designRelevanceScore = getDesignRelevanceScore(challenge);
    }
    return isDesign;
  });

  console.log(`🎨 Topcoder: Found ${designChallenges.length} design challenges out of ${allChallenges.length} total`);
  
  return designChallenges;
}

module.exports = scrapeTopcoderDesignChallenges;

// Test function
if (require.main === module) {
  scrapeTopcoderDesignChallenges()
    .then(data => {
      console.log('\n🎯 Topcoder Design Challenges:', data.length);
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.error('❌ Error while scraping Topcoder:', err);
    });
} 