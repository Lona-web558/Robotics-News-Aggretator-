const express = require('express');
const Parser = require('rss-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_MS = 10 * 60 * 1000; // refetch feeds at most every 10 minutes

// Add or remove feeds here. Each one is fetched server-side, so CORS is not an issue.
const FEEDS = [
  { id: 'ieee', name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/feeds/topic/robotics.rss' },
  { id: 'robotreport', name: 'The Robot Report', url: 'https://www.therobotreport.com/feed/' },
  { id: 'robohub', name: 'Robohub', url: 'https://robohub.org/feed/' },
  { id: 'mit', name: 'MIT News', url: 'https://news.mit.edu/rss/topic/robotics' },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/category/robotics/feed/' }
];

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'RoboticsNewsAggregator/1.0' },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumb']
    ]
  }
});

const stripHtml = (s = '') =>
  s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function findImage(item) {
  if (item.enclosure && item.enclosure.url && /image/.test(item.enclosure.type || 'image')) return item.enclosure.url;
  if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) return item.mediaContent.$.url;
  if (item.mediaThumb && item.mediaThumb.$ && item.mediaThumb.$.url) return item.mediaThumb.$.url;
  const html = item['content:encoded'] || item.content || '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

let cache = { time: 0, articles: [], failed: [] };

async function refreshFeeds() {
  const results = await Promise.allSettled(FEEDS.map(f => parser.parseURL(f.url)));
  const articles = [];
  const failed = [];

  results.forEach((r, i) => {
    const feed = FEEDS[i];
    if (r.status !== 'fulfilled') {
      failed.push(feed.name);
      return;
    }
    r.value.items.forEach(item => {
      if (!item.link || !item.title) return;
      const date = new Date(item.isoDate || item.pubDate || Date.now());
      articles.push({
        title: stripHtml(item.title),
        link: item.link,
        summary: stripHtml(item.contentSnippet || item.content || '').slice(0, 220),
        image: findImage(item),
        source: feed.name,
        sourceId: feed.id,
        date: isNaN(date) ? new Date().toISOString() : date.toISOString()
      });
    });
  });

  // Remove duplicates by link, newest first
  const seen = new Set();
  const unique = articles
    .filter(a => (seen.has(a.link) ? false : seen.add(a.link)))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  cache = { time: Date.now(), articles: unique, failed };
}

app.get('/api/news', async (req, res) => {
  try {
    const force = req.query.refresh === '1';
    if (force || Date.now() - cache.time > CACHE_MS) await refreshFeeds();

    const q = (req.query.q || '').toLowerCase().trim();
    const source = req.query.source || '';
    const articles = cache.articles.filter(a =>
      (!source || a.sourceId === source) &&
      (!q || (a.title + ' ' + a.summary).toLowerCase().includes(q))
    );

    res.json({
      articles,
      sources: FEEDS.map(({ id, name }) => ({ id, name })),
      failed: cache.failed,
      fetchedAt: new Date(cache.time).toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load news feeds. Try again shortly.' });
  }
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Robotics news running on http://localhost:${PORT}`);
});
