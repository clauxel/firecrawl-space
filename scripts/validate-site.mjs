import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { handleRequest } from '../worker/index.js'

const root = new URL('../public/', import.meta.url)
const product = JSON.parse(await readFile(new URL('product.json', root), 'utf8'))
const required = [
  'index.html',
  'firecrawl-api/index.html',
  'self-host-firecrawl/index.html',
  'firecrawl-alternatives/index.html',
  'use-cases/index.html',
  'pricing/index.html',
  'checkout/index.html',
  'success/index.html',
  'cancel/index.html',
  'docs/index.html',
  'privacy/index.html',
  'terms/index.html',
  'changelog/index.html',
  '404/index.html',
  'styles.css',
  'app.js',
  'assets/web-data-workflow.png',
  'favicon.svg',
  'site.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'product.json',
]

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(full))
    else files.push(full)
  }
  return files
}

for (const file of required) {
  const info = await stat(new URL(file, root))
  if (!info.isFile() || info.size < 20) throw new Error('Required file is missing or empty: ' + file)
}

const files = await walk(root.pathname)
const textFiles = files.filter((file) => /\.(html|txt|json|js|css|svg|webmanifest|xml)$/.test(file))
const htmlFiles = textFiles.filter((file) => file.endsWith('.html'))
for (const file of textFiles) {
  const text = await readFile(file, 'utf8')
  if (/[\u4e00-\u9fff]/.test(text)) throw new Error('Public file contains CJK text: ' + file)
  if (/LMCache|KV cache|checkout_start|MCP Server Tools|TrendRadar|GSC|Bing Webmaster|private path|secret key/i.test(text)) {
    throw new Error('Public file contains stale or internal wording: ' + file)
  }
  if (/firecrawl\.dev\/pricing|Open official pricing|No fake checkout|future clearly separate product/i.test(text)) {
    throw new Error('Public file contains external pricing CTA residue: ' + file)
  }
  if (/<a\b[^>]*href=["']https?:\/\//i.test(text)) {
    throw new Error('Public file contains visible outbound link: ' + file)
  }
  if (/href=["']#planner["']|>Open planner<\/a>|Pricing path|isAccessibleForFree":true/i.test(text)) {
    throw new Error('Public file contains ungated planner or weak pricing wording: ' + file)
  }
}

for (const file of htmlFiles) {
  const text = await readFile(file, 'utf8')
  const relative = path.relative(root.pathname, file)
  const h1Count = (text.match(/<h1\b/gi) || []).length
  if (h1Count !== 1) throw new Error('HTML page must have exactly one H1: ' + relative)
  const canonical = text.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]
  const ogUrl = text.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i)?.[1]
  if (!canonical) throw new Error('HTML page missing canonical: ' + relative)
  if (!ogUrl) throw new Error('HTML page missing og:url: ' + relative)
  if (canonical !== ogUrl) throw new Error('HTML page canonical and og:url differ: ' + relative)
  if (!text.includes('/app.js?v=20260625-firecrawl-space-analytics')) {
    throw new Error('HTML page missing analytics script: ' + relative)
  }
}

const index = await readFile(new URL('index.html', root), 'utf8')
for (const needle of [
  'Web data workflow planner',
  'independent, unofficial',
  'Firecrawl implementation planner',
  'assets/web-data-workflow.png',
  'View pricing packages',
  'pricing_required',
]) {
  if (!index.toLowerCase().includes(needle.toLowerCase())) throw new Error('Homepage missing expected copy: ' + needle)
}

const pricing = await readFile(new URL('pricing/index.html', root), 'utf8')
for (const needle of [
  'Independent pricing packages',
  'data-billing-tabs',
  'data-default-billing="annual"',
  'Annual <span>Save 50%</span>',
  'Monthly',
  'data-monthly-display="29"',
  'data-annual-display="14.50"',
  '$4.50',
  '$174 due today',
  '$354 due today',
  'Checkout Pro annual',
  'do not automatically renew',
  'Feature gate',
]) {
  if (!pricing.includes(needle)) throw new Error('Pricing page missing package gate copy: ' + needle)
}

const checkoutPage = await readFile(new URL('checkout/index.html', root), 'utf8')
for (const needle of [
  'data-billing-tabs',
  'data-default-billing="annual"',
  'Annual <span>Save 50%</span>',
  '$4.50',
  '$29.50',
  '$354 due today',
  'Checkout Enterprise annual',
]) {
  if (!checkoutPage.includes(needle)) throw new Error('Checkout page missing billing tab copy: ' + needle)
}

