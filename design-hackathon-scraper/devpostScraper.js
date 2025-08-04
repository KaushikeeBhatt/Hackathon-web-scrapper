const puppeteer = require('puppeteer');

async function scrapeDevpostDesignHackathons(pages = 3) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const allHackathons = [];

  for (let i = 1; i <= pages; i++) {
    const url = `https://devpost.com/hackathons?search=design&status[]=open&themes[]=Design`;
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


        results.push({ title, link, description, image, hostedBy });
      });

      return results;
    });

    allHackathons.push(...hackathonsOnPage);
  }

  await browser.close();
  return allHackathons;
}

module.exports = scrapeDevpostDesignHackathons;
