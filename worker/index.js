const CONFIG = {
  slug: 'firecrawl-space',
  brand: 'Firecrawl Space',
  domain: 'firecrawl.space',
  canonicalOrigin: 'https://firecrawl.space',
  support: 'support@aigeamy.com',
  officialSite: 'https://firecrawl.dev/',
  officialDocs: 'https://docs.firecrawl.dev/',
  officialRepo: 'https://github.com/firecrawl/firecrawl',
  license: 'AGPL-3.0',
  summary: 'Independent, unofficial Firecrawl implementation planner for teams deciding how to search, scrape, crawl, map, and extract web data for AI agents.',
  endpoints: {
    search: 'Find sources, then return result pages with content.',
    scrape: 'Turn one URL into Markdown, HTML, screenshot, or structured JSON.',
    crawl: 'Scrape many pages from one site through an asynchronous crawl job.',
    map: 'Discover URLs on a site before selecting crawl or scrape targets.',
    batch_scrape: 'Scrape a known list of URLs asynchronously.',
    agent: 'Describe a research task and let an agent find and return sources.',
    interact: 'Run page actions after a scrape when a page needs clicking, typing, scrolling, or waiting.',
  },
  defaultPlanId: 'pro',
  defaultBilling: 'annual',
  plans: {
    starter: {
      id: 'starter',
      name: 'Starter',
      monthlyAmountCents: 900,
      currency: 'USD',
      defaultBilling: 'annual',
      allowedBilling: ['monthly', 'annual'],
      summary: 'One implementation planning report for a solo builder validating a Firecrawl workflow.',
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      monthlyAmountCents: 2900,
      annualDiscountMultiplier: 0.5,
      currency: 'USD',
      defaultBilling: 'annual',
      allowedBilling: ['monthly', 'annual'],
      summary: 'A reviewable annual workflow plan, source notes, and rollout checklist for a team.',
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyAmountCents: 5900,
      currency: 'USD',
      defaultBilling: 'annual',
      allowedBilling: ['monthly', 'annual'],
      summary: 'Governance notes, self-host review, and stakeholder-ready evidence for larger teams.',
    },
  },
}

const ANNUAL_DISCOUNT_MULTIPLIER = 0.5
const POLAR_API_BASE = 'https://api.polar.sh'
const POLAR_ACCESS_TOKEN_KEYS = ['POLAR_ACCESS_TOKEN', 'POLAR_API_KEY', 'POLAR_TOKEN']
const POLAR_GENERIC_PRODUCT_ID_KEYS = ['POLAR_PRODUCT_ID', 'POLAR_DEFAULT_PRODUCT_ID', 'POLAR_FIRECRAWL_SPACE_PRODUCT_ID']
const POLAR_CHECKOUT_LINK_KEYS = {
  'starter:monthly': ['POLAR_CHECKOUT_URL_STARTER_MONTHLY', 'POLAR_STARTER_MONTHLY_CHECKOUT_URL'],
  'starter:annual': ['POLAR_CHECKOUT_URL_STARTER_ANNUAL', 'POLAR_STARTER_ANNUAL_CHECKOUT_URL'],
  'pro:monthly': ['POLAR_CHECKOUT_URL_PRO_MONTHLY', 'POLAR_PRO_MONTHLY_CHECKOUT_URL'],
  'pro:annual': ['POLAR_CHECKOUT_URL_PRO_ANNUAL', 'POLAR_PRO_ANNUAL_CHECKOUT_URL'],
  'enterprise:monthly': ['POLAR_CHECKOUT_URL_ENTERPRISE_MONTHLY', 'POLAR_ENTERPRISE_MONTHLY_CHECKOUT_URL'],
  'enterprise:annual': ['POLAR_CHECKOUT_URL_ENTERPRISE_ANNUAL', 'POLAR_ENTERPRISE_ANNUAL_CHECKOUT_URL'],
}
const POLAR_PRODUCT_ID_KEYS = {
  'starter:monthly': ['POLAR_PRODUCT_ID_STARTER_MONTHLY', 'POLAR_STARTER_MONTHLY_PRODUCT_ID'],
  'starter:annual': ['POLAR_PRODUCT_ID_STARTER_ANNUAL', 'POLAR_STARTER_ANNUAL_PRODUCT_ID'],
  'pro:monthly': ['POLAR_PRODUCT_ID_PRO_MONTHLY', 'POLAR_PRO_MONTHLY_PRODUCT_ID'],
  'pro:annual': ['POLAR_PRODUCT_ID_PRO_ANNUAL', 'POLAR_PRO_ANNUAL_PRODUCT_ID'],
  'enterprise:monthly': ['POLAR_PRODUCT_ID_ENTERPRISE_MONTHLY', 'POLAR_ENTERPRISE_MONTHLY_PRODUCT_ID'],
  'enterprise:annual': ['POLAR_PRODUCT_ID_ENTERPRISE_ANNUAL', 'POLAR_ENTERPRISE_ANNUAL_PRODUCT_ID'],
}
const ACCESS_SECRET_KEYS = ['FIRECRAWL_SPACE_ACCESS_SECRET', 'ACCESS_SIGNING_SECRET']
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30
const ANALYTICS_TTL_SECONDS = 60 * 60 * 24 * 90

