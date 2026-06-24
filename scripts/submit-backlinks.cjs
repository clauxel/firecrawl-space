const { chromium } = require('playwright')
const fs = require('node:fs/promises')
const { existsSync } = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const campaign = 'firecrawlspace202606'
const evidenceDir = path.join(root, 'backlink-evidence')
const requestedTargets = new Set(process.argv.slice(2))

const product = {
  name: 'Firecrawl Space',
  baseUrl: 'https://firecrawl.space/',
  logoUrl: 'https://firecrawl.space/favicon.svg',
  assetUrl: 'https://firecrawl.space/assets/web-data-workflow.png',
  supportEmail: 'support@aigeamy.com',
  contactName: 'Firecrawl Space Team',
  short: 'Independent Firecrawl workflow planner for crawl, scrape, search, map, and self-host decisions.',
  description:
    'Firecrawl Space is an independent, unofficial workflow planner for teams evaluating Firecrawl-style web data pipelines. It helps developers choose between search, scrape, crawl, map, batch scrape, agent, interact, hosted API, and self-host paths, then turns the decision into a rollout checklist after paid access.',
  features:
    'Firecrawl workflow planning, web data extraction checklists, API path selection, self-host rollout guidance, paid implementation reports',
  featureLines:
    'Firecrawl workflow planning\nWeb data extraction checklists\nAPI path selection\nSelf-host rollout guidance\nPaid implementation reports',
  tags: 'Firecrawl, web scraping, web data, AI agents, developer tools',
  pricing: 'Paid one-time access plans with annual and monthly options; annual is selected by default.',
  docsUrl: 'https://firecrawl.space/docs/',
  endpointUrl: 'https://firecrawl.space/api/runtime',
  githubUrl: 'https://github.com/clauxel/firecrawl-space',
}

const plannedOnly = [
  {
    platform: 'GitHub repository',
    source: 'github',
    status: 'submitted',
    entryUrl: 'https://github.com/clauxel/firecrawl-space',
    submittedUrl: product.baseUrl,
    finalUrl: 'https://github.com/clauxel/firecrawl-space',
    note: 'Public repository created and pushed; README links the production site and explains the independent, unofficial product scope.',
  },
  {
    platform: 'Awesome Web Scraping lists',
    source: 'awesome-web-scraping',
    status: 'blocked_validation',
    entryUrl: 'https://github.com/lorien/awesome-web-scraping',
    submittedUrl: product.baseUrl,
    finalUrl: 'https://github.com/lorien/awesome-web-scraping',
    note: 'Skipped PR because Firecrawl Space is a paid independent planning site, not an open-source scraping library entry. Adding it would be lower relevance and could be spammy.',
  },
  {
    platform: 'Dev.to article',
    source: 'devto',
    status: 'blocked_requires_login',
    entryUrl: 'https://dev.to/new',
    submittedUrl: product.baseUrl,
    finalUrl: 'https://dev.to/new',
    note: 'Article publishing requires an authenticated author account and should use original educational content rather than a thin launch post.',
  },
  {
    platform: 'Product Hunt',
    source: 'producthunt',
    status: 'blocked_requires_relationship',
    entryUrl: 'https://www.producthunt.com/posts/new',
    submittedUrl: product.baseUrl,
    finalUrl: 'https://www.producthunt.com/posts/new',
    note: 'Formal launch platform; skipped because a launch/schedule requires account context, legal onboarding choices, and launch timing decisions.',
  },
]

