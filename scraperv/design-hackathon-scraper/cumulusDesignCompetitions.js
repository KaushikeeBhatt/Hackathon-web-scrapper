// cumulusDesignCompetitions.js
const puppeteer = require('puppeteer');
const dayjs = require('dayjs');
const { isDesignHackathon, getDesignRelevanceScore } = require('./designKeywords');

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
      const description = item.querySelector('.entry-content')?.innerText.trim() || '';
      return { title, link, metaText, description };
    });
  });

  const validCompetitions = competitions
    .map(item => {
      const match = item.metaText.match(/Apply by\s+([A-Za-z]{3,}\s\d{1,2},\s\d{4})/);
      if (!match) return null;

      const dateStr = match[1];
      const parsedDate = dayjs(dateStr);
      return parsedDate.isValid() && parsedDate.isAfter(today)
        ? { 
            title: item.title, 
            link: item.link, 
            description: item.description,
            applyBy: parsedDate.format('YYYY-MM-DD'),
            source: 'Cumulus'
          }
        : null;
    })
    .filter(Boolean);

  // Filter for design-related competitions only
  const designCompetitions = validCompetitions.filter(competition => {
    const isDesign = isDesignHackathon(competition);
    if (isDesign) {
      competition.designRelevanceScore = getDesignRelevanceScore(competition);
    }
    return isDesign;
  });

  console.log(`🎨 Cumulus: Found ${designCompetitions.length} design competitions out of ${validCompetitions.length} total`);
  console.log(designCompetitions);

  await browser.close();
  return designCompetitions;
}

module.exports = scrapeCumulusDesignCompetitions;