const ALT_HOSTS = new Set(['www.' + CONFIG.domain])

function securityHeaders(request) {
  const headers = new Headers({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'X-Robots-Tag': 'index, follow',
  })
  const origin = request?.headers?.get?.('Origin')
  if (originAllowed(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')
    headers.set('Vary', 'Origin')
  }
  return headers
}

function originAllowed(origin) {
  if (!origin) return false
  try {
    const url = new URL(origin)
    return url.hostname === CONFIG.domain ||
      ALT_HOSTS.has(url.hostname) ||
      url.hostname.endsWith('.workers.dev') ||
      url.hostname.endsWith('.pages.dev') ||
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function jsonResponse(data, status = 200, request = null) {
  const headers = securityHeaders(request)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(data), { status, headers })
}

async function getSecretValue(value) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value.get === 'function') {
    const resolved = await value.get()
    return typeof resolved === 'string' ? resolved.trim() : ''
  }
  return ''
}

async function firstSecretEnv(env, ...keys) {
  for (const key of keys) {
    const value = await getSecretValue(env?.[key])
    if (value) return value
  }
  return ''
}

function selectionKey(planId, billing) {
  return `${planId}:${billing}`
}

function normalizePlanSelection(body = {}) {
  const rawPlanId = typeof body.planId === 'string'
    ? body.planId.split(':')[0]
    : typeof body.plan === 'string'
      ? body.plan
      : CONFIG.defaultPlanId
  const plan = CONFIG.plans[rawPlanId] || CONFIG.plans[CONFIG.defaultPlanId]
  const requestedBilling = body.billing === 'monthly' || body.period === 'monthly' ? 'monthly' : 'annual'
  const billing = plan.allowedBilling.includes(requestedBilling) ? requestedBilling : plan.defaultBilling
  return { plan, planId: plan.id, billing, period: billing }
}

function amountFor(plan, billing) {
  const multiplier = Number.isFinite(plan.annualDiscountMultiplier)
    ? plan.annualDiscountMultiplier
    : ANNUAL_DISCOUNT_MULTIPLIER
  const monthlyCents = billing === 'annual'
    ? Math.round(plan.monthlyAmountCents * multiplier)
    : plan.monthlyAmountCents
  return {
    monthlyCents,
    dueTodayCents: billing === 'annual' ? monthlyCents * 12 : monthlyCents,
  }
}

function centsToUsd(cents) {
  return Number((cents / 100).toFixed(2))
}

