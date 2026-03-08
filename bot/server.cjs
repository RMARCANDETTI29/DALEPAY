const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const BOT_TOKEN = '8644307550:AAHjIKb096GGpJxhgi7w2DJmbR2BNB1FO0k'
const MINI_APP_URL = 'https://rmarcandetti29.github.io/DALEPAY/'
const HTTPS_PORT = 8443
const HEALTH_PORT = 3847
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

const SUPABASE_URL = 'https://zzimrfepvoqidwhkgtsk.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aW1yZmVwdm9xaWR3aGtndHNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1MDA5NywiZXhwIjoyMDg0MzI2MDk3fQ.xh61TANOfBewMkpQYVQYI3GE2JLgoX0LkPhp2N1g60I'

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'

let cachedRate = null
let lastRateFetch = 0

const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'webhook.key')),
  cert: fs.readFileSync(path.join(__dirname, 'webhook.pem')),
}

function sendRequest(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const url = new URL(`${API_URL}/${method}`)
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) } catch { resolve({ ok: false }) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function sendMessage(chatId, text, extra = {}) {
  return sendRequest('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra })
}

function postJSON(urlStr, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const zlib = require('zlib')
    const url = new URL(urlStr)
    const data = JSON.stringify(body)
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'Accept-Encoding': 'gzip, deflate', ...headers },
    }
    const req = https.request(options, (res) => {
      const chunks = []
      const encoding = res.headers['content-encoding']
      let stream = res
      if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip())
      else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate())
      stream.on('data', c => chunks.push(c))
      stream.on('end', () => {
        const result = Buffer.concat(chunks).toString()
        try { resolve(JSON.parse(result)) } catch { resolve(result) }
      })
      stream.on('error', () => resolve(''))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function fetchBinanceRate() {
  const now = Date.now()
  if (cachedRate && now - lastRateFetch < 30 * 60 * 1000) return cachedRate

  try {
    const result = await postJSON(BINANCE_P2P_URL, {
      fiat: 'VES', page: 1, rows: 10, tradeType: 'SELL', asset: 'USDT', payTypes: [], publisherType: null,
    })
    const ads = result?.data || []
    if (ads.length === 0) return cachedRate || 78.50

    const prices = ads.map(ad => parseFloat(ad.adv.price))
    prices.sort((a, b) => a - b)
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)]

    cachedRate = Math.round(median * 100) / 100
    lastRateFetch = now
    return cachedRate
  } catch (err) {
    console.error('Binance rate error:', err.message)
    return cachedRate || 78.50
  }
}

function mainMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💰 Abrir DalePay', web_app: { url: MINI_APP_URL } }],
        [
          { text: '💸 Enviar', web_app: { url: `${MINI_APP_URL}#/send` } },
          { text: '📥 Recibir', web_app: { url: `${MINI_APP_URL}#/qr` } },
        ],
        [
          { text: '🔄 Convertir', web_app: { url: `${MINI_APP_URL}#/convert` } },
          { text: '🤝 P2P', web_app: { url: `${MINI_APP_URL}#/p2p` } },
        ],
        [
          { text: '💎 Recargar USDT', web_app: { url: `${MINI_APP_URL}#/recharge` } },
          { text: '📊 Historial', web_app: { url: `${MINI_APP_URL}#/history` } },
        ],
        [
          { text: '💱 Ver Tasa', callback_data: 'tasa' },
          { text: '❓ Ayuda', callback_data: 'ayuda' },
        ],
      ],
    },
  }
}

