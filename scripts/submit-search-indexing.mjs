import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const domain = 'firecrawl.space'
const siteUrl = `https://${domain}/`
const sitemapUrl = `https://${domain}/sitemap.xml`
const gscDomainProperty = `sc-domain:${domain}`
const indexNowKey = '590a3ab02487cffe4cfd55b0df769f65'
const indexNowKeyLocation = `${siteUrl}${indexNowKey}.txt`
const bingAuthFile = `${siteUrl}BingSiteAuth.xml`
const workspaceRoot = path.resolve(import.meta.dirname, '..', '..')
const webToolsRoot = path.resolve(workspaceRoot, 'web-tools')
const outputPath = path.resolve(import.meta.dirname, '..', 'search-submission-result.json')

const GSC_BASE = 'https://www.googleapis.com/webmasters/v3'
const SITE_VERIFICATION_BASE = 'https://www.googleapis.com/siteVerification/v1'
const BING_BASE = 'https://ssl.bing.com/webmaster/api.svc/json'
const CF_BASE = 'https://api.cloudflare.com/client/v4'
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  process.env.ALL_PROXY ||
  process.env.all_proxy ||
  ''

if (proxyUrl) {
  try {
    const { ProxyAgent, setGlobalDispatcher } = await import('undici')
    setGlobalDispatcher(new ProxyAgent(proxyUrl))
  } catch {
    // Continue without proxy dispatch when undici is unavailable.
  }
}

function keychain(account, service) {
  try {
    return execFileSync('/usr/bin/security', ['find-generic-password', '-a', account, '-s', service, '-w'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function keychainFirst(envName, fallbacks = []) {
  for (const [account, service] of [['codex-env', envName], ...fallbacks]) {
    const value = keychain(account, service)
    if (value) return value
  }
  return String(process.env[envName] || '').trim()
}

function safeError(error) {
  const cause = error?.cause?.message ? ` (${error.cause.message})` : ''
  const message = error instanceof Error ? `${error.message}${cause}` : String(error)
  return message
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[redacted]')
    .replace(/(apikey=)[^&\s]+/gi, '$1[redacted]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, 500)
}

async function requestJson(url, init = {}) {
  const headers = {
    ...(init.body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
    ...(init.headers || {}),
  }
  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(init.timeoutMs || 30_000),
    })
    const text = await response.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text.slice(0, 240) }
    }
    return { ok: response.ok, status: response.status, data }
  } catch {
    return curlRequestJson(url, { ...init, headers })
  }
}

function curlQuote(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, '\\n')
}

function curlRequestJson(url, init = {}) {
  const method = init.method || 'GET'
  const headers = init.headers || {}
  const config = [
    `url = "${curlQuote(url)}"`,
    `request = "${curlQuote(method)}"`,
    'silent',
    'show-error',
    'location',
    'connect-timeout = 15',
    `max-time = ${Math.max(30, Math.ceil((init.timeoutMs || 60_000) / 1000))}`,
    'retry = 1',
    'write-out = "\\n__HTTP_STATUS__:%{http_code}"',
    ...Object.entries(headers).map(([key, value]) => `header = "${curlQuote(`${key}: ${value}`)}"`),
  ]
  if (init.body != null) config.push(`data-binary = "${curlQuote(init.body)}"`)
  const text = execFileSync('curl', ['--config', '-'], {
    input: `${config.join('\n')}\n`,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  })
  const marker = '\n__HTTP_STATUS__:'
  const splitAt = text.lastIndexOf(marker)
  const rawBody = splitAt >= 0 ? text.slice(0, splitAt) : text
  const status = splitAt >= 0 ? Number(text.slice(splitAt + marker.length).trim()) : 0
  let data = null
  try {
    data = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    data = { raw: rawBody.slice(0, 240) }
  }
  return { ok: status >= 200 && status < 300, status, data }
}

function okStatus(result) {
  return result.ok ? `ok:${result.status}` : `failed:${result.status}`
}

function googleAuthHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

async function findClientSecretFile() {
  for (const dir of [webToolsRoot, workspaceRoot, path.resolve(workspaceRoot, '..')]) {
    try {
      const files = await readdir(dir)
      const file = files.find((name) => name.startsWith('client_secret_') && name.endsWith('.json'))
      if (file) return path.resolve(dir, file)
    } catch {
      // skip
    }
  }
  return ''
}