function safeText(value, maxLength = 160) {
  return String(value || '')
    .replace(/[^\w:./?=&%#+@ -]/g, '')
    .slice(0, maxLength)
    .trim()
}

function hostFromUrl(value) {
  try {
    return new URL(String(value || '')).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function userAgentFamily(value) {
  const text = String(value || '').toLowerCase()
  if (!text) return ''
  if (text.includes('chatgpt-user')) return 'chatgpt-user'
  if (text.includes('perplexity')) return 'perplexity'
  if (text.includes('claudebot') || text.includes('anthropic')) return 'anthropic'
  if (text.includes('googlebot')) return 'googlebot'
  if (text.includes('bingbot')) return 'bingbot'
  if (text.includes('facebookexternalhit')) return 'facebook'
  if (text.includes('twitterbot')) return 'x-twitter'
  if (text.includes('slackbot')) return 'slack'
  if (text.includes('chrome')) return 'chrome'
  if (text.includes('safari')) return 'safari'
  if (text.includes('firefox')) return 'firefox'
  return 'other'
}

function aiReferralSource(referrerHost, userAgent) {
  const text = `${referrerHost} ${String(userAgent || '').toLowerCase()}`
  if (/chatgpt|openai/.test(text)) return 'openai-chatgpt'
  if (/perplexity/.test(text)) return 'perplexity'
  if (/gemini|bard\.google|google\.com\/search/.test(text)) return 'google-gemini-or-search'
  if (/copilot|bing\.com|microsoft/.test(text)) return 'microsoft-copilot-or-bing'
  if (/claude|anthropic/.test(text)) return 'anthropic-claude'
  if (/phind/.test(text)) return 'phind'
  return ''
}

function analyticsConfigured(env) {
  return Boolean(env?.ANALYTICS_KV?.put || env?.ANALYTICS_EVENTS?.writeDataPoint)
}

async function writeAnalyticsEvent(env, event) {
  const sinks = []
  if (env?.ANALYTICS_EVENTS?.writeDataPoint) {
    env.ANALYTICS_EVENTS.writeDataPoint({
      indexes: [CONFIG.slug],
      blobs: [
        event.event,
        event.path,
        event.aiSource,
        event.referrerHost,
        event.planId,
        event.billing,
      ],
      doubles: [event.timestamp],
    })
    sinks.push('analytics_engine')
  }
  if (env?.ANALYTICS_KV?.put) {
    const key = `event:${event.day}:${event.timestamp}:${crypto.randomUUID()}`
    await env.ANALYTICS_KV.put(key, JSON.stringify(event), { expirationTtl: ANALYTICS_TTL_SECONDS })
    sinks.push('kv')
  }
  return sinks
}

function publicPlans() {
  return Object.fromEntries(
    Object.entries(CONFIG.plans).map(([id, plan]) => {
      const entries = {
        id,
        name: plan.name,
        currency: plan.currency,
        summary: plan.summary,
        defaultBilling: plan.defaultBilling,
        allowedBilling: plan.allowedBilling,
        noAutomaticRenewal: true,
      }
      if (plan.allowedBilling.includes('monthly')) {
        const monthly = amountFor(plan, 'monthly')
        entries.monthly = {
          displayMonthlyUsd: centsToUsd(monthly.monthlyCents),
          dueTodayUsd: centsToUsd(monthly.dueTodayCents),
          coverage: 'one month',
          noAutomaticRenewal: true,
        }
      }
      if (plan.allowedBilling.includes('annual')) {
        const annual = amountFor(plan, 'annual')
        entries.annual = {
          displayMonthlyUsd: centsToUsd(annual.monthlyCents),
          dueTodayUsd: centsToUsd(annual.dueTodayCents),
          coverage: 'one year',
          noAutomaticRenewal: true,
        }
      }
      return [id, entries]
    }),
  )
}

function validPolarUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && /(^|\.)polar\.sh$/i.test(url.hostname) ? url.toString() : ''
  } catch {
    return ''
  }
}

function validPolarApiBase(value) {
  if (typeof value !== 'string' || !value.trim()) return POLAR_API_BASE
  try {
    const url = new URL(value.trim())
    if (url.protocol === 'https:' && (url.hostname === 'api.polar.sh' || url.hostname === 'sandbox-api.polar.sh')) return url.origin
  } catch {}
  return POLAR_API_BASE
}

function extractPolarCheckoutUrl(payload) {
  return validPolarUrl(payload?.url) || validPolarUrl(payload?.checkout_url)
}

async function polarCheckoutLinkFromEnv(env, planId, billing) {
  return validPolarUrl(await firstSecretEnv(env, ...(POLAR_CHECKOUT_LINK_KEYS[selectionKey(planId, billing)] || []), 'POLAR_CHECKOUT_URL'))
}

async function polarProductIdFromEnv(env, planId, billing) {
  return firstSecretEnv(env, ...(POLAR_PRODUCT_ID_KEYS[selectionKey(planId, billing)] || []), ...POLAR_GENERIC_PRODUCT_ID_KEYS)
}

async function polarApiBaseFromEnv(env) {
  return validPolarApiBase(await firstSecretEnv(env, 'POLAR_API_BASE'))
}

async function requestPolarCheckoutSession(apiBase, accessToken, payload) {
  const response = await fetch(`${apiBase}/v1/checkouts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const rawText = await response.text()
  let data = {}
  if (rawText) {
    try { data = JSON.parse(rawText) } catch {}
  }
  if (!response.ok) throw new Error(typeof data?.message === 'string' ? data.message : 'Checkout session failed.')
  return data
}

function checkoutSessionPayload({ productId, planId, billing, plan, amount, origin, orderId, request }) {
  const customerIp = request.headers.get('CF-Connecting-IP') || (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim()
  return {
    products: [productId],
    prices: {
      [productId]: [
        {
          amount_type: 'fixed',
          price_amount: amount.dueTodayCents,
          price_currency: 'usd',
        },
      ],
    },
    success_url: `${origin}/success/?planId=${encodeURIComponent(planId)}&billing=${encodeURIComponent(billing)}&checkout_id={CHECKOUT_ID}`,
    return_url: `${origin}/checkout/?planId=${encodeURIComponent(planId)}&billing=${encodeURIComponent(billing)}`,
    allow_discount_codes: true,
    require_billing_address: false,
    ...(customerIp ? { customer_ip_address: customerIp } : {}),
    metadata: {
      site: CONFIG.slug,
      domain: CONFIG.domain,
      plan: planId,
      billing,
      order_id: orderId,
      product: plan.name,
    },
  }
}

async function polarPaymentConfigured(env) {
  if (await polarCheckoutLinkFromEnv(env, CONFIG.defaultPlanId, CONFIG.defaultBilling)) return true
  return Boolean((await firstSecretEnv(env, ...POLAR_ACCESS_TOKEN_KEYS)) && (await polarProductIdFromEnv(env, CONFIG.defaultPlanId, CONFIG.defaultBilling)))
}

async function accessSigningSecret(env) {
  return firstSecretEnv(env, ...ACCESS_SECRET_KEYS)
}

function base64UrlEncodeBytes(bytes) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(index, index + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlEncodeText(text) {
  return base64UrlEncodeBytes(new TextEncoder().encode(text))
}

function base64UrlDecodeText(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new TextDecoder().decode(bytes)
}

async function signAccessPart(part, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(part))
  return base64UrlEncodeBytes(new Uint8Array(signature))
}

function signaturesMatch(a, b) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  return diff === 0
}

async function createAccessToken(env, data) {
  const secret = await accessSigningSecret(env)
  if (!secret) return ''
  const payload = {
    site: CONFIG.slug,
    planId: data.planId || CONFIG.defaultPlanId,
    billing: data.billing || CONFIG.defaultBilling,
    checkoutId: data.checkoutId || '',
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
  }
  const payloadPart = base64UrlEncodeText(JSON.stringify(payload))
  const signature = await signAccessPart(payloadPart, secret)
  return `${payloadPart}.${signature}`
}

async function verifyAccessToken(env, token) {
  const secret = await accessSigningSecret(env)
  if (!secret || typeof token !== 'string' || !token.includes('.')) return false
  const [payloadPart, signature] = token.split('.')
  if (!payloadPart || !signature) return false
  const expected = await signAccessPart(payloadPart, secret)
  if (!signaturesMatch(signature, expected)) return false
  try {
    const payload = JSON.parse(base64UrlDecodeText(payloadPart))
    return payload.site === CONFIG.slug && Number(payload.exp || 0) > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

async function requestPolarCheckout(apiBase, accessToken, checkoutId) {
  const response = await fetch(`${apiBase}/v1/checkouts/${encodeURIComponent(checkoutId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const rawText = await response.text()
  let data = {}
  if (rawText) {
    try { data = JSON.parse(rawText) } catch {}
  }
  if (!response.ok) throw new Error(typeof data?.message === 'string' ? data.message : 'Checkout lookup failed.')
  return data
}

function polarCheckoutPaid(data) {
  if (data?.paid === true || data?.is_paid === true) return true
  const status = String(data?.status || data?.payment_status || data?.payments?.[0]?.status || '').toLowerCase()
  return ['paid', 'succeeded', 'success', 'completed', 'confirmed'].some((word) => status.includes(word))
}

async function handleAccess(request, env) {
  if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405, request)
  let body = {}
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, 400, request)
  }
  const checkoutId = String(body.checkoutId || body.checkout_id || '').trim()
  if (!checkoutId) return jsonResponse({ ok: false, error: 'Missing Polar checkout_id.' }, 400, request)

  if (env?.ACCESS_TEST_MODE === 'true' && checkoutId.startsWith('local_paid_')) {
    const token = await createAccessToken(env, { checkoutId, planId: body.planId, billing: body.billing })
    return jsonResponse({ ok: Boolean(token), accessToken: token, provider: 'polar', mode: 'test' }, token ? 200 : 503, request)
  }

  const signingSecret = await accessSigningSecret(env)
  const accessToken = await firstSecretEnv(env, ...POLAR_ACCESS_TOKEN_KEYS)
  if (!signingSecret || !accessToken) {
    return jsonResponse({
      ok: false,
      provider: 'polar',
      error: 'Paid feature access cannot be verified until Polar access and the site access signing secret are configured.',
      missing: ['POLAR_ACCESS_TOKEN', 'FIRECRAWL_SPACE_ACCESS_SECRET'],
    }, 503, request)
  }

  try {
    const checkout = await requestPolarCheckout(await polarApiBaseFromEnv(env), accessToken, checkoutId)
    if (!polarCheckoutPaid(checkout)) {
      return jsonResponse({ ok: false, provider: 'polar', error: 'Polar checkout is not marked paid yet.' }, 402, request)
    }
    const token = await createAccessToken(env, { checkoutId, planId: body.planId, billing: body.billing })
    return jsonResponse({ ok: true, provider: 'polar', accessToken: token }, 200, request)
  } catch {
    return jsonResponse({ ok: false, provider: 'polar', error: 'Polar checkout could not be verified yet.' }, 502, request)
  }
}

async function handleCheckout(request, env, requestUrl) {
  if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405, request)

  let body = {}
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, 400, request)
  }

  const { plan, planId, billing, period } = normalizePlanSelection(body)
  const amount = amountFor(plan, billing)
  const origin = requestUrl.origin.includes('localhost') || requestUrl.origin.includes('127.0.0.1') ? requestUrl.origin : CONFIG.canonicalOrigin
  const orderId = `firecrawl_space_${planId}_${billing}_${Date.now()}_${Math.random().toString(16).slice(2)}`
  const checkoutLink = await polarCheckoutLinkFromEnv(env, planId, billing)

  if (checkoutLink) {
    return jsonResponse({
      ok: true,
      provider: 'polar',
      paymentConfigured: true,
      checkoutUrl: checkoutLink,
      planId,
      billing,
      period,
      dueTodayUsd: centsToUsd(amount.dueTodayCents),
      orderId,
      successUrl: `${origin}/success/?planId=${encodeURIComponent(planId)}&billing=${encodeURIComponent(billing)}`,
    }, 200, request)
  }

  const accessToken = await firstSecretEnv(env, ...POLAR_ACCESS_TOKEN_KEYS)
  const productId = await polarProductIdFromEnv(env, planId, billing)
  if (!accessToken || !productId) {
    return jsonResponse({
      ok: false,
      paymentConfigured: false,
      provider: 'polar',
      error: 'Polar checkout is not configured yet for this Firecrawl Space plan.',
      missing: ['POLAR_CHECKOUT_URL_' + planId.toUpperCase() + '_' + billing.toUpperCase(), 'or POLAR_ACCESS_TOKEN plus POLAR_PRODUCT_ID_*'],
      planId,
      billing,
      period,
      dueTodayUsd: centsToUsd(amount.dueTodayCents),
    }, 503, request)
  }

  try {
    const checkout = await requestPolarCheckoutSession(await polarApiBaseFromEnv(env), accessToken, {
      ...checkoutSessionPayload({ productId, planId, billing, plan, amount, origin, orderId, request }),
    })
    const checkoutUrl = extractPolarCheckoutUrl(checkout)
    if (!checkoutUrl) throw new Error('Polar did not return a hosted checkout URL.')
    return jsonResponse({
      ok: true,
      provider: 'polar',
      paymentConfigured: true,
      checkoutUrl,
      planId,
      billing,
      period,
      dueTodayUsd: centsToUsd(amount.dueTodayCents),
      orderId,
      checkoutSessionId: checkout?.id || '',
    }, 200, request)
  } catch {
    return jsonResponse({
      ok: false,
      provider: 'polar',
      paymentConfigured: true,
      error: 'Secure Polar checkout could not be created yet.',
      planId,
      billing,
    }, 502, request)
  }
}