async function handleUpdate(update) {
  try {
    if (update.message) {
      const msg = update.message
      const chatId = msg.chat.id
      const text = (msg.text || '').trim()
      const firstName = msg.from?.first_name || 'Usuario'

      if (text === '/start') {
        await sendMessage(chatId,
          `¡Bienvenido a <b>DalePay</b>, ${firstName}! 🚀\n\n` +
          `Tu billetera digital multi-moneda:\n` +
          `💵 <b>USD</b> — Dólares\n` +
          `💎 <b>USDT</b> — Tether\n` +
          `🇻🇪 <b>VES</b> — Bolívares\n\n` +
          `Envía, recibe y convierte dinero al instante.\nSin bancos. Sin fronteras.\n\n` +
          `Toca <b>«Abrir DalePay»</b> para empezar 👇`,
          mainMenu()
        )
      } else if (text === '/tasa') {
        const rate = await fetchBinanceRate()
        const rateStr = rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        await sendMessage(chatId,
          `💱 <b>Tasa USD/VES — Binance P2P</b>\n\n` +
          `1 USD = <b>${rateStr} Bs</b>\n` +
          `1 USDT = <b>${rateStr} Bs</b>\n\n` +
          `Actualizada en tiempo real desde Binance P2P.\n` +
          `Convierte ahora en DalePay 👇`,
          { reply_markup: { inline_keyboard: [
            [{ text: '🔄 Convertir ahora', web_app: { url: `${MINI_APP_URL}#/convert` } }],
            [{ text: '🤝 Ir al P2P', web_app: { url: `${MINI_APP_URL}#/p2p` } }],
          ]}}
        )
      } else if (text === '/saldo') {
        await sendMessage(chatId,
          `📊 Para ver tus saldos en tiempo real, abre la app:`,
          { reply_markup: { inline_keyboard: [[{ text: '💰 Ver Saldos', web_app: { url: MINI_APP_URL } }]] } }
        )
      } else if (text === '/enviar') {
        await sendMessage(chatId,
          `💸 Envía dinero a cualquier usuario DalePay por correo electrónico.\n\n` +
          `Comisión: solo <b>0.3%</b> por transferencia.`,
          { reply_markup: { inline_keyboard: [[{ text: '💸 Enviar Dinero', web_app: { url: `${MINI_APP_URL}#/send` } }]] } }
        )
      } else if (text === '/recibir') {
        await sendMessage(chatId,
          `📥 Genera tu código QR para recibir pagos al instante.\n\n` +
          `Selecciona la moneda y opcionalmente el monto a solicitar.`,
          { reply_markup: { inline_keyboard: [[{ text: '📥 Mi Código QR', web_app: { url: `${MINI_APP_URL}#/qr` } }]] } }
        )
      } else if (text === '/convertir') {
        const rate = await fetchBinanceRate()
        const rateStr = rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        await sendMessage(chatId,
          `🔄 Convierte entre USD, USDT y Bolívares.\n\n` +
          `Tasa actual: <b>1 USD = ${rateStr} Bs</b> (Binance P2P)\n` +
          `Comisión: solo <b>0.5%</b> por conversión.`,
          { reply_markup: { inline_keyboard: [[{ text: '🔄 Convertir', web_app: { url: `${MINI_APP_URL}#/convert` } }]] } }
        )
      } else if (text === '/recargar') {
        await sendMessage(chatId,
          `💎 <b>Recargar USDT (TRC20)</b>\n\n` +
          `Dirección de depósito:\n<code>TBTeqEJ4PAVxBrcSvWaACCkVzGwM6Sk6Zt</code>\n\n` +
          `Red: <b>TRC20 (TRON)</b>\n\n` +
          `Pasos:\n` +
          `1. Envía USDT a la dirección de arriba\n` +
          `2. Copia el hash de la transacción\n` +
          `3. Ingresa los datos en la app\n` +
          `4. Un admin aprobará tu recarga\n\n` +
          `⚠️ Solo envía USDT por red TRC20`,
          { reply_markup: { inline_keyboard: [[{ text: '💎 Recargar USDT', web_app: { url: `${MINI_APP_URL}#/recharge` } }]] } }
        )
      } else if (text === '/p2p') {
        const rate = await fetchBinanceRate()
        const rateStr = rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        await sendMessage(chatId,
          `🤝 <b>P2P — Compra/Vende USDT</b>\n\n` +
          `Tasa referencial Binance: <b>${rateStr} Bs</b>\n\n` +
          `• Crea o toma órdenes de compra/venta\n` +
          `• Pago con Pago Móvil\n` +
          `• Chat integrado entre partes\n` +
          `• Tiempo límite: 30 minutos\n` +
          `• Comisión: 0.5%`,
          { reply_markup: { inline_keyboard: [[{ text: '🤝 Ir al P2P', web_app: { url: `${MINI_APP_URL}#/p2p` } }]] } }
        )
      } else if (text === '/ayuda') {
        await sendMessage(chatId,
          `❓ <b>Ayuda — DalePay</b>\n\n` +
          `<b>Comandos disponibles:</b>\n` +
          `/start — Menú principal\n` +
          `/tasa — Ver tasa USD/VES en vivo\n` +
          `/saldo — Ver saldos\n` +
          `/enviar — Enviar dinero\n` +
          `/recibir — Recibir con QR\n` +
          `/convertir — Cambiar monedas\n` +
          `/recargar — Recargar USDT\n` +
          `/p2p — Marketplace P2P\n` +
          `/ayuda — Esta ayuda\n\n` +
          `<b>Comisiones:</b>\n` +
          `• Envíos P2P: 0.3%\n` +
          `• Conversiones: 0.5%\n` +
          `• P2P Market: 0.5%\n\n` +
          `¿Necesitas soporte? Escribe a @DalePaySoporte`,
          mainMenu()
        )
      } else {
        await sendMessage(chatId,
          `No entendí ese comando. Usa /ayuda para ver los comandos disponibles o toca el botón para abrir DalePay 👇`,
          mainMenu()
        )
      }
    } else if (update.callback_query) {
      const cb = update.callback_query
      const chatId = cb.message.chat.id
      await sendRequest('answerCallbackQuery', { callback_query_id: cb.id })

      if (cb.data === 'tasa') {
        const rate = await fetchBinanceRate()
        const rateStr = rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        await sendMessage(chatId,
          `💱 <b>Tasa USD/VES — Binance P2P</b>\n\n` +
          `1 USD = <b>${rateStr} Bs</b>\n` +
          `1 USDT = <b>${rateStr} Bs</b>\n\n` +
          `Actualizada en tiempo real.`,
          mainMenu()
        )
      } else if (cb.data === 'ayuda') {
        await sendMessage(chatId,
          `❓ <b>Ayuda — DalePay</b>\n\n` +
          `Usa los comandos o abre la app para gestionar tu dinero.\n\n` +
          `/start — Menú principal\n` +
          `/tasa — Ver tasa en vivo\n` +
          `/saldo — Ver saldos\n` +
          `/enviar — Enviar dinero\n` +
          `/recibir — Recibir con QR\n` +
          `/convertir — Cambiar monedas\n` +
          `/recargar — Recargar USDT\n` +
          `/p2p — Marketplace P2P`,
          mainMenu()
        )
      }
    }
  } catch (err) {
    console.error('Handle error:', err.message)
  }
}

function handleRequest(req, res) {
  if (req.method === 'POST' && req.url === `/webhook/${BOT_TOKEN}`) {
    let body = ''
    req.on('data', (chunk) => body += chunk)
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
      try {
        const update = JSON.parse(body)
        handleUpdate(update)
      } catch (err) {
        console.error('Parse error:', err.message)
      }
    })
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', bot: 'DalePay', uptime: process.uptime(), rate: cachedRate }))
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
}

// HTTPS server for Telegram webhook
const httpsServer = https.createServer(sslOptions, handleRequest)
httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`DalePay Bot HTTPS webhook on port ${HTTPS_PORT}`)
})

// HTTP health check
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', bot: 'DalePay', uptime: process.uptime(), rate: cachedRate }))
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})
httpServer.listen(HEALTH_PORT, '0.0.0.0', () => {
  console.log(`Health check on port ${HEALTH_PORT}`)
})

// Pre-fetch rate on startup
fetchBinanceRate().then(rate => {
  console.log(`Initial Binance rate: ${rate} VES/USD`)
})

// Refresh rate every 30 minutes
setInterval(() => {
  fetchBinanceRate().then(rate => {
    console.log(`Rate refreshed: ${rate} VES/USD`)
  })
}, 30 * 60 * 1000)
