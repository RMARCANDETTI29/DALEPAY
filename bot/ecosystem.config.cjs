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
        TWITTER_API_KEY: '5yHlDcwe5eTHFM5lBYsz18uzG',
        TWITTER_API_SECRET: 'q708JgiTSbpFXHg6glu4fSsAorhlhYKg4IwS4YDw30I75jQDUT',
        TWITTER_ACCESS_TOKEN: '2030554822047596544-pAJLMWIy6G1q8nEzRbfFtXP9pu3qxG',
        TWITTER_ACCESS_SECRET: 'eSSEHBaTm2MTp3VtxKZbAG5SsgKWbvhspR2D9kW4u4EQu',
        SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aW1yZmVwdm9xaWR3aGtndHNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1MDA5NywiZXhwIjoyMDg0MzI2MDk3fQ.xh61TANOfBewMkpQYVQYI3GE2JLgoX0LkPhp2N1g60I',
      },
      error_file: '/home/roberto/DALEPAY/bot/logs/twitter-error.log',
      out_file: '/home/roberto/DALEPAY/bot/logs/twitter-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
