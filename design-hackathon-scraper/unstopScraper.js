const puppeteer = require('puppeteer');

async function scrapeUnstopDesignHackathons(searchTerm = 'design', pages = 1) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const results = [];

  for (let i = 1; i <= pages; i++) {
    const url = `https://unstop.com/all-opportunities?oppstatus=open&domain=2&category=designing:drawing:painting&course=6&specialization=Computer%20Science%20and%20Engineering&usertype=students&passingOutYear=2026`;
    console.log(`🔍 Scraping Unstop Page ${i}: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      await page.waitForSelector('.single_profile', { timeout: 15000 });

      const pageResults = await page.evaluate(() => {
        const cards = document.querySelectorAll('.single_profile');
        const extracted = [];

        cards.forEach(card => {
          const title = card.querySelector('h2')?.innerText.trim() || '';
          const host = card.querySelector('p')?.innerText.trim() || '';
          const prize = card.querySelector('.fa-rupee')?.parentElement?.innerText.trim() || '';
          const timeLeft = [...card.querySelectorAll('.seperate_box')]
            .find(el => el.textContent.toLowerCase().includes('left'))?.innerText.trim() || '';
          const image = card.querySelector('img')?.src || '';
          const registered = [...card.querySelectorAll('.seperate_box')]
            .find(el => el.innerText.includes('Registered'))?.innerText.trim() || '';
          const tags = Array.from(card.querySelectorAll('.chip_text')).map(tag => tag.textContent.trim());
          const link = card.getAttribute('id')?.match(/_(\d+)/) ? `https://unstop.com/competitions/${RegExp.$1}` : '';

          extracted.push({ title, host, prize, timeLeft, image, registered, tags, link });
        });

        return extracted;
      });

      results.push(...pageResults);
    } catch (err) {
      console.warn(`⚠️ No results or timeout on page ${i}`);
    }
  }

  await browser.close();
  return results;
}
module.exports = scrapeUnstopDesignHackathons;

// // Run test
// scrapeUnstopDesignHackathons('design', 2)
//   .then(hacks => {
//     console.log(`✅ Total valid hackathons found: ${hacks.length}`);
//     console.dir(hacks, { depth: null });
//   })
//   .catch(err => console.error('❌ Scraping error:', err));