async function handleAnalytics(request, env, requestUrl) {
  if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405, request)

  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const referrer = safeText(body.referrer || request.headers.get('Referer') || '', 360)
  const referrerHost = hostFromUrl(referrer)
  const userAgent = request.headers.get('User-Agent') || ''
  const timestamp = Date.now()
  const event = {
    site: CONFIG.slug,
    domain: CONFIG.domain,
    timestamp,
    day: new Date(timestamp).toISOString().slice(0, 10),
    event: safeText(body.event || 'event', 80) || 'event',
    path: safeText(body.path || requestUrl.pathname, 240) || '/',
    target: safeText(body.target || '', 240),
    product: safeText(body.product || CONFIG.slug, 80),
    provider: safeText(body.provider || '', 40),
    planId: safeText(body.planId || '', 40),
    billing: safeText(body.billing || '', 24),
    feature: safeText(body.feature || '', 80),
    scale: safeText(body.scale || '', 40),
    output: safeText(body.output || '', 40),
    deployment: safeText(body.deployment || '', 40),
    referrerHost,
    aiSource: aiReferralSource(referrerHost, userAgent),
    userAgentFamily: userAgentFamily(userAgent),
    country: safeText(request.cf?.country || '', 8),
  }

  let sinks = []
  try {
    sinks = await writeAnalyticsEvent(env, event)
  } catch {
    return jsonResponse({ ok: false, stored: false, error: 'analytics storage failed' }, 500, request)
  }

  if (!sinks.length) {
    return jsonResponse({
      ok: true,
      stored: false,
      provider: 'firecrawl-space-analytics',
      missing: ['ANALYTICS_KV or ANALYTICS_EVENTS'],
      message: 'Analytics storage is not configured for this deployment.',
    }, 202, request)
  }

  return jsonResponse({
    ok: true,
    stored: true,
    provider: 'firecrawl-space-analytics',
    sinks,
    aiSource: event.aiSource,
  }, 200, request)
}