async function getGscAccessToken() {
  const clientPath = await findClientSecretFile()
  if (!clientPath) throw new Error('client_secret_*.json not found')
  const clientJson = JSON.parse(await readFile(clientPath, 'utf8'))
  const client = clientJson.installed ?? clientJson.web
  const refreshToken = keychainFirst('GSC_REFRESH_TOKEN', [['gsc', 'codex-gsc-refresh-token']])
  if (!refreshToken) throw new Error('GSC_REFRESH_TOKEN unavailable in Keychain/env')
  const token = await requestJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: client.client_id,
      client_secret: client.client_secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  })
  if (!token.ok || !token.data.access_token) {
    throw new Error(`GSC token refresh failed: ${token.status} ${token.data?.error || 'unknown_error'}`)
  }
  return token.data.access_token
}

async function getGscSites(token) {
  const result = await requestJson(`${GSC_BASE}/sites`, {
    headers: googleAuthHeaders(token),
  })
  if (!result.ok) throw new Error(`GSC sites failed: ${result.status}`)
  return result.data.siteEntry || []
}

async function putGscSite(site, token) {
  const result = await requestJson(`${GSC_BASE}/sites/${encodeURIComponent(site)}`, {
    method: 'PUT',
    headers: googleAuthHeaders(token),
  })
  if (!result.ok) throw new Error(`GSC add site failed: ${result.status} ${JSON.stringify(result.data).slice(0, 240)}`)
  return result.status
}

async function putGscSitemap(site, token) {
  const result = await requestJson(`${GSC_BASE}/sites/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(sitemapUrl)}`, {
    method: 'PUT',
    headers: googleAuthHeaders(token),
  })
  if (!result.ok) throw new Error(`GSC sitemap submit failed: ${result.status} ${JSON.stringify(result.data).slice(0, 240)}`)
  return result.status
}

function cfHeaders() {
  const apiKey = keychainFirst('CLOUDFLARE_API_KEY')
  const email = keychainFirst('CLOUDFLARE_EMAIL')
  if (!apiKey || !email) throw new Error('Cloudflare API key/email unavailable in Keychain/env')
  return { 'X-Auth-Email': email, 'X-Auth-Key': apiKey, 'Content-Type': 'application/json' }
}

async function cf(pathname, init = {}) {
  const result = await requestJson(`${CF_BASE}${pathname}`, {
    ...init,
    headers: { ...cfHeaders(), ...(init.headers || {}) },
  })
  if (!result.ok || result.data?.success === false) {
    const message = result.data?.errors?.map((error) => error.message).join('; ') || `HTTP ${result.status}`
    throw new Error(`Cloudflare API failed: ${message}`)
  }
  return result.data.result
}

async function zoneId() {
  const zones = await cf(`/zones?name=${encodeURIComponent(domain)}&per_page=1`)
  const zone = Array.isArray(zones) ? zones.find((item) => item.name === domain) : null
  if (!zone?.id) throw new Error(`Cloudflare zone not found for ${domain}`)
  return zone.id
}

async function ensureGoogleTxtRecord(token) {
  const id = await zoneId()
  const existing = await cf(`/zones/${id}/dns_records?type=TXT&name=${encodeURIComponent(domain)}&per_page=100`)
  const body = {
    type: 'TXT',
    name: domain,
    content: token,
    ttl: 60,
    proxied: false,
    comment: 'Firecrawl Space Google site verification',
  }
  const managed = existing.find((record) => record.comment === body.comment)
  if (managed) {
    await cf(`/zones/${id}/dns_records/${managed.id}`, { method: 'PATCH', body: JSON.stringify(body) })
    return 'updated'
  }
  const exact = existing.find((record) => record.content === token)
  if (exact) return 'already_present'
  await cf(`/zones/${id}/dns_records`, { method: 'POST', body: JSON.stringify(body) })
  return 'created'
}

