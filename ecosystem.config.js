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
    {
      name: "conference-app-worker",
      cwd: __dirname,
      script: "node",
      args: "scripts/email-worker.js",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
    },
    {
      name: "conference-app-purge",
      cwd: __dirname,
      script: "node",
      args: "scripts/purge-soft-deleted-orgs.js",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
    },
  ],
};
