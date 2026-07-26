module.exports = {
  apps: [
    {
      name: "conference-app",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
    },
  ],
};