function isLocalRequest(request) {
  const host = request?.headers?.get?.('Host') || ''
  const cf = request?.headers?.get?.('CF-Ray') || request?.headers?.get?.('CF-Connecting-IP')
  return host.startsWith('localhost:') || host.startsWith('127.0.0.1:') || !cf
}

function maybeRedirectToCanonical(url, request) {
  if (isLocalRequest(request)) return null
  if (url.hostname === CONFIG.domain || ALT_HOSTS.has(url.hostname)) {
    if (url.protocol !== 'https:' || url.hostname !== CONFIG.domain) {
      const next = new URL(url)
      next.protocol = 'https:'
      next.hostname = CONFIG.domain
      return Response.redirect(next.toString(), 301)
    }
  }
  return null
}

function planFor(body = {}) {
  const goal = String(body.goal || 'scrape').toLowerCase()
  const scale = String(body.scale || 'single').toLowerCase()
  const output = String(body.output || 'markdown').toLowerCase()
  const deployment = String(body.deployment || 'cloud').toLowerCase()
  const needsActions = goal.includes('interact') || goal.includes('login') || goal.includes('click')
  const needsDiscovery = goal.includes('discover') || goal.includes('site map') || goal.includes('unknown')
  const needsResearch = goal.includes('research') || goal.includes('find') || goal.includes('compare')
  const needsStructured = output.includes('json') || output.includes('schema')

  const endpoints = []
  if (needsResearch) endpoints.push('agent', 'search')
  if (needsDiscovery) endpoints.push('map')
  if (scale === 'site' || scale === 'large') endpoints.push('crawl')
  if (scale === 'list' || scale === 'large') endpoints.push('batch_scrape')
  if (!endpoints.length || scale === 'single') endpoints.push('scrape')
  if (needsActions) endpoints.push('interact')
  if (needsStructured && !endpoints.includes('scrape')) endpoints.push('scrape')

  const uniqueEndpoints = [...new Set(endpoints)]
  const compliance = [
    'Check robots.txt, terms, consent, and data sensitivity before crawling.',
    'Keep source URLs and timestamps with extracted data for audit and AI citations.',
  ]
  if (deployment === 'self_hosted') {
    compliance.push('Self-hosting gives more control, but advanced anti-blocking and managed reliability may need extra work.')
    compliance.push('AGPL-3.0 obligations matter if you modify and publicly run derived Firecrawl services.')
  } else {
    compliance.push('Use official Firecrawl docs as source evidence for API limits, then keep Firecrawl Space planning support and checkout on this domain.')
  }

  return {
    ok: true,
    product: CONFIG.brand,
    status: 'planner_ready',
    recommendedEndpoints: uniqueEndpoints.map((name) => ({ name, purpose: CONFIG.endpoints[name] })),
    outputMode: needsStructured ? 'structured JSON with source metadata' : output,
    deploymentPath: deployment === 'self_hosted' ? 'self-host checklist first' : 'official hosted API first',
    nextSteps: [
      'Start with a small allowed URL set and verify output quality.',
      'Choose Markdown for LLM context or schema JSON for repeatable extraction.',
      'Add retry, rate limit, cache, and source logging before production.',
    ],
    compliance,
    sourceOfTruth: {
      repo: CONFIG.officialRepo,
      docs: CONFIG.officialDocs,
      officialSite: CONFIG.officialSite,
      license: CONFIG.license,
    },
  }
}

