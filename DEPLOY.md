# Deploying to your server (147.93.119.175)

## 0. Rotate the SSH password
You pasted the password into a chat, so before anything else:
```
passwd
```
on the server, and set a new one. Consider switching to SSH key auth entirely
(`ssh-copy-id user@147.93.119.175`, then disable password login in
`/etc/ssh/sshd_config`).

## 1. Set up Supabase (you haven't created the project yet)
1. Go to https://supabase.com, create a new project.
2. Once it's up, go to **Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Go to **SQL Editor**, paste in the contents of `supabase/schema.sql` from
   this project, and run it. This creates the `organizations` table,
   `admin_users` table, and the row-level-security policies.
4. Create your first admin login: **Authentication > Users > Add user**
   (set an email + password). Then in the SQL editor run:
   ```sql
   insert into admin_users (id, email, full_name)
   values ('<paste the user UUID from the Users table>', '<their email>', '<their name>');
   ```
   Repeat for each additional admin.

## 2. Push this code to your server
From your own machine, with this project directory:
```
scp -r conference-app <ssh-username>@147.93.119.175:/home/<ssh-username>/
```
(Or better: push this to a GitHub repo and `git clone` it on the server —
easier to update later.)

## 3. On the server: install Node + PM2 (skip if already installed)
```
ssh <ssh-username>@147.93.119.175
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

## 4. Set environment variables
```
cd conference-app
cp .env.example .env.local
nano .env.local   # fill in your real Supabase URL + anon key
```

## 5. Install, build, and start
```
npm install
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed instructions so it survives reboots
```

## 6. Point your domain at this app (nginx)
Check whether the domain already resolves to this server:
```
dig +short YOUR_DOMAIN
```
If it prints `147.93.119.175`, DNS is already pointed here. If it prints
nothing or a different IP, add/update an **A record** for the domain at
your DNS provider pointing to `147.93.119.175`, and wait for it to propagate
(minutes to a few hours).

Once DNS is confirmed:
```
sudo apt-get install -y nginx
sudo cp deploy/nginx.conf.template /etc/nginx/sites-available/conference-app
sudo nano /etc/nginx/sites-available/conference-app   # replace YOUR_DOMAIN
sudo ln -s /etc/nginx/sites-available/conference-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Add HTTPS (free, via Let's Encrypt)
```
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```
Certbot edits the nginx config for you and sets up auto-renewal.

## 8. Verify
- Visit `https://YOUR_DOMAIN` → should show the registration form.
- Submit a test registration → check it appears in Supabase's
  **Table Editor > organizations**.
- Visit `https://YOUR_DOMAIN/admin/login` → sign in with the admin account
  you created in step 1 → should land on the dashboard and see the test
  registration.

## Updating the app later
```
cd conference-app
git pull          # or re-upload via scp
npm install
npm run build
pm2 restart conference-app
```