const appScript = await readFile(new URL('app.js', root), 'utf8')
for (const needle of ['page_view', 'billing_toggle', 'setBillingMode', 'data-checkout-link-plan', 'checkoutBilling']) {
  if (!appScript.includes(needle)) throw new Error('App script missing billing tab behavior: ' + needle)
}

const docs = await readFile(new URL('docs/index.html', root), 'utf8')
for (const residue of ['<td>Official docs</td>', '<td>Official self-host guide</td>', '<td>API guide</td></tr>']) {
  if (docs.includes(residue)) throw new Error('Docs page matrix CTA must stay in the Firecrawl Space funnel: ' + residue)
}

for (const page of ['firecrawl-api', 'self-host-firecrawl', 'firecrawl-alternatives', 'use-cases', 'pricing', 'checkout', 'docs']) {
  const text = await readFile(new URL(page + '/index.html', root), 'utf8')
  if (!text.includes('canonical')) throw new Error('Page missing canonical: ' + page)
  if (!text.includes('Firecrawl Space')) throw new Error('Page missing product entity: ' + page)
}

const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8')
const urlCount = (sitemap.match(/<url>/g) || []).length
if (urlCount < 10) throw new Error('Sitemap has too few URLs: ' + urlCount)
for (const route of ['firecrawl-api', 'self-host-firecrawl', 'firecrawl-alternatives', 'use-cases', 'pricing', 'checkout', 'docs']) {
  if (!sitemap.includes('/' + route + '/')) throw new Error('Sitemap missing route: ' + route)
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8'
  if (file.endsWith('.css')) return 'text/css; charset=utf-8'
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (file.endsWith('.json') || file.endsWith('.webmanifest')) return 'application/json; charset=utf-8'
  if (file.endsWith('.xml')) return 'application/xml; charset=utf-8'
  if (file.endsWith('.svg')) return 'image/svg+xml'
  if (file.endsWith('.png')) return 'image/png'
  return 'text/plain; charset=utf-8'
}

const assetBinding = {
  async fetch(request) {
    const url = new URL(request.url)
    let route = decodeURIComponent(url.pathname)
    let file = route === '/' ? 'index.html' : route.replace(/^\//, '')
    if (file.endsWith('/')) file += 'index.html'
    try {
      const body = await readFile(new URL(file, root))
      return new Response(body, { status: 200, headers: { 'Content-Type': contentType(file) } })
    } catch {
      return new Response('not found', { status: 404 })
    }
  },
}

const local = 'http://127.0.0.1:8798'
const analyticsPuts = []
const analyticsKv = {
  async put(key, value, options) {
    analyticsPuts.push({ key, value, options })
  },
}
let response = await handleRequest(new Request(local + '/api/runtime'), { SITE_ASSETS: assetBinding, ANALYTICS_KV: analyticsKv })
if (response.status !== 200) throw new Error('/api/runtime did not return 200')
const runtime = await response.json()
if (!runtime.ok || runtime.product !== product.brand || !runtime.officialRepo || runtime.mode !== 'independent_unofficial_reference' || runtime.paymentProvider !== 'polar' || !runtime.pricing || runtime.plannerAccess !== 'paid_access_required' || !runtime.accessEndpoint || !runtime.analyticsConfigured) {
  throw new Error('runtime response is incomplete')
}
if (runtime.defaultBilling !== 'annual' ||
  runtime.pricing.starter?.monthly?.displayMonthlyUsd !== 9 ||
  runtime.pricing.starter?.annual?.displayMonthlyUsd !== 4.5 ||
  runtime.pricing.starter?.annual?.dueTodayUsd !== 54 ||
  runtime.pricing.pro?.monthly?.displayMonthlyUsd !== 29 ||
  runtime.pricing.pro?.annual?.displayMonthlyUsd !== 14.5 ||
  runtime.pricing.pro?.annual?.dueTodayUsd !== 174 ||
  runtime.pricing.enterprise?.monthly?.displayMonthlyUsd !== 59 ||
  runtime.pricing.enterprise?.annual?.displayMonthlyUsd !== 29.5 ||
  runtime.pricing.enterprise?.annual?.dueTodayUsd !== 354) {
  throw new Error('runtime pricing metadata is missing Annual/Monthly 50% discount values')
}

response = await handleRequest(new Request(local + '/api/analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Referer: 'https://chatgpt.com/' },
  body: JSON.stringify({ event: 'page_view', path: '/docs/', referrer: 'https://chatgpt.com/c/abc' }),
}), { SITE_ASSETS: assetBinding, ANALYTICS_KV: analyticsKv })
const analytics = await response.json()
if (response.status !== 200 || analytics.stored !== true || !analytics.sinks?.includes('kv') || analytics.aiSource !== 'openai-chatgpt' || analyticsPuts.length !== 1) {
  throw new Error('/api/analytics should store events and classify AI referrals')
}

