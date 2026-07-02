/**
 * PM2 ecosystem config — RaaziMarzi API server
 * Usage:
 *   pm2 start ecosystem.config.cjs        # start
 *   pm2 restart backend                   # restart
 *   pm2 stop backend                      # stop
 *   pm2 logs backend                      # tail logs
 *   pm2 save && pm2 startup               # persist across reboots
 */
module.exports = {
  apps: [
    {
      name:        "backend",
      script:      "src/server.js",
      interpreter: "node",
      // ESM flag required for Node < 22 when package.json has "type":"module"
      interpreter_args: "",
      instances:    1,
      exec_mode:    "fork",
      autorestart:  true,
      watch:        false,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV:               "production",
        ENABLE_MEDIATOR_PORTAL: "false",
      },
      error_file: "logs/error.log",
      out_file:   "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
