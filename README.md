# Firecrawl Space

Independent, unofficial Firecrawl implementation planner for `firecrawl.space`.

The site helps developers choose between Firecrawl search, scrape, crawl, map, batch scrape, agent, interact, official hosted API, and self-hosted deployment paths. It does not sell official Firecrawl credits or imply official affiliation.

## Source of truth

- Official site: https://firecrawl.dev/
- Official docs: https://docs.firecrawl.dev/
- Upstream repo: https://github.com/firecrawl/firecrawl
- Repository license: AGPL-3.0

## Local commands

```bash
npm run build
npm run preview
npm run dev
```

`npm run build` runs the project validation script. `npm run preview` starts a small local Node preview server on `127.0.0.1:8798`.

## Pages

- `/` - planner and product thesis
- `/firecrawl-api/` - endpoint guide
- `/self-host-firecrawl/` - self-host checklist
- `/firecrawl-alternatives/` - comparison criteria
- `/use-cases/` - workflow mapping
- `/pricing/` - independent Firecrawl Space pricing packages; all paid planner use starts here before Polar checkout
- `/api/access` - Polar checkout return verification and paid planner access token issuance
- `/docs/` - evidence, source links, and page matrix
- `/privacy/`, `/terms/`, `/changelog/`, `/llms.txt`
- `/BingSiteAuth.xml` and `/590a3ab02487cffe4cfd55b0df769f65.txt` - search-engine verification files

## Deployment

Cloudflare Worker deployment is configured in `wrangler.toml` for `firecrawl.space` and `www.firecrawl.space`.

Production launch status:

- Cloudflare zone is active for `firecrawl.space`.
- Apex HTTPS and `www` canonical redirect have passed live verification.
- Sitemap, robots, `llms.txt`, facts JSON, runtime API, pricing page, checkout start, unpaid planner gate, and 404 handling have passed live verification.
- Polar checkout is configured through Cloudflare Worker secrets. Secret values are never stored in this repository.

## Search And Distribution

- Public repository: https://github.com/clauxel/firecrawl-space
- Google Search Console: `sc-domain:firecrawl.space` and apex URL-prefix properties verified as `siteOwner`; sitemap submitted.
- Bing Webmaster: site verified; sitemap and 11 URL batch submitted.
- IndexNow: 11 sitemap URLs submitted.
- Backlink ledger: `BACKLINK_LEDGER.json` and `BACKLINK_REPORT.md`.
