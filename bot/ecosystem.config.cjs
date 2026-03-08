module.exports = {
  apps: [
    {
      name: 'dalepay-bot',
      script: './server.cjs',
      cwd: '/home/roberto/DALEPAY/bot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/roberto/DALEPAY/bot/logs/error.log',
      out_file: '/home/roberto/DALEPAY/bot/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'dalepay-twitter',
      script: './twitter-bot.cjs',
      cwd: '/home/roberto/DALEPAY/bot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
      env: {
        NODE_ENV: 'production',
        TWITTER_API_KEY: process.env.TWITTER_API_KEY || '',
        TWITTER_API_SECRET: process.env.TWITTER_API_SECRET || '',
        TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN || '',
        TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET || '',
        SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aW1yZmVwdm9xaWR3aGtndHNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzQwMjgwMiwiZXhwIjoyMDUyOTc4ODAyfQ.NXXMjTflXqLlYMCIcPVJPnFBYKbKFQTLMTpQPKLuiKQ',
      },
      error_file: '/home/roberto/DALEPAY/bot/logs/twitter-error.log',
      out_file: '/home/roberto/DALEPAY/bot/logs/twitter-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
