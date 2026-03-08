/**
 * DalePay Twitter/X Bot
 * Publica tasa USD/VES y tweets promocionales automáticamente.
 *
 * Configuración requerida (variables de entorno):
 *   TWITTER_API_KEY
 *   TWITTER_API_SECRET
 *   TWITTER_ACCESS_TOKEN
 *   TWITTER_ACCESS_SECRET
 *   TWITTER_BEARER_TOKEN
 *
 * Ejecutar: node twitter-bot.cjs
 * O con PM2: pm2 start twitter-bot.cjs --name dalepay-twitter
 */

const https = require('https')
const crypto = require('crypto')

// -- Config --
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || ''
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || ''
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || ''
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET || ''

const SUPABASE_URL = 'https://zzimrfepvoqidwhkgtsk.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aW1yZmVwdm9xaWR3aGtndHNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzQwMjgwMiwiZXhwIjoyMDUyOTc4ODAyfQ.NXXMjTflXqLlYMCIcPVJPnFBYKbKFQTLMTpQPKLuiKQ'

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'

// Tweet interval: 1 hour for rate tweets, 3 hours for promo tweets
const RATE_INTERVAL = 60 * 60 * 1000 // 1 hour
const PROMO_INTERVAL = 3 * 60 * 60 * 1000 // 3 hours

let tweetCounter = 0

// Promotional tweets rotation
const promoTweets = [
  '🚀 DalePay: Tu billetera digital multi-moneda para Venezuela. Envia, recibe y convierte USD, USDT y Bolivares sin complicaciones. @DalePayApp 🇻🇪 #Venezuela #Fintech #CryptoVenezuela',
  '💸 Envia dinero a Venezuela al instante con DalePay. Comisiones desde 0.3%. Sin bancos, sin limites, sin fronteras. @DalePayApp 🇻🇪 #EnviarDinero #Venezuela #Remesas',
  '🔒 Tu dinero seguro con DalePay. Billetera USDT, conversiones instantaneas con tasa Binance P2P en tiempo real. @DalePayApp 🇻🇪 #USDT #Crypto #Venezuela',
  '⚡ P2P en DalePay: Compra y vende USDT con Pago Movil. Tasa referencial Binance. Rapido, seguro y sin intermediarios. @DalePayApp 🇻🇪 #P2P #Venezuela #Bolivar',
  '🌐 DalePay funciona en Telegram y en la web. Disponible las 24 horas, desde cualquier dispositivo. Registrate gratis. @DalePayApp 🇻🇪 #Telegram #Wallet #Venezuela',
  '💱 Convierte entre USD, USDT y Bolivares en segundos. Tasa actualizada de Binance P2P. Solo 0.5% de comision. @DalePayApp 🇻🇪 #CambioDolar #Venezuela',
]

// -- OAuth 1.0a helpers --
function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedKeys = Object.keys(params).sort()
  const paramString = sortedKeys.map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&')
  const baseString = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')
}

function buildOAuthHeader(method, url, body = {}) {
  const oauthParams = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0',
  }

  const allParams = { ...oauthParams, ...body }
  const signature = generateOAuthSignature(method, url, allParams, TWITTER_API_SECRET, TWITTER_ACCESS_SECRET)
  oauthParams['oauth_signature'] = signature

  const headerParts = Object.keys(oauthParams).sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ')

  return `OAuth ${headerParts}`
}