async function handlePlanner(request, env, requestUrl) {
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Use POST with goal, scale, output, and deployment fields.' }, 405, request)
  }
  const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!await verifyAccessToken(env, bearer)) {
    const origin = requestUrl.origin.includes('localhost') || requestUrl.origin.includes('127.0.0.1')
      ? requestUrl.origin
      : CONFIG.canonicalOrigin
    return jsonResponse({
      ok: false,
      requiresPayment: true,
      error: 'The planner is a paid feature. Choose a pricing package and complete Polar checkout before using it.',
      pricingPath: origin + '/pricing/',
      checkoutPath: origin + '/checkout/',
      provider: 'polar',
    }, 402, request)
  }
  let body = {}
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, 400, request)
  }
  return jsonResponse(planFor(body), 200, request)
}

async function runtime(url, env) {
  const origin = url.origin.includes('localhost') || url.origin.includes('127.0.0.1')
    ? url.origin
    : CONFIG.canonicalOrigin
  return {
    ok: true,
    product: CONFIG.brand,
    mode: 'independent_unofficial_reference',
    canonicalOrigin: origin,
    officialSite: CONFIG.officialSite,
    officialDocs: CONFIG.officialDocs,
    officialRepo: CONFIG.officialRepo,
    license: CONFIG.license,
    plannerEndpoint: origin + '/api/planner',
    plannerAccess: 'paid_access_required',
    pricingPath: origin + '/pricing/',
    checkoutEndpoint: origin + '/api/checkout',
    accessEndpoint: origin + '/api/access',
    analyticsEndpoint: origin + '/api/analytics',
    analyticsConfigured: analyticsConfigured(env),
    analyticsSignals: ['page_view', 'link_click', 'billing_toggle', 'polar_checkout_begin', 'pricing_required', 'planner_submit'],
    paymentProvider: 'polar',
    paymentConfigured: await polarPaymentConfigured(env),
    featureGateConfigured: Boolean(await accessSigningSecret(env)),
    defaultPlanId: CONFIG.defaultPlanId,
    defaultBilling: CONFIG.defaultBilling,
    pricing: publicPlans(),
    paymentNote: 'Payments are one-time and do not automatically renew.',
    contactEmail: CONFIG.support,
  }
}