async function verifyGoogleDomain(token) {
  const site = { type: 'INET_DOMAIN', identifier: domain }
  const tokenResult = await requestJson(`${SITE_VERIFICATION_BASE}/token`, {
    method: 'POST',
    headers: googleAuthHeaders(token),
    body: JSON.stringify({ site, verificationMethod: 'DNS_TXT' }),
  })
  if (!tokenResult.ok || !tokenResult.data?.token) {
    return { status: 'blocked_validation', reason: `site_verification_token_failed:${tokenResult.status}` }
  }

  const txtAction = await ensureGoogleTxtRecord(tokenResult.data.token)
  let lastStatus = ''
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const verify = await requestJson(`${SITE_VERIFICATION_BASE}/webResource?verificationMethod=DNS_TXT`, {
      method: 'POST',
      headers: googleAuthHeaders(token),
      body: JSON.stringify({ site }),
      timeoutMs: 45_000,
    })
    if (verify.ok) return { status: 'submitted', txtAction, attempts: attempt }
    lastStatus = `verify_failed:${verify.status}`
    await new Promise((resolve) => setTimeout(resolve, 15_000))
  }
  return { status: 'submitted_unverified', txtAction, reason: lastStatus }
}

async function runGsc() {
  const result = { property: gscDomainProperty, sitemapUrl, status: 'not_started' }
  const token = await getGscAccessToken()
  let sites = await getGscSites(token)
  result.matchingPropertiesBefore = sites
    .filter((site) => String(site.siteUrl || '').includes(domain))
    .map((site) => ({ siteUrl: site.siteUrl, permissionLevel: site.permissionLevel }))
  let verified = result.matchingPropertiesBefore.find((site) => site.siteUrl === gscDomainProperty && site.permissionLevel !== 'siteUnverifiedUser')

  if (!verified) {
    try {
      result.addSiteStatus = await putGscSite(gscDomainProperty, token)
    } catch (error) {
      result.addSiteError = safeError(error)
    }
    result.verification = await verifyGoogleDomain(token)
    sites = await getGscSites(token)
    result.matchingPropertiesAfterVerify = sites
      .filter((site) => String(site.siteUrl || '').includes(domain))
      .map((site) => ({ siteUrl: site.siteUrl, permissionLevel: site.permissionLevel }))
    verified = result.matchingPropertiesAfterVerify.find((site) => site.siteUrl === gscDomainProperty && site.permissionLevel !== 'siteUnverifiedUser')
  }

  if (!verified) {
    result.status = result.verification?.status || 'blocked_validation'
    result.sitemapStatus = 'skipped_not_verified'
    return result
  }

  const sitemapStatus = await putGscSitemap(gscDomainProperty, token)
  result.status = 'submitted'
  result.verifiedProperty = verified.siteUrl
  result.sitemapStatus = `ok:${sitemapStatus}`
  return result
}

function getBingKey() {
  const key = keychainFirst('BING_WEBMASTER_API_KEY', [
    ['codex-env', 'BING_WEEMASTER_API_EY'],
    ['bing', 'codex-bing-webmaster-api-key'],
  ])
  if (key) return key
  const typoEnv = String(process.env.BING_WEEMASTER_API_EY || '').trim()
  if (typoEnv) return typoEnv
  throw new Error('Bing Webmaster API key unavailable in Keychain/env')
}

function bingSuccess(result) {
  const payload = result.data?.d ?? result.data
  const errorCode = payload?.ErrorCode ?? result.data?.ErrorCode
  return result.ok && (!errorCode || ['None', 0].includes(errorCode))
}

function bingError(result) {
  const payload = result.data?.d ?? result.data
  return payload?.Message || result.data?.Message || `HTTP ${result.status}`
}

async function bingPost(method, body, apiKey) {
  const result = await requestJson(`${BING_BASE}/${method}?${new URLSearchParams({ apikey: apiKey })}`, {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: 45_000,
  })
  return {
    status: bingSuccess(result) ? 'submitted' : 'failed',
    httpStatus: result.status,
    error: bingSuccess(result) ? '' : safeError(bingError(result)),
  }
}

