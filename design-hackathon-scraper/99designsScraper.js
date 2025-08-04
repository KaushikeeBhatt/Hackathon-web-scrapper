const puppeteer = require('puppeteer');
const { isDesignHackathon, getDesignRelevanceScore } = require('./designKeywords');

async function scrape99designsContests(pages = 2) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const allContests = [];
  const seenLinks = new Set();

  try {
    // 99designs contests page
    const url = 'https://99designs.com/contests';
    console.log(`🔍 Scraping 99designs: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the contests to load
    await page.waitForSelector('.contest-card, .contest-item, [class*="contest"]', { timeout: 15000 });

    const contests = await page.evaluate(() => {
      const cards = document.querySelectorAll('.contest-card, .contest-item, [class*="contest"], .card');
      const results = [];

      cards.forEach(card => {
        try {
          const title = card.querySelector('h1, h2, h3, h4, h5, h6')?.innerText.trim() || 
                       card.querySelector('.contest-title, .title, .name')?.innerText.trim() || '';
          
          const link = card.querySelector('a')?.href || '';
          
          const description = card.querySelector('p, .description, .desc, .contest-description')?.innerText.trim() || '';
          
          const image = card.querySelector('img')?.src || '';
          
          const host = card.querySelector('.client, .organizer, .host')?.innerText.trim() || '';
          
          const prize = card.querySelector('.prize, .reward, .amount, .prize-money')?.innerText.trim() || '';
          
          const tags = Array.from(card.querySelectorAll('.tag, .category, .label, .contest-type'))
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
              source: '99designs'
            });
          }
        } catch (err) {
          console.warn('Error parsing contest card:', err);
        }
      });

      return results;
    });

    // Filter out duplicates
    const uniqueContests = contests.filter(contest => {
      if (seenLinks.has(contest.link)) {
        return false;
      }
      seenLinks.add(contest.link);
      return true;
    });

    allContests.push(...uniqueContests);

  } catch (error) {
    console.warn(`⚠️ Error scraping 99designs: ${error.message}`);
    
    // Fallback: Try alternative approach
    try {
      await page.goto('https://99designs.com/contests', { waitUntil: 'domcontentloaded' });
      
      const fallbackContests = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="contest"], [class*="design"], .card, .item');
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
              source: '99designs'
            });
          }
        });

        return results;
      });

      const uniqueFallback = fallbackContests.filter(contest => {
        if (seenLinks.has(contest.link)) {
          return false;
        }
        seenLinks.add(contest.link);
        return true;
      });

      allContests.push(...uniqueFallback);
    } catch (fallbackError) {
      console.warn(`⚠️ Fallback scraping also failed: ${fallbackError.message}`);
    }
  }

  await browser.close();

  // Filter for design-related contests only
  const designContests = allContests.filter(contest => {
    const isDesign = isDesignHackathon(contest);
    if (isDesign) {
      contest.designRelevanceScore = getDesignRelevanceScore(contest);
    }
    return isDesign;
  });

  console.log(`🎨 99designs: Found ${designContests.length} design contests out of ${allContests.length} total`);
  
  return designContests;
}

module.exports = scrape99designsContests;

// Test function
if (require.main === module) {
  scrape99designsContests()
    .then(data => {
      console.log('\n🎯 99designs Design Contests:', data.length);
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.error('❌ Error while scraping 99designs:', err);
    });
} 