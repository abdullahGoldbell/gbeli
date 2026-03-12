module.exports = {
  apps: [
    {
      name: 'fms-dashboard',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 3005',
      env: {
        NODE_ENV: 'production',
        PORT: '3005',
      },
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'fms-socket',
      script: 'server.js',
      env: {
        SOCKET_PORT: '3001',
      },
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