const targets = [
  {
    id: 'aisotools',
    name: 'AISO Tools',
    url: 'https://aisotools.com/submit',
    async run(page) {
      await page.locator('input[name="tool_name"]').fill(product.name)
      await page.locator('input[name="url"]').fill(utm('aisotools'))
      await selectByText(page, 'select[name="category"]', 'AI Agent Infrastructure')
      await page.locator('input[name="short_description"]').fill(product.short.slice(0, 118))
      await page.locator('textarea[name="description"]').fill(product.description)
      await selectByText(page, 'select[name="pricing"]', 'Paid only')
      await page.locator('input[name="pricing_details"]').fill(product.pricing)
      await page.locator('input[name="features"]').fill(product.features)
      await page.locator('input[name="email"]').fill(product.supportEmail)
      await clickSubmit(page, /Submit Tool/i)
    },
  },
  {
    id: 'openaitoolshub',
    name: 'OpenAIToolsHub',
    url: 'https://www.openaitoolshub.org/submit',
    async run(page) {
      await page.locator('input[name="name"]').fill(product.name)
      await page.locator('input[name="websiteUrl"]').fill(utm('openaitoolshub'))
      await page.locator('input[name="logoUrl"]').fill(product.logoUrl)
      await page.locator('textarea[name="description"]').fill(product.description)
      await selectByText(page, 'select[name="category"]', 'Machine Learning')
      await page.locator('input[name="contactEmail"]').fill(product.supportEmail)
      await clickSubmit(page, /Submit Tool for Review/i)
    },
  },
  {
    id: 'findaidir',
    name: 'FindAIDir',
    url: 'https://findaidir.com/submit-tool',
    async run(page) {
      await page.locator('input[name="tool_name"]').fill(product.name)
      await page.locator('input[name="website_url"]').fill(utm('findaidir'))
      await page.locator('input[name="category"]').fill('Developer Tools')
      await page.locator('input[name="tags"]').fill(product.tags)
      await page.locator('input[name="submitter_name"]').fill(product.contactName)
      await page.locator('input[name="submitter_email"]').fill(product.supportEmail)
      await page.locator('textarea[name="description"]').fill(product.description)
      await clickSubmit(page, /Submit for review/i)
    },
  },
  {
    id: 'hyzenpro',
    name: 'HyzenPro',
    url: 'https://hyzenpro.com/submit-ai-tool/',
    async run(page) {
      await clickIfVisible(page, /Essential only|Accept all|Continue browsing/i)
      await page.locator('input[placeholder="Full name"]').fill(product.contactName)
      await page.locator('input[placeholder="name@company.com"]').fill(product.supportEmail)
      await page.locator('input[placeholder="Company or team name"]').fill(product.name)
      await page.locator('input[placeholder="Founder, marketing lead, product manager"]').fill('Product team')
      await page.locator('input[placeholder="Product name"]').fill(product.name)
      await page.locator('input[placeholder="https://yourtool.com"]').fill(utm('hyzenpro'))
      await selectByText(page, 'select', 'General AI Tools', 0)
      await selectByText(page, 'select', 'Paid', 1)
      await page.locator('input[placeholder^="One clear sentence"]').fill(product.short)
      await page.locator('textarea[placeholder^="Explain the problem"]').fill(product.description)
      await page.locator('input[placeholder="Optional asset URL"]').fill(product.assetUrl)
      await page.locator('textarea[placeholder^="One feature per line"]').fill(product.featureLines)
      await page.locator('textarea[placeholder^="Add launch context"]').fill('Independent Firecrawl workflow planner for developer and AI data teams.')
      await clickSubmit(page, /SUBMIT TOOL FOR REVIEW/i)
    },
  },
  {
    id: 'forwardfuture',
    name: 'Forward Future Tools',
    url: 'https://tools.forwardfuture.ai/submit',
    async run(page) {
      await page.locator('input[name="name"]').fill(product.name)
      await page.locator('input[name="websiteUrl"]').fill(utm('forwardfuture'))
      await page.locator('textarea[name="description"]').fill(product.description)
      await page.locator('textarea[name="features"]').fill(product.featureLines)
      await page.locator('textarea[name="useCases"]').fill('Developers use Firecrawl Space to decide whether a web data job should use search, scrape, crawl, map, batch scrape, agent, hosted API, or self-hosted deployment.')
      await selectByText(page, 'select[name="pricing"]', 'Paid')
      await selectByText(page, 'select[name="industry"]', 'Technology & Software')
      await selectByText(page, 'select[name="profession"]', 'Developers & Engineers')
      await page.locator('input[name="tags"]').fill(product.tags)
      await clickSubmit(page, /Submit Tool/i)
    },
  },
  {
    id: 'kerq',
    name: 'Kerq',
    url: 'https://kerq.dev/submit',
    async run(page) {
      await page.locator('#f-name').fill(product.name)
      await page.locator('#f-desc').fill('Firecrawl Space helps teams choose a Firecrawl-style search, scrape, crawl, map, batch, or self-host workflow before implementation.')
      await setCheckbox(page, 'input[value="ai-ml"]')
      await setCheckbox(page, 'input[value="productivity"]')
      await page.locator('#f-endpoint').fill(product.endpointUrl)
      await page.locator('#f-docs').fill(product.docsUrl)
      await page.locator('#f-github').fill(product.githubUrl)
      await page.locator('#f-provider-name').fill(product.contactName)
      await page.locator('#f-email').fill(product.supportEmail)
      await clickSubmit(page, /Submit Tool for Review/i)
    },
  },
  {
    id: 'navai',
    name: 'Nav-AI',
    url: 'https://nav-ai.net/submit',
    async run(page) {
      await blockIfReciprocalRequired(page)
      await page.locator('input[name="website"]').fill(product.name)
      await page.locator('input[name="url"]').fill(utm('navai'))
      await clickSubmit(page, /^Submit$/i)
    },
  },
  {
    id: 'seektool',
    name: 'SeekTool.AI',
    url: 'https://seektool.ai/submit',
    async run(page) {
      await blockIfReciprocalRequired(page)
      await page.locator('input[name="website"]').fill(product.name)
      await page.locator('input[name="url"]').fill(utm('seektool'))
      await clickSubmit(page, /Submit Now/i)
    },
  },
]

