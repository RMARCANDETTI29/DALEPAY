import { supabase } from './supabase'

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'

let cachedRate: number | null = null
let lastFetch: number = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function fetchBinanceP2PRate(): Promise<number> {
  const now = Date.now()
  if (cachedRate && now - lastFetch < CACHE_DURATION) {
    return cachedRate
  }

  try {
    const response = await fetch(BINANCE_P2P_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fiat: 'VES',
        page: 1,
        rows: 10,
        tradeType: 'SELL',
        asset: 'USDT',
        payTypes: [],
        publisherType: null,
      }),
    })

    if (!response.ok) throw new Error('Binance API error')

    const data = await response.json()
    const ads = data?.data || []

    if (ads.length === 0) {
      // Fallback: try to get from rate_history
      return await getLastSavedRate()
    }

    // Calculate median price from top 10 ads
    const prices = ads.map((ad: { adv: { price: string } }) => parseFloat(ad.adv.price))
    prices.sort((a: number, b: number) => a - b)
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)]

    const rate = Math.round(median * 100) / 100
    cachedRate = rate
    lastFetch = now

    // Save to rate_history
    await saveRateHistory(rate, data.data)

    // Update exchange_rates table
    await updateExchangeRates(rate)

    return rate
  } catch (error) {
    console.error('Error fetching Binance rate:', error)
    return await getLastSavedRate()
  }
}

async function getLastSavedRate(): Promise<number> {
  const { data } = await supabase
    .from('rate_history')
    .select('rate')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (data) {
    cachedRate = Number(data.rate)
    lastFetch = Date.now()
    return cachedRate
  }

  // Ultimate fallback
  return cachedRate || 78.50
}

async function saveRateHistory(rate: number, rawData: unknown) {
  await supabase.from('rate_history').insert({
    source: 'binance_p2p',
    from_currency: 'USD',
    to_currency: 'VES',
    rate,
    raw_data: rawData,
  })
}

async function updateExchangeRates(rate: number) {
  const inverseRate = Math.round((1 / rate) * 1000000) / 1000000

  await Promise.all([
    supabase.from('exchange_rates').upsert(
      { from_currency: 'USD', to_currency: 'VES', rate, updated_at: new Date().toISOString() },
      { onConflict: 'from_currency,to_currency' }
    ),
    supabase.from('exchange_rates').upsert(
      { from_currency: 'VES', to_currency: 'USD', rate: inverseRate, updated_at: new Date().toISOString() },
      { onConflict: 'from_currency,to_currency' }
    ),
    supabase.from('exchange_rates').upsert(
      { from_currency: 'USDT', to_currency: 'VES', rate, updated_at: new Date().toISOString() },
      { onConflict: 'from_currency,to_currency' }
    ),
    supabase.from('exchange_rates').upsert(
      { from_currency: 'VES', to_currency: 'USDT', rate: inverseRate, updated_at: new Date().toISOString() },
      { onConflict: 'from_currency,to_currency' }
    ),
  ])
}

export function getCachedRate(): number | null {
  return cachedRate
}

export function formatRate(rate: number): string {
  return rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