async function withHeaders(response, request) {
  const headers = new Headers(response.headers)
  for (const [key, value] of securityHeaders(request)) headers.set(key, value)
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', response.status === 200 ? 'public, max-age=300' : 'no-store')
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function serveAsset(request, env) {
  const response = await env.SITE_ASSETS.fetch(request)
  if (response.status !== 404) return withHeaders(response, request)
  const url = new URL(request.url)
  if (!url.pathname.includes('.') && !url.pathname.endsWith('/')) {
    const slashUrl = new URL(url)
    slashUrl.pathname += '/'
    const slashResponse = await env.SITE_ASSETS.fetch(new Request(slashUrl, request))
    if (slashResponse.status !== 404) return Response.redirect(slashUrl.toString(), 301)
  }
  const notFound = await env.SITE_ASSETS.fetch(new Request(new URL('/404/', url), request))
  if (notFound.status === 200) {
    const headers = new Headers(notFound.headers)
    headers.set('Content-Type', 'text/html; charset=utf-8')
    headers.set('Cache-Control', 'no-store')
    for (const [key, value] of securityHeaders(request)) headers.set(key, value)
    return new Response(notFound.body, { status: 404, headers })
  }
  return jsonResponse({ ok: false, error: 'Not found' }, 404, request)
}

export async function handleRequest(request, env) {
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: securityHeaders(request) })
  const redirect = maybeRedirectToCanonical(url, request)
  if (redirect) return redirect

  if (url.pathname === '/api/runtime') return jsonResponse(await runtime(url, env), 200, request)
  if (url.pathname === '/api/planner') return handlePlanner(request, env, url)
  if (url.pathname === '/api/access') return handleAccess(request, env)
  if (url.pathname === '/api/checkout' || url.pathname === '/api/polar-checkout') return handleCheckout(request, env, url)
  if (url.pathname === '/api/polar/webhook') return jsonResponse({ ok: true, provider: 'polar' }, 200, request)
  if (url.pathname === '/api/analytics') return handleAnalytics(request, env, url)
  if (url.pathname === '/.well-known/firecrawl-space.json') {
    return jsonResponse({
      name: CONFIG.brand,
      relationship: 'independent_unofficial_reference',
      description: CONFIG.summary,
      upstream: {
        site: CONFIG.officialSite,
        docs: CONFIG.officialDocs,
        repo: CONFIG.officialRepo,
        license: CONFIG.license,
      },
      capabilities: Object.entries(CONFIG.endpoints).map(([name, purpose]) => ({ name, purpose })),
    }, 200, request)
  }

  return serveAsset(request, env)
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env)
  },
}