function utm(source) {
  return `${product.baseUrl}?utm_source=${source}&utm_medium=directory&utm_campaign=${campaign}`
}

async function selectByText(page, selector, labelPart, index = 0) {
  const locator = page.locator(selector).nth(index)
  const options = await locator.locator('option').evaluateAll((elements, text) => {
    const lower = String(text).toLowerCase()
    return elements
      .map((option) => ({ value: option.value, text: option.textContent || '' }))
      .filter((option) => option.text.toLowerCase().includes(lower))
  }, labelPart)
  if (!options.length) throw new Error(`No option containing "${labelPart}" for ${selector}`)
  await locator.selectOption(options[0].value)
}

async function clickSubmit(page, name) {
  const submit = page.getByRole('button', { name }).first()
  await submit.click({ timeout: 10000 })
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
  await page.waitForTimeout(5000)
}

async function setCheckbox(page, selector) {
  await page.locator(selector).evaluate((element) => {
    element.checked = true
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function clickIfVisible(page, name) {
  const button = page.getByRole('button', { name }).first()
  if (await button.isVisible().catch(() => false)) await button.click().catch(() => {})
}

async function blockIfReciprocalRequired(page) {
  const body = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')
  if (/add\s+<a|add .* to your website|requiring only a simple backlink|reciprocal backlink|required backlink/i.test(body)) {
    const error = new Error('Reciprocal backlink requirement conflicts with no-visible-outbound-link rule')
    error.status = 'blocked_validation'
    throw error
  }
}

function sanitize(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .trim()
    .slice(0, 700)
}

function classify(text, url) {
  const lower = sanitize(text).toLowerCase()
  if (/reciprocal backlink|simple backlink|required backlink/.test(lower)) return 'blocked_validation'
  if (/captcha|turnstile|cloudflare|verify you are human|security check/.test(lower)) return 'blocked_security_verification'
  if (/sign in|log in|login|password/.test(lower)) return 'blocked_requires_login'
  if (!/no payment required/.test(lower) && /premium|paid upgrade|payment required|free slots full/.test(lower)) return 'blocked_paid_gate'
  if (/element is not visible|timeout.*locator|waiting for locator|no option containing|server misconfigured|server error|internal server error|bad gateway|service unavailable/.test(lower)) return 'blocked_no_form_visible'
  if (/submission received|tool was saved for review|tool submitted|your tool is live|published and indexable|thanks for submitting|submitted successfully|has been sent|thank you for your submission|thanks, your submission|accepted the submission|already submitted|successfully submitted|success\b/.test(lower) || /success|thanks|finish/.test(url)) {
    return 'submitted'
  }
  if (/submitting|review/.test(lower)) return 'submitted_unverified'
  return 'submitted_unverified'
}

async function runTarget(browser, target) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const startedAt = new Date().toISOString()
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)
    const beforeUrl = page.url()
    await target.run(page)
    const finalUrl = page.url()
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')
    const status = classify(bodyText, finalUrl)
    const screenshot = path.join(evidenceDir, `${target.id}.png`)
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {})
    return {
      platform: target.name,
      source: target.id,
      status,
      entryUrl: target.url,
      submittedUrl: utm(target.id),
      beforeUrl,
      finalUrl,
      startedAt,
      finishedAt: new Date().toISOString(),
      evidence: `backlink-evidence/${target.id}.png`,
      note: sanitize(bodyText),
    }
  } catch (error) {
    const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '')
    const finalUrl = page.url()
    const screenshot = path.join(evidenceDir, `${target.id}-blocked.png`)
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {})
    return {
      platform: target.name,
      source: target.id,
      status: error.status || classify(`${error.message}\n${bodyText}`, finalUrl),
      entryUrl: target.url,
      submittedUrl: utm(target.id),
      finalUrl,
      startedAt,
      finishedAt: new Date().toISOString(),
      evidence: `backlink-evidence/${target.id}-blocked.png`,
      error: sanitize(error.message),
      note: sanitize(bodyText),
    }
  } finally {
    await page.close().catch(() => {})
  }
}

