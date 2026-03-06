const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const BOT_TOKEN = '8644307550:AAHjIKb096GGpJxhgi7w2DJmbR2BNB1FO0k'
const MINI_APP_URL = 'https://rmarcandetti29.github.io/DALEPAY/'
const HTTPS_PORT = 8443
const HEALTH_PORT = 3847
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

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
          { text: '📊 Historial', web_app: { url: `${MINI_APP_URL}#/history` } },
        ],
        [{ text: '❓ Ayuda', callback_data: 'ayuda' }],
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
        await sendMessage(chatId,
          `🔄 Convierte entre USD, USDT y Bolívares.\n\n` +
          `Comisión: solo <b>0.5%</b> por conversión.\n` +
          `Tasas actualizadas en tiempo real.`,
          { reply_markup: { inline_keyboard: [[{ text: '🔄 Convertir', web_app: { url: `${MINI_APP_URL}#/convert` } }]] } }
        )
      } else if (text === '/ayuda') {
        await sendMessage(chatId,
          `❓ <b>Ayuda — DalePay</b>\n\n` +
          `<b>Comandos disponibles:</b>\n` +
          `/start — Menú principal\n` +
          `/saldo — Ver saldos\n` +
          `/enviar — Enviar dinero\n` +
          `/recibir — Recibir con QR\n` +
          `/convertir — Cambiar monedas\n` +
          `/ayuda — Esta ayuda\n\n` +
          `<b>¿Cómo funciona?</b>\n` +
          `1. Regístrate con tu correo\n` +
          `2. Recibe fondos de otros usuarios\n` +
          `3. Envía, convierte y paga con QR\n\n` +
          `<b>Comisiones:</b>\n` +
          `• Envíos P2P: 0.3%\n` +
          `• Conversiones: 0.5%\n\n` +
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

      if (cb.data === 'ayuda') {
        await sendMessage(chatId,
          `❓ <b>Ayuda — DalePay</b>\n\n` +
          `Usa los comandos o abre la app para gestionar tu dinero.\n\n` +
          `/start — Menú principal\n` +
          `/saldo — Ver saldos\n` +
          `/enviar — Enviar dinero\n` +
          `/recibir — Recibir con QR\n` +
          `/convertir — Cambiar monedas`,
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
    res.end(JSON.stringify({ status: 'ok', bot: 'DalePay', uptime: process.uptime() }))
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
    res.end(JSON.stringify({ status: 'ok', bot: 'DalePay', uptime: process.uptime() }))
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})
httpServer.listen(HEALTH_PORT, '0.0.0.0', () => {
  console.log(`Health check on port ${HEALTH_PORT}`)
})
