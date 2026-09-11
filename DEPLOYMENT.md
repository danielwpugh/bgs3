# Beast Games - Deployment Guide

This guide covers deploying the Beast Games application to a DigitalOcean droplet with Nginx reverse proxy and HTTPS.

## Prerequisites

- DigitalOcean droplet (Ubuntu 22.04 LTS recommended)
- Domain name pointing to your droplet's IP address
- SSH access to your droplet
- PostgreSQL database (can be on the same droplet or separate)

## Step 1: Server Setup

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:
```bash
node --version
npm --version
```

### 1.3 Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Create database and user:
```bash
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE DATABASE beastgames;
CREATE USER beastgames_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE beastgames TO beastgames_user;
\q
```

### 1.4 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.5 Install PM2

```bash
sudo npm install -g pm2
```

## Step 2: Application Setup

### 2.1 Clone Repository

```bash
cd /var/www
sudo git clone <your-repo-url> beastgames
sudo chown -R $USER:$USER beastgames
cd beastgames
```

### 2.2 Install Dependencies

```bash
npm install
```

### 2.3 Environment Variables

Create `.env` file:
```bash
nano .env
```

Add the following (replace with your actual values):
```env
DATABASE_URL="postgresql://beastgames_user:your_secure_password@localhost:5432/beastgames?schema=public"
JWT_SECRET="your-very-secure-random-secret-key-change-this"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"
```

### 2.4 Database Setup

Generate Prisma client:
```bash
npm run db:generate
```

Run migrations:
```bash
npm run db:deploy
```

Seed initial admin user:
```bash
npm run db:seed
```

**Important:** Save the generated password from the seed script output!

### 2.5 Build Application

```bash
npm run build
```

### 2.6 Create Uploads Directory

```bash
mkdir -p uploads/players
chmod 755 uploads
chmod 755 uploads/players
```

## Step 3: Run with PM2

### 3.1 Start Application

```bash
pm2 start npm --name "beastgames" -- start
```

Or create an ecosystem file for better management:

```bash
nano ecosystem.config.js
```

Add:
```javascript
module.exports = {
  apps: [{
    name: 'beastgames',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/beastgames',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
```

Then:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3.2 Verify PM2

```bash
pm2 status
pm2 logs beastgames
```

## Step 4: Nginx Configuration

### 4.1 Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/beastgames
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Increase body size limit for image uploads (50MB)
    client_max_body_size 50M;

    # Uploads directory
    location /uploads {
        alias /var/www/beastgames/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/beastgames /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: SSL with Let's Encrypt

### 5.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically update your Nginx config.

### 5.3 Auto-Renewal

Certbot sets up auto-renewal automatically. Test it:
```bash
sudo certbot renew --dry-run
```

## Step 6: Firewall Configuration

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## Step 7: Verify Deployment

1. Visit `https://yourdomain.com` - should see the landing page
2. Visit `https://yourdomain.com/admin/login` - should see login page
3. Log in with the admin credentials from the seed script
4. Change the admin password via `/admin/settings`

## Maintenance Commands

### View Logs
```bash
pm2 logs beastgames
```

### Restart Application
```bash
pm2 restart beastgames
```

### Update Application
```bash
cd /var/www/beastgames
git pull
npm install
npm run db:generate
npm run db:deploy
npm run build
pm2 restart beastgames --update-env
```

**Important:** Avoid running `next build` while the PM2 process is serving traffic. Building updates the `.next/` output in-place, and a running server can briefly observe a mismatched build output (which can lead to errors like “Failed to find Server Action ...”).

A safer update sequence is:

```bash
cd /var/www/beastgames
pm2 stop beastgames
git pull
npm install
npm run db:generate
npm run db:deploy
npm run build
pm2 start beastgames --update-env
```

### Database Backup
```bash
sudo -u postgres pg_dump beastgames > backup_$(date +%Y%m%d).sql
```

### Database Restore
```bash
sudo -u postgres psql beastgames < backup_YYYYMMDD.sql
```

## Troubleshooting

### Application not starting
- Check PM2 logs: `pm2 logs beastgames`
- Verify environment variables in `.env`
- Check database connection
- Verify port 3000 is not in use: `sudo lsof -i :3000`

### Error: ENOENT `.next/prerender-manifest.json`
This means **Next.js is being started without a successful build output present** (or PM2 is running from the wrong directory).

On the server:
```bash
cd /var/www/beastgames
npm install
npm run build
pm2 restart beastgames
```

Also verify PM2 is using the correct working directory:
```bash
pm2 show beastgames | sed -n '1,120p'
```

### Nginx 502 Bad Gateway
- Check if Next.js is running: `pm2 status`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify proxy_pass URL matches PM2 process

### Error: Failed to find Server Action "x". This request might be from an older or newer deployment.
This happens when the browser sends a request tied to **one build** but the server is currently running **another build**. Common causes:

- You deployed a new build while the old server was still running (building updates `.next/` in-place)
- PM2 is running more than one process/instance and not all were restarted to the same build
- A user has an old tab open from before deployment and clicks a button after the deploy (a refresh fixes it)

Fix on the server:

```bash
cd /var/www/beastgames
pm2 stop beastgames
rm -rf .next
npm install
npm run build
pm2 start beastgames --update-env
```

If you use a proxy/CDN in front of Nginx, ensure it is **not caching** dynamic HTML/RSC responses.

### Database Connection Issues
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database credentials in `.env`
- Test connection: `psql -U beastgames_user -d beastgames -h localhost`

### Image Upload Issues
- Check uploads directory permissions: `ls -la uploads/`
- Ensure directory exists: `mkdir -p uploads/players`
- Check disk space: `df -h`

## Security Notes

1. **Change default admin password** immediately after first login
2. **Use strong JWT_SECRET** - generate with: `openssl rand -base64 32`
3. **Keep system updated**: `sudo apt update && sudo apt upgrade`
4. **Regular backups** of database and uploads directory
5. **Monitor logs** for suspicious activity
6. **Use firewall** (UFW) to restrict access
7. **Keep Node.js and dependencies updated**

## Additional Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

