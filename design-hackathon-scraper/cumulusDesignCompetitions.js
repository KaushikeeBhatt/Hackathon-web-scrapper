// cumulusDesignCompetitions.js
const puppeteer = require('puppeteer');
const dayjs = require('dayjs');

async function scrapeCumulusDesignCompetitions() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const url = 'https://cumulusassociation.org/member-portal/competitions/?searched=design&';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const today = dayjs();

  const competitions = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('article.type-competition'));
    return items.map(item => {
      const title = item.querySelector('h3.entry-title')?.innerText.trim() || '';
      const link = item.querySelector('a')?.href || '';
      const metaText = item.querySelector('p.meta')?.innerText || '';
      return { title, link, metaText };
    });
  });

  const validCompetitions = competitions
    .map(item => {
      const match = item.metaText.match(/Apply by\s+([A-Za-z]{3,}\s\d{1,2},\s\d{4})/);
      if (!match) return null;

      const dateStr = match[1];
      const parsedDate = dayjs(dateStr);
      return parsedDate.isValid() && parsedDate.isAfter(today)
        ? { title: item.title, link: item.link, applyBy: parsedDate.format('YYYY-MM-DD') }
        : null;
    })
    .filter(Boolean);

  console.log(`🎯 Found ${validCompetitions.length} upcoming competitions:`);
  console.log(validCompetitions);

  await browser.close();
  return validCompetitions;
}

module.exports = scrapeCumulusDesignCompetitions;
