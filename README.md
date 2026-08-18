# Conference Website

A Next.js conference registration app with a public registration form, Supabase-backed storage, and an admin dashboard for managing registration statuses.

## Getting Started

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env.local
```

Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Supabase Setup

1. Create a Supabase project.
2. Go to Settings > API and copy:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Set `DATABASE_URL` in `.env.local`.
4. Run:

```bash
npm run db:setup
```

This applies the SQL migrations in `supabase/migrations`.

To create an admin account, run:

```bash
npm run admin:create -- --email=admin@example.com --password=secret123 --name="Admin Name"
```

For local development, you can also open `/dev-login` and create or sign in as an admin without touching the shell.

Email notifications send directly by default, so they do not depend on the background worker. If you want queue mode later, set `EMAIL_NOTIFICATION_MODE=queue`.

### Trash + 5-day hard delete

Each admin's Registration Center has a Trash tab (link in the sidebar). Org rows soft-deleted from the dashboard land here and stay for 5 days (`PURGE_RETENTION_DAYS`). The `conference-app-purge` PM2 process hard-deletes rows past that window. There's no perm-delete-now override.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:setup          # apply SQL migrations
npm run admin:create      # create or update an admin user
npm run purge             # run the trash-purge once (CLI)
```

The background scripts (`scripts/email-worker.js`, `scripts/purge-soft-deleted-orgs.js`) are run under PM2 — see `ecosystem.config.js`.

## Server Deployment

These notes are for deploying to a VPS with Node, PM2, nginx, and Let's Encrypt.

### 1. Set Environment Variables

```bash
cd conference-app
cp .env.example .env.local
nano .env.local
```

Fill in your real Supabase URL, anon key, and database URL. If you want the bootstrap script to seed an admin account on the server, also set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_FULL_NAME`.

### 2. Install, Build, And Start

```bash
npm install
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Follow the command printed by `pm2 startup` so the app restarts after server reboot.

### 3. Configure Nginx

Point your domain's A record to the server IP, then on the server:

```bash
sudo apt-get install -y nginx
sudo cp deploy/nginx.conf.template /etc/nginx/sites-available/conference-app
sudo nano /etc/nginx/sites-available/conference-app
sudo ln -s /etc/nginx/sites-available/conference-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Replace `YOUR_DOMAIN` in the nginx config before reloading.

### 4. Add HTTPS

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

### 5. Updating Later

```bash
cd conference-app
git pull
npm install
npm run build
pm2 restart conference-app
pm2 restart conference-app-worker
pm2 restart conference-app-purge
```

Three PM2 processes run side-by-side: the Next.js server, the email worker, and the trash-purge worker. The trash-purge checks every `PURGE_TICK_MS` (default 1 hour) for orgs soft-deleted more than `PURGE_RETENTION_DAYS` (default 5) ago and hard-deletes them (FK cascade removes form assignments and responses). Use `npm run purge` to run a single tick manually.
