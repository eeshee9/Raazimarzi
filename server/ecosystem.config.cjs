/**
 * PM2 ecosystem config — RaaziMarzi API server
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production   # start
 *   pm2 reload backend                                # zero-downtime reload
 *   pm2 stop backend                                  # stop
 *   pm2 logs backend --lines 200                      # tail logs
 *   pm2 save && pm2 startup                           # persist across reboots
 *   pm2 monit                                         # live dashboard
 *
 * Incident inspection:
 *   pm2 logs backend --err --lines 500    # last 500 error lines
 *   pm2 show backend                      # process details + restart history
 *   cat logs/error.log | grep "❌"        # grep for explicit error markers
 *   journalctl -u pm2-ubuntu -n 200       # systemd logs if using pm2 startup
 */
module.exports = {
  apps: [
    {
      name:        "backend",
      script:      "src/server.js",
      interpreter: "node",
      interpreter_args: "--max-old-space-size=512",
      instances:    1,
      exec_mode:    "fork",
      autorestart:  true,
      watch:        false,
      max_memory_restart: "512M",  // OOM guard — restart before Node kills itself
      max_restarts: 10,
      min_uptime:   "30s",        // must stay up 30s to count as stable restart
      restart_delay: 4000,
      env: {
        NODE_ENV:               "production",
        ENABLE_MEDIATOR_PORTAL: "false",
      },
      env_development: {
        NODE_ENV:               "development",
        ENABLE_MEDIATOR_PORTAL: "true",
      },
      error_file:      "logs/error.log",
      out_file:        "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs:      true,
    },
  ],
};
