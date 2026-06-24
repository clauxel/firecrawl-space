import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { handleRequest } from '../worker/index.js'

const port = Number(process.argv[2] || process.env.PORT || 8798)
const root = new URL('../public/', import.meta.url)

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

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function requestHeaders(req) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else if (value) {
      headers.set(key, value)
    }
  }
  return headers
}

const server = createServer(async (req, res) => {
  try {
    const method = req.method || 'GET'
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await collectBody(req)
    const request = new Request('http://127.0.0.1:' + port + (req.url || '/'), {
      method,
      headers: requestHeaders(req),
      body,
    })
    const response = await handleRequest(request, { SITE_ASSETS: assetBinding })
    const headers = Object.fromEntries(response.headers.entries())
    res.writeHead(response.status, headers)
    if (method === 'HEAD') {
      res.end()
    } else {
      res.end(Buffer.from(await response.arrayBuffer()))
    }
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('preview server error')
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log('preview listening on http://127.0.0.1:' + port)
})