function reportMarkdown(ledger) {
  const lines = [
    '# Backlink Submission Report',
    '',
    `Generated: ${ledger.generatedAt}`,
    '',
    `Product: ${ledger.product}`,
    `Domain: ${ledger.baseUrl}`,
    `Campaign: ${ledger.campaign}`,
    `Source guide: ${ledger.sourceGuide}`,
    '',
    '## Summary',
    '',
    `- Total recorded: ${ledger.counts.total}`,
    `- Confirmed submitted: ${ledger.counts.confirmed}`,
    `- Pending or unverified: ${ledger.counts.pending}`,
    `- Blocked: ${ledger.counts.blocked}`,
    '',
    '## Results',
    '',
  ]
  for (const result of ledger.results) {
    lines.push(`- ${result.platform}: ${result.status}`)
    lines.push(`  - Entry: ${result.entryUrl}`)
    lines.push(`  - Submitted URL: ${result.submittedUrl}`)
    lines.push(`  - Final URL: ${result.finalUrl || result.entryUrl}`)
    if (result.evidence) lines.push(`  - Evidence: ${result.evidence}`)
    if (result.note) lines.push(`  - Note: ${result.note}`)
    if (result.error) lines.push(`  - Error: ${result.error}`)
  }
  return `${lines.join('\n')}\n`
}

async function main() {
  await fs.mkdir(evidenceDir, { recursive: true })
  const runTargets = requestedTargets.size ? targets.filter((target) => requestedTargets.has(target.id)) : targets
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const browser = await chromium.launch({
    headless: true,
    ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
  })
  const results = []
  for (const target of runTargets) {
    results.push(await runTarget(browser, target))
  }
  await browser.close()

  const allResults = [...plannedOnly, ...results]
  const confirmed = allResults.filter((result) => result.status === 'submitted')
  const pending = allResults.filter((result) => result.status === 'submitted_unverified')
  const blocked = allResults.filter((result) => result.status.startsWith('blocked'))
  const ledger = {
    product: product.name,
    domain: domainFromUrl(product.baseUrl),
    baseUrl: product.baseUrl,
    campaign,
    generatedAt: new Date().toISOString(),
    sourceGuide: 'saas-management-platform/public/tools/report-manager/generated/backlinks/ruflo-backlink-guide-2026-05-17.html',
    counts: {
      total: allResults.length,
      confirmed: confirmed.length,
      pending: pending.length,
      blocked: blocked.length,
    },
    results: allResults,
  }
  await fs.writeFile(path.join(root, 'BACKLINK_LEDGER.json'), `${JSON.stringify(ledger, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(root, 'BACKLINK_REPORT.md'), reportMarkdown(ledger), 'utf8')
  console.log(JSON.stringify({ counts: ledger.counts, output: ['BACKLINK_LEDGER.json', 'BACKLINK_REPORT.md'] }, null, 2))
}

function domainFromUrl(url) {
  return new URL(url).hostname
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
