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
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Create an admin user in Authentication > Users.
5. Add that user to `admin_users`:

```sql
insert into admin_users (id, email, full_name)
values ('<user UUID>', '<email>', '<name>');
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Server Deployment

These notes are for deploying to a VPS with Node, PM2, nginx, and Let's Encrypt.

### 1. Set Environment Variables

```bash
cd conference-app
cp .env.example .env.local
nano .env.local
```

Fill in your real Supabase URL and anon key.

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
```
