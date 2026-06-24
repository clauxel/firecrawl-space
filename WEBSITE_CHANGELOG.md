# WEBSITE_CHANGELOG

## 2026-06-24

- Scope: completed the default public release/distribution loop for Firecrawl Space where normal credentials and free paths were available.
- Implemented: created and pushed public GitHub repository `clauxel/firecrawl-space`; added root `BingSiteAuth.xml` and IndexNow key file; ran local search/backlink submission tooling; generated `search-submission-result.json`, `BACKLINK_LEDGER.json`, and `BACKLINK_REPORT.md`.
- Verification: `npm run build` passed after adding search verification files. Cloudflare Worker deployed as version `5de1bb95-4636-404f-a7d9-efd20751f9a8`; live HTTPS checks passed for homepage, `/pricing/`, sitemap, robots, `BingSiteAuth.xml`, IndexNow key file, and `www` canonical redirect.
- Search submission: Bing Webmaster `AddSite`/`VerifySite`/`SubmitFeed`/`SubmitUrlbatch` returned submitted and the matching site is verified; IndexNow accepted 11 sitemap URLs. Google Search Console domain property was added, but sitemap submission is blocked because the current OAuth token lacks Site Verification API scope and the property remains `siteUnverifiedUser`.
- Backlink distribution: 12 ledger rows recorded. Confirmed submitted: GitHub repository, AISO Tools, FindAIDir, and Kerq. Pending/unverified: HyzenPro and Forward Future. Blocked: awesome-list PR as not relevant, Dev.to login, Product Hunt launch context, OpenAIToolsHub form category mismatch, Nav-AI reciprocal backlink requirement, and SeekTool reciprocal backlink requirement.

- Scope: added Annual/Monthly pricing tabs and default Annual pricing across Firecrawl Space pricing and checkout.
- Implemented: pricing and checkout pages now use a segmented Annual/Monthly control, Annual is selected by default, Annual is 50% cheaper than Monthly, due-today totals update per plan, and checkout buttons keep the selected `billing` value.
- Pricing rule: Monthly base prices are Starter `$9/mo`, Pro `$29/mo`, and Enterprise `$59/mo`; Annual displays Starter `$4.50/mo billed yearly` with `$54` due today, Pro `$14.50/mo billed yearly` with `$174` due today, and Enterprise `$29.50/mo billed yearly` with `$354` due today. Payments remain one-time and do not automatically renew.
- Polar setup: created the missing one-time Polar product mappings for Starter Annual, Pro Monthly, and Enterprise Annual; Cloudflare Worker secrets now include all six plan/billing product IDs plus the existing Polar access and paid-access signing secrets.
- Verification: `npm run build` passed with checks for billing tabs, default Annual, 50% Annual discount, runtime pricing metadata, unpaid planner `402`, and Polar checkout wiring. Production HTTPS checks passed for `/pricing/`, `/api/runtime`, all six `/api/checkout` plan/billing combinations, unpaid `/api/planner`, sitemap, robots, and `www` canonical redirect.
- Production deployment: Cloudflare Worker deployed as version `628964af-d553-4711-9e83-faf0e8281c8b`. Browser validation passed for default Annual state, Monthly toggle, Annual toggle, checkout button billing state, Polar checkout start, and desktop/mobile pricing layout screenshots without making a payment.

- Scope: converted Firecrawl Space to pricing-first paid feature access.
- Implemented: homepage CTA now routes to the independent `/pricing/` packages page; planner form and `/api/planner` are paid-gated; `/api/access` verifies Polar checkout return before issuing planner access; success/cancel pages no longer expose unpaid planner use.
- Pricing rule: Starter `$9/mo` monthly, Pro `$14.50/mo billed yearly` with `$174` due today, Enterprise `$59/mo` monthly; all payments are one-time and do not automatically renew; payment provider remains Polar.
- Link rule: removed visible outbound source/vendor links from public pages; source facts remain plain text or internal source notes.
- Verification: `npm run build` passed after the pricing-first paid gate change; validation covers the independent pricing page, unpaid planner `402`, paid access token path, Polar checkout wiring, no visible outbound links, and no direct planner shortcut.
- Production deployment: Cloudflare Worker deployed as version `80294f1f-b323-462a-b5e8-17eb80e9122a`; live HTTPS checks passed for homepage, `/pricing/`, `/api/runtime`, unpaid `/api/planner` payment-required response, `/api/checkout` Polar checkout start, sitemap, robots, 404, and `www` canonical redirect. Browser click validation passed for homepage-to-pricing, unpaid planner-to-pricing, and pricing-to-Polar checkout start without making a payment.

- Scope: initial local build for `firecrawl.space` using the open-source-code website build workflow.
- Repo input: `firecrawl/firecrawl`.
- Positioning: independent, unofficial Firecrawl implementation planner rather than official service clone.
- Implemented pages: homepage planner, API guide, self-host checklist, alternatives, use cases, pricing path, source notes, privacy, terms, changelog, and 404.
- Implemented assets: generated hero bitmap, favicon, web manifest, robots.txt, sitemap.xml, llms.txt, product.json, and facts JSON endpoint.
- Implemented runtime: Cloudflare Worker static serving, canonical redirect logic, `/api/runtime`, `/api/planner`, `/api/analytics`, and `/.well-known/firecrawl-space.json`.
- Verification: `npm run build` passed; local preview, desktop/mobile Chrome screenshots, API guide screenshot, planner API, runtime API, facts JSON, core page HTTP checks, sitemap/robots/llms, and 404 handling passed.
- Production launch: Cloudflare Worker deployed with `firecrawl.space/*`, `www.firecrawl.space/*`, and workers.dev triggers. Cloudflare zone is active; Spaceship nameservers point to Cloudflare; proxied apex/www DNS records are live.
- Production verification: direct HTTPS checks passed for apex, www canonical redirect, sitemap, robots, llms, facts JSON, runtime API, and 404; no Spaceship parking signals were present. `workers.dev` returned 200 through the default network path.
- External action status was updated later on 2026-06-24: GitHub, Bing Webmaster, IndexNow, and backlink ledger work were executed; Google Search Console remains blocked by missing Site Verification API scope.
