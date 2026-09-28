# Robotics-News-Aggretator-


# Robotics News Aggregator

A full-stack news aggregator that pulls robotics headlines from several RSS feeds into one searchable page.

**Stack:** HTML5, CSS3, Bootstrap 5, JavaScript, Node.js, Express.js

## Features

- Merges five robotics feeds: IEEE Spectrum, The Robot Report, Robohub, MIT News and TechCrunch
- Removes duplicate articles and sorts newest first
- Live search across titles and summaries
- Filter by source
- Save articles for later (stored in the browser with localStorage)
- Server-side caching (10 minutes) so feeds are not fetched on every visit
- If one feed fails, the others still load and the page shows which one failed

## Project structure

```
robotics-news/
├── server.js          Express server and RSS fetching
├── package.json
└── public/
    ├── index.html     Page markup
    ├── style.css      Styles
    └── app.js         Frontend logic
```

The three frontend files must stay inside the `public/` folder.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000

## API

`GET /api/news`

| Query parameter | Description |
|---|---|
| `q` | Search text, matched against title and summary |
| `source` | Source id: `ieee`, `robotreport`, `robohub`, `mit`, `techcrunch` |
| `refresh=1` | Skip the cache and refetch all feeds |

Response:

```json
{
  "articles": [
    {
      "title": "...",
      "link": "...",
      "summary": "...",
      "image": "...",
      "source": "IEEE Spectrum",
      "sourceId": "ieee",
      "date": "2026-09-28T07:00:00.000Z"
    }
  ],
  "sources": [{ "id": "ieee", "name": "IEEE Spectrum" }],
  "failed": [],
  "fetchedAt": "2026-09-28T07:52:00.000Z"
}
```

## Customise the feeds

Edit the `FEEDS` array at the top of `server.js`:

```js
{ id: 'myfeed', name: 'My Feed', url: 'https://example.com/feed.xml' }
```

Feed URLs change over time. If a source keeps showing as unreachable, check that its URL still works in a browser.

To change how long results are cached, edit `CACHE_MS` in `server.js`.

## Deploy to Render

1. Push the project to a GitHub repository.
2. Create a new **Web Service** on Render and connect the repository.
3. Set these options:
   - **Root directory:** the folder containing `server.js` and `package.json`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Deploy. Render sets the `PORT` variable automatically.

## Troubleshooting

- **Blank page or "Cannot GET /":** check that `index.html`, `style.css` and `app.js` are inside a `public/` folder next to `server.js`.
- **A source is missing:** its feed URL may have changed or blocked the request. The page lists unreachable sources under the search bar.
- **Free-tier Render is slow on first load:** the service sleeps when idle, so the first request after a break can take up to a minute.

## Ideas for next steps

- Category tags (drones, humanoids, ROS)
- Admin panel to add and remove feeds
- Daily email digest
