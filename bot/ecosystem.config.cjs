module.exports = {
  apps: [{
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
  }],
}
