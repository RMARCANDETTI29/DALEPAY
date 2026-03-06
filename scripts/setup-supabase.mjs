// Setup script: Run after unpausing the Supabase project
// Usage: node scripts/setup-supabase.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://zzimrfepvoqidwhkgtsk.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aW1yZmVwdm9xaWR3aGtndHNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzQwMjgwMiwiZXhwIjoyMDUyOTc4ODAyfQ.NXXMjTflXqLlYMCIcPVJPnFBYKbKFQTLMTpQPKLuiKQ'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createUser(email, password, fullName, balances) {
  console.log(`Creating user: ${email}...`)

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === email)

  let userId
  if (existing) {
    userId = existing.id
    console.log(`  User already exists: ${userId}`)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) { console.error(`  Error creating user:`, error.message); return }
    userId = data.user.id
    console.log(`  Created user: ${userId}`)
  }

  // Upsert profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, email, full_name: fullName, is_admin: email === 'demo@dalepay.com' }, { onConflict: 'id' })
  if (profileError) console.error(`  Profile error:`, profileError.message)
  else console.log(`  Profile created/updated`)

  // Create wallets
  for (const [currency, balance] of Object.entries(balances)) {
    const { error } = await supabase
      .from('wallets')
      .upsert({ user_id: userId, currency, balance }, { onConflict: 'user_id,currency' })
    if (error) console.error(`  Wallet ${currency} error:`, error.message)
    else console.log(`  Wallet ${currency}: ${balance}`)
  }
}

async function main() {
  console.log('=== DalePay Setup ===\n')

  // Test connection
  const { error: testError } = await supabase.from('profiles').select('count')
  if (testError) {
    console.error('Cannot connect to Supabase. Is the project active?')
    console.error('Error:', testError.message)
    console.log('\nIf the project is paused, go to https://supabase.com/dashboard and restore it.')
    console.log('Then run the schema.sql in the SQL Editor first, and re-run this script.')
    process.exit(1)
  }

  // Create test users
  await createUser('demo@dalepay.com', 'Demo123456!', 'Demo User', {
    USD: 500,
    USDT: 250,
    VES: 10000000,
  })

  await createUser('maria@dalepay.com', 'Demo123456!', 'Maria Garcia', {
    USD: 1200,
    USDT: 800,
    VES: 25000000,
  })

  console.log('\n=== Setup Complete ===')
}

main().catch(console.error)
