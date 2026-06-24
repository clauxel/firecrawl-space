# WEBSITE_CHANGELOG

## 2026-06-25

- Scope: fixed the remaining experience-audit gaps from the `/experience/` review.
- Implemented: added a real `/api/analytics` storage path with KV/Analytics Engine support, page-view/link/checkout/planner/paid-gate event tracking, and AI/referral source classification; added the `ANALYTICS_KV` binding for production.
- Implemented: updated source notes page-matrix CTA labels so commercial next actions stay in the Firecrawl Space pricing funnel, not upstream official docs.
- Implemented: added canonical and Open Graph URL metadata to non-core public pages and loaded the analytics script on every public HTML page.
- Verification: `npm run build` now enforces every HTML page has exactly one H1, canonical, `og:url`, the analytics script, no source-note CTA leakage, and stored analytics behavior.
- Production deployment: Cloudflare Worker deployed as version `a6180524-6ace-4247-9108-316981010c52`; live checks passed for homepage, docs, pricing, privacy, terms, changelog, 404 body metadata, sitemap, robots, www redirect, runtime analytics configuration, `/api/analytics` stored KV event, unpaid planner `402`, and Polar checkout start.

## 2026-06-24

- Scope: re-audited Firecrawl Space against the stricter completion gate that only tolerates failures for external backlink submission channels.
- Implemented: changed non-confirmed third-party backlink rows from generic blocked/pending wording to `external_backlink_exception`, preserving each row's original status, evidence, and reason.
- Verification: production build and live acceptance checks are rerun in this audit; backlink exceptions now report `0` production-blocking failures.
- Deployment/Git status: Documentation/ledger update only; production site code and Cloudflare deployment remain unchanged.
- Follow-up: Continue normal backlink review cadence, but these external backlink exceptions do not block production completion.

## 2026-06-24

- Scope: completed the default public release/distribution loop for Firecrawl Space where normal credentials and free paths were available.
- Implemented: created and pushed public GitHub repository `clauxel/firecrawl-space`; added root `BingSiteAuth.xml` and IndexNow key file; ran local search/backlink submission tooling; generated `search-submission-result.json`, `BACKLINK_LEDGER.json`, and `BACKLINK_REPORT.md`.
- Verification: `npm run build` passed after adding search verification files. Cloudflare Worker deployed as version `5de1bb95-4636-404f-a7d9-efd20751f9a8`; live HTTPS checks passed for homepage, `/pricing/`, sitemap, robots, `BingSiteAuth.xml`, IndexNow key file, and `www` canonical redirect.
- Search submission: Bing Webmaster `AddSite`/`VerifySite`/`SubmitFeed`/`SubmitUrlbatch` returned submitted and the matching site is verified; IndexNow accepted 11 sitemap URLs. Google Search Console was initially blocked by missing Site Verification API scope, then completed after OAuth reauthorization.
- Backlink distribution: 12 ledger rows recorded. Confirmed submitted: GitHub repository, AISO Tools, FindAIDir, and Kerq. External backlink exceptions: HyzenPro, Forward Future, awesome-list PR as not relevant, Dev.to login, Product Hunt launch context, OpenAIToolsHub form category mismatch, Nav-AI reciprocal backlink requirement, and SeekTool reciprocal backlink requirement. These exceptions are third-party backlink/listing constraints and are not production blockers.
- Follow-up: Google OAuth was reauthorized with Search Console write and Site Verification scopes; Google Search Console now lists `sc-domain:firecrawl.space`, `https://firecrawl.space/`, and `https://www.firecrawl.space/` as `siteOwner`. Sitemap submission returned `204` for the domain property and apex URL-prefix property.

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
- External action status was updated later on 2026-06-24: GitHub, Google Search Console, Bing Webmaster, IndexNow, and backlink ledger work were executed.
