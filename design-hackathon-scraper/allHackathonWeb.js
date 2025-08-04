// server/design-hackathon-scraper/allHackathonWeb.js

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

async function scrapeAllHackathonsDesign() {
  const url = 'https://allhackathons.com/hackathons/?search=&status=open&location=online&themes=11';
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const content = await page.content();
  const $ = cheerio.load(content);
  const hackathons = [];

  $('.row.align-items-center.bg-white.mb-4.py-5.px-4').each((_, el) => {
    const $el = $(el);

    const title = $el.find('.col-lg-7 a.h5').text().trim();
    const relativeLink = $el.find('.col-lg-7 a.h5').attr('href') || '';
    const fullLink = `https://allhackathons.com${relativeLink}`;

    const dateText = $el.find('.col-lg-7 > p').first().text().trim();
    let [startStr, endStr] = dateText.split('-').map(s => s.trim());
    if (!endStr) endStr = startStr;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const isFuture = end.getTime() > Date.now();

    const status = $el.find('.col-lg-7 > div').text().trim();
    const description = $el.find('.col-lg-7 p.text-muted').text().trim();

    const imageSrc = $el.find('.col-lg-2 img').attr('src') || '';
    const image = `https://allhackathons.com${imageSrc}`;

    const tags = [];
    $el.find('.col-lg-3 .font-size-sm a').each((_, tagEl) => {
      tags.push($(tagEl).text().trim().toLowerCase());
    });

    const hasDesign = tags.includes('design');

    if (isFuture && hasDesign) {
      hackathons.push({
        title,
        link: fullLink,
        image,
        date: dateText,
        status,
        description,
        tags,
        source: 'AllHackathons',
        scrapedAt: new Date().toISOString()
      });
    }
  });

  await browser.close();
  console.log(`✅ AllHackathons: Fetched ${hackathons.length} design hackathons`);
  return hackathons;
}

module.exports = scrapeAllHackathonsDesign;

// Run directly for testing
if (require.main === module) {
  scrapeAllHackathonsDesign()
    .then(data => {
      console.log('\n🎯 Scraped Hackathons:', data.length);
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.error('❌ Error while scraping AllHackathons:', err);
    });
}