response = await handleRequest(new Request(local + '/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ planId: 'pro', billing: 'annual' }),
}), { SITE_ASSETS: assetBinding })
const missingCheckout = await response.json()
if (response.status !== 503 || missingCheckout.provider !== 'polar' || missingCheckout.paymentConfigured !== false) {
  throw new Error('checkout response should report missing Polar configuration')
}

response = await handleRequest(new Request(local + '/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ planId: 'pro', billing: 'annual' }),
}), { SITE_ASSETS: assetBinding, POLAR_CHECKOUT_URL_PRO_ANNUAL: 'https://buy.polar.sh/polar_cl_test' })
const checkout = await response.json()
if (response.status !== 200 || checkout.provider !== 'polar' || checkout.dueTodayUsd !== 174 || !/^https:\/\/buy\.polar\.sh\//.test(checkout.checkoutUrl || '')) {
  throw new Error('checkout response is missing Polar hosted checkout URL')
}

for (const scenario of [
  ['starter', 'annual', 'POLAR_CHECKOUT_URL_STARTER_ANNUAL', 54],
  ['pro', 'monthly', 'POLAR_CHECKOUT_URL_PRO_MONTHLY', 29],
  ['enterprise', 'annual', 'POLAR_CHECKOUT_URL_ENTERPRISE_ANNUAL', 354],
]) {
  const [planId, billing, key, expectedDueToday] = scenario
  response = await handleRequest(new Request(local + '/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, billing }),
  }), { SITE_ASSETS: assetBinding, [key]: 'https://buy.polar.sh/polar_cl_test' })
  const payload = await response.json()
  if (response.status !== 200 || payload.provider !== 'polar' || payload.planId !== planId || payload.billing !== billing || payload.dueTodayUsd !== expectedDueToday) {
    throw new Error(`checkout response failed for ${planId} ${billing}`)
  }
}

response = await handleRequest(new Request(local + '/api/planner', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ goal: 'Find pricing pages and extract JSON for an AI agent', scale: 'large', output: 'json', deployment: 'cloud' }),
}), { SITE_ASSETS: assetBinding })
const lockedPlanner = await response.json()
if (response.status !== 402 || lockedPlanner.requiresPayment !== true || !lockedPlanner.pricingPath?.endsWith('/pricing/')) {
  throw new Error('/api/planner should require paid access before returning plans')
}

response = await handleRequest(new Request(local + '/api/access', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ checkoutId: 'local_paid_checkout_123', planId: 'pro', billing: 'annual' }),
}), { SITE_ASSETS: assetBinding, ACCESS_TEST_MODE: 'true', ACCESS_SIGNING_SECRET: 'local_validation_secret' })
const access = await response.json()
if (response.status !== 200 || !access.accessToken) throw new Error('/api/access did not issue test paid access token')

response = await handleRequest(new Request(local + '/api/planner', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + access.accessToken },
  body: JSON.stringify({ goal: 'Find pricing pages and extract JSON for an AI agent', scale: 'large', output: 'json', deployment: 'cloud' }),
}), { SITE_ASSETS: assetBinding, ACCESS_SIGNING_SECRET: 'local_validation_secret' })
if (response.status !== 200) throw new Error('/api/planner did not return 200 after paid access')
const plan = await response.json()
if (!plan.recommendedEndpoints?.some((endpoint) => endpoint.name === 'agent') || !plan.recommendedEndpoints?.some((endpoint) => endpoint.name === 'scrape')) {
  throw new Error('planner response is missing expected endpoint recommendations')
}

response = await handleRequest(new Request(local + '/.well-known/firecrawl-space.json'), { SITE_ASSETS: assetBinding })
if (response.status !== 200) throw new Error('facts JSON did not return 200')
const facts = await response.json()
if (facts.relationship !== 'independent_unofficial_reference' || facts.upstream.license !== 'AGPL-3.0') {
  throw new Error('facts JSON is incomplete')
}

response = await handleRequest(new Request(local + '/missing-page'), { SITE_ASSETS: assetBinding })
if (response.status !== 404) throw new Error('unknown route should return 404')

console.log('Validated ' + product.brand + ': ' + textFiles.length + ' public text files, ' + urlCount + ' sitemap URLs, independent pricing page, paid planner gate, runtime API, stored analytics, Polar checkout wiring, facts JSON, 404 handling, and hero image asset.')