async function bingSites(apiKey) {
  const result = await requestJson(`${BING_BASE}/GetUserSites?${new URLSearchParams({ apikey: apiKey })}`, {
    timeoutMs: 45_000,
  })
  if (!bingSuccess(result)) throw new Error(`Bing GetUserSites failed: ${bingError(result)}`)
  const payload = result.data?.d ?? result.data
  const sites = Array.isArray(payload) ? payload : Array.isArray(payload?.UserSites) ? payload.UserSites : []
  return sites.map((entry) => ({
    url: typeof entry === 'string' ? entry : entry?.Url ?? entry?.url ?? '',
    isVerified: typeof entry === 'string' ? null : entry?.IsVerified ?? entry?.isVerified ?? entry?.Verified ?? entry?.verified ?? null,
  })).filter((entry) => entry.url)
}

async function runBing(urls) {
  const apiKey = getBingKey()
  const before = await bingSites(apiKey)
  const existedBefore = before.some((entry) => entry.url === siteUrl)
  const result = { siteUrl, sitemapUrl, bingAuthFile, existedBefore, status: 'not_started' }
  result.addSite = existedBefore ? { status: 'already_submitted' } : await bingPost('AddSite', { siteUrl }, apiKey)
  result.verifySite = await bingPost('VerifySite', { siteUrl }, apiKey)
  result.submitFeed = await bingPost('SubmitFeed', { siteUrl, feedUrl: sitemapUrl }, apiKey)
  result.submitUrlBatch = await bingPost('SubmitUrlbatch', { siteUrl, urlList: urls.length ? urls : [siteUrl] }, apiKey)
  const after = await bingSites(apiKey)
  const match = after.find((entry) => entry.url === siteUrl)
  result.matchingSiteAfter = match ? { url: match.url, isVerified: match.isVerified } : null
  result.status = match
    ? (match.isVerified === false ? 'submitted_unverified' : 'submitted')
    : 'blocked_validation'
  return result
}

async function fetchSitemapUrls() {
  const response = await fetch(sitemapUrl, {
    headers: { 'User-Agent': 'firecrawl-space-search-submit/1.0' },
    signal: AbortSignal.timeout(20_000),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Sitemap fetch failed: ${response.status}`)
  return [...text.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => match[1].trim())
    .filter((url) => url.startsWith(siteUrl))
}

async function runIndexNow(urls) {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': 'firecrawl-space-indexnow/1.0' },
    body: JSON.stringify({
      host: domain,
      key: indexNowKey,
      keyLocation: indexNowKeyLocation,
      urlList: urls.length ? urls : [siteUrl],
    }),
    signal: AbortSignal.timeout(30_000),
  })
  const text = await response.text()
  if (![200, 202].includes(response.status)) {
    return { status: 'blocked_validation', httpStatus: response.status, error: text.slice(0, 240), urlCount: urls.length }
  }
  return { status: 'submitted', httpStatus: response.status, keyLocation: indexNowKeyLocation, urlCount: urls.length }
}

async function main() {
  const result = {
    generatedAt: new Date().toISOString(),
    domain,
    siteUrl,
    sitemapUrl,
    sitemap: {},
    gsc: {},
    bing: {},
    indexNow: {},
  }

  try {
    const urls = await fetchSitemapUrls()
    result.sitemap = { status: 'live', urlCount: urls.length, submittedUrls: urls }
    try {
      result.gsc = await runGsc()
    } catch (error) {
      result.gsc = { status: 'blocked_validation', error: safeError(error) }
    }
    try {
      result.bing = await runBing(urls)
    } catch (error) {
      result.bing = { status: 'blocked_validation', error: safeError(error) }
    }
    try {
      result.indexNow = await runIndexNow(urls)
    } catch (error) {
      result.indexNow = { status: 'blocked_validation', error: safeError(error), urlCount: urls.length }
    }
  } catch (error) {
    result.sitemap = { status: 'blocked_validation', error: safeError(error) }
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    domain: result.domain,
    sitemap: result.sitemap.status === 'live' ? `live:${result.sitemap.urlCount}` : result.sitemap.status,
    gsc: result.gsc.status,
    gscSitemap: result.gsc.sitemapStatus || '',
    bing: result.bing.status,
    bingFeed: result.bing.submitFeed?.status || '',
    bingUrlBatch: result.bing.submitUrlBatch?.status || '',
    indexNow: result.indexNow.status,
    indexNowUrlCount: result.indexNow.urlCount || 0,
    outputPath,
  }, null, 2))
}

main().catch((error) => {
  console.error(safeError(error))
  process.exit(1)
})