// -- API Calls --
function postJSON(urlStr, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const data = JSON.stringify(body)
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
    }
    const req = https.request(options, (res) => {
      let result = ''
      res.on('data', c => result += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(result) }) }
        catch { resolve({ status: res.statusCode, data: result }) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function fetchBinanceRate() {
  try {
    const result = await postJSON(BINANCE_P2P_URL, {
      fiat: 'VES',
      page: 1,
      rows: 10,
      tradeType: 'SELL',
      asset: 'USDT',
      payTypes: [],
      publisherType: null,
    })

    const ads = result.data?.data || []
    if (ads.length === 0) return null

    const prices = ads.map(ad => parseFloat(ad.adv.price))
    prices.sort((a, b) => a - b)
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)]

    const rate = Math.round(median * 100) / 100

    // Save to Supabase
    await postJSON(`${SUPABASE_URL}/rest/v1/rate_history`, {
      source: 'binance_p2p',
      from_currency: 'USD',
      to_currency: 'VES',
      rate,
    }, {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: 'return=minimal',
    })

    // Update exchange rates
    for (const [from, to, r] of [['USD', 'VES', rate], ['USDT', 'VES', rate], ['VES', 'USD', 1/rate], ['VES', 'USDT', 1/rate]]) {
      await postJSON(`${SUPABASE_URL}/rest/v1/exchange_rates?from_currency=eq.${from}&to_currency=eq.${to}`, {}, {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'X-HTTP-Method-Override': 'PATCH',
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      })
      // Use PATCH via fetch
      const patchUrl = `${SUPABASE_URL}/rest/v1/exchange_rates?from_currency=eq.${from}&to_currency=eq.${to}`
      const patchData = JSON.stringify({ rate: r, updated_at: new Date().toISOString() })
      await new Promise((resolve, reject) => {
        const url = new URL(patchUrl)
        const options = {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(patchData),
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            Prefer: 'return=minimal',
          },
        }
        const req = https.request(options, (res) => {
          let body = ''
          res.on('data', c => body += c)
          res.on('end', () => resolve(body))
        })
        req.on('error', reject)
        req.write(patchData)
        req.end()
      })
    }

    return rate
  } catch (err) {
    console.error('Error fetching Binance rate:', err.message)
    return null
  }
}

async function postTweet(text) {
  if (!TWITTER_API_KEY || !TWITTER_ACCESS_TOKEN) {
    console.log('[TWITTER] Keys not configured. Would tweet:', text)
    return { ok: false, reason: 'no_keys' }
  }

  const url = 'https://api.twitter.com/2/tweets'
  const authHeader = buildOAuthHeader('POST', url)

  try {
    const result = await postJSON(url, { text }, { Authorization: authHeader })
    if (result.status === 201 || result.status === 200) {
      console.log('[TWITTER] Tweet posted:', text.slice(0, 60) + '...')
      return { ok: true, data: result.data }
    } else {
      console.error('[TWITTER] Error:', result.status, JSON.stringify(result.data))
      return { ok: false, status: result.status }
    }
  } catch (err) {
    console.error('[TWITTER] Request error:', err.message)
    return { ok: false, error: err.message }
  }
}

async function tweetRate() {
  const rate = await fetchBinanceRate()
  if (!rate) {
    console.log('[TWITTER] Could not fetch rate, skipping tweet')
    return
  }

  const rateFormatted = rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const tweet = `💱 Tasa DalePay ahora: 1 USD = ${rateFormatted} Bs (Referencia Binance P2P) | Cambia tus divisas sin complicaciones en @DalePayApp 🇻🇪 #Venezuela #Dolar #Bolivar`

  await postTweet(tweet)
}

async function tweetPromo() {
  const index = tweetCounter % promoTweets.length
  const tweet = promoTweets[index]
  await postTweet(tweet)
  tweetCounter++
}

// -- Main Loop --
async function main() {
  console.log('[DalePay Twitter Bot] Starting...')

  // Initial rate tweet
  await tweetRate()

  // Rate tweet every hour
  setInterval(async () => {
    await tweetRate()
  }, RATE_INTERVAL)

  // Promo tweet every 3 hours
  setInterval(async () => {
    await tweetPromo()
  }, PROMO_INTERVAL)

  console.log('[DalePay Twitter Bot] Running. Rate tweets every 1h, promo every 3h.')
}

main().catch(console.error)
