# Local Development Guide

This guide covers setting up and running Beast Games locally on **macOS** and **Ubuntu**.

> **Note:** macOS uses **Homebrew** (`brew`) as the package manager. Ubuntu uses **apt**. Make sure you're following the correct section for your operating system!

## Prerequisites

Both platforms need:
- Node.js 20+ 
- PostgreSQL 14+
- npm (comes with Node.js)

---

## macOS Setup

> **macOS uses Homebrew, NOT apt!** All commands below use `brew` for macOS.

### 1. Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Node.js

```bash
# Using Homebrew
brew install node@20

# Or download from nodejs.org
# https://nodejs.org/

# Verify installation
node --version  # Should be v20.x.x or higher
npm --version
```

### 3. Install PostgreSQL

```bash
# Using Homebrew
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Or use Postgres.app (GUI option)
# Download from: https://postgresapp.com/
```

### 4. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql postgres

# In PostgreSQL shell:
CREATE DATABASE beastgames;
CREATE USER beastgames_user WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE beastgames TO beastgames_user;
\q
```

**Alternative:** If using Postgres.app, you can use the default `postgres` user:
```bash
psql -d postgres
# Then run the same SQL commands above
```

---

## Ubuntu Setup

> **Ubuntu uses apt package manager.** All commands below use `apt` and `sudo` for Ubuntu.

### 1. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js

```bash
# Using NodeSource repository (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x or higher
npm --version
```

**Alternative:** Using snap
```bash
sudo snap install node --classic
```

### 3. Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4. Create PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE beastgames;
CREATE USER beastgames_user WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE beastgames TO beastgames_user;
\q
```

---

## Common Setup Steps (Both Platforms)

### 1. Clone and Navigate to Project

```bash
cd /path/to/beastgames
# Or if cloning:
# git clone <repo-url>
# cd beastgames
```

### 2. Install Dependencies (Including Prisma)

```bash
npm install
```

This will install Prisma (both `prisma` CLI and `@prisma/client`) automatically, as they're already listed in `package.json`.

**Note:** Prisma is included as a dev dependency, so you don't need to install it separately. After running `npm install`, Prisma will be available via the npm scripts (like `npm run db:generate`).

### 3. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

**Note:** Next.js supports both `.env` and `.env.local`:
- `.env` - Works for both Next.js and Prisma CLI
- `.env.local` - Works for Next.js, but Prisma CLI might not find it automatically

**Recommendation:** Use `.env` (it's already gitignored, so it's safe for local secrets). If you prefer `.env.local`, you can use it, but Prisma commands might need the variables in `.env` as well.

Edit `.env` (or `.env.local`) with your database credentials:

**For macOS (Homebrew PostgreSQL):**
```env
DATABASE_URL="postgresql://beastgames_user:dev_password@localhost:5432/beastgames?schema=public"
JWT_SECRET="dev-secret-key-change-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

**For Ubuntu (or if using default postgres user):**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beastgames?schema=public"
JWT_SECRET="dev-secret-key-change-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

**Note:** Adjust the username and password based on what you created in the database setup step.

### 4. Generate Prisma Client

**Important:** If you get "prisma: command not found", make sure you've run `npm install` first!

```bash
# Option 1: Use npm script (recommended - automatically finds prisma)
npm run db:generate

# Option 2: Use npx (if npm script doesn't work)
npx prisma generate
```

If you still get errors, verify Prisma is installed:
```bash
# Check if node_modules exists
ls node_modules/.bin/prisma

# If not, reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

This will:
- Create all database tables
- Set up the schema

### 6. Seed Initial Admin User

```bash
npm run db:seed
```

**⚠️ IMPORTANT:** The seed script will output a randomly generated password. **Save this password!** You'll need it to log in to the admin panel.

Example output:
```
✅ Admin user created/updated:
   Username: danny_lightsailvr
   Password: abc123xyz789!@#
   
⚠️  IMPORTANT: Save this password and change it via /admin/settings after first login!
```

### 7. Create Uploads Directory

```bash
mkdir -p uploads/players
```

### 8. Start Development Server

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

### 9. Open in Browser

Navigate to:
- **Public site:** http://localhost:3000
- **Admin login:** http://localhost:3000/admin/login

Use the credentials from step 6 to log in.

---

## Troubleshooting

### PostgreSQL Connection Issues

**macOS:**
```bash
# Check if PostgreSQL is running
brew services list

# If not running, start it
brew services start postgresql@14

# Test connection
psql -U beastgames_user -d beastgames -h localhost
```

**Ubuntu:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Test connection
psql -U beastgames_user -d beastgames -h localhost
```

### Port Already in Use

If port 3000 is already in use:

```bash
# macOS/Linux: Find what's using the port
lsof -i :3000

# Kill the process or use a different port
PORT=3001 npm run dev
```

### Prisma Command Not Found

If you see `sh: prisma: command not found`:

**Solution 1: Use npm scripts (recommended)**
```bash
# Instead of: prisma generate
# Use:
npm run db:generate

# Instead of: prisma migrate dev
# Use:
npm run db:migrate
```

**Solution 2: Use npx**
```bash
# npx will find prisma in node_modules
npx prisma generate
npx prisma migrate dev
```

**Solution 3: Reinstall dependencies**
```bash
# Make sure dependencies are installed
npm install

# Verify Prisma is installed
ls node_modules/.bin/prisma
```

**Solution 4: Install globally (optional)**
```bash
npm install -g prisma
# Then you can use: prisma generate directly
```

### Prisma Client Not Generated

```bash
# Regenerate Prisma client
npm run db:generate

# If that doesn't work, try:
rm -rf node_modules/.prisma
npm run db:generate

# Or use npx:
npx prisma generate
```

### Environment Variable Issues

**If using `.env.local` instead of `.env`:**

Prisma CLI looks for `.env` by default. If you're using `.env.local`:

**Option 1: Create both files (recommended)**
```bash
# Copy your .env.local to .env
cp .env.local .env
```

**Option 2: Use dotenv-cli**
```bash
npm install -D dotenv-cli
# Then prefix commands: dotenv -e .env.local -- npm run db:migrate
```

**Option 3: Just use `.env`**
Since `.env` is already in `.gitignore`, it's safe to use for local development. You can rename:
```bash
mv .env.local .env
```

### Database Migration Errors

```bash
# Reset database (WARNING: deletes all data)
npm run db:push -- --force-reset

# Or manually drop and recreate
psql -U beastgames_user -d postgres -c "DROP DATABASE beastgames;"
psql -U beastgames_user -d postgres -c "CREATE DATABASE beastgames;"
npm run db:migrate
```

### Image Upload Not Working

```bash
# Ensure uploads directory exists and has correct permissions
mkdir -p uploads/players
chmod 755 uploads
chmod 755 uploads/players
```

---

## Quick Start Commands Reference

```bash
# Install dependencies
npm install

# Set up database
npm run db:generate
npm run db:migrate
npm run db:seed

# Start development server
npm run dev

# Open Prisma Studio (database GUI)
npm run db:studio
```

---

## Development Workflow

1. **Make code changes** - Edit files in `app/`, `components/`, `lib/`, etc.
2. **Hot reload** - Next.js automatically reloads on file changes
3. **Database changes** - Edit `prisma/schema.prisma`, then:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
4. **View database** - Run `npm run db:studio` to open Prisma Studio GUI

---

## Platform-Specific Notes

### macOS
- **Package manager:** Homebrew (`brew`) - **NOT apt** (apt is Ubuntu/Debian only)
- PostgreSQL can be installed via Homebrew or Postgres.app (easier GUI)
- Default PostgreSQL port: 5432
- Service management: `brew services start/stop postgresql@14`

### Ubuntu
- **Package manager:** `apt` (Advanced Package Tool)
- PostgreSQL runs as a system service
- Default PostgreSQL port: 5432
- Service management: `sudo systemctl start/stop postgresql`
- May need to configure `pg_hba.conf` for local connections

---

## Next Steps

Once running locally:
1. Log in to admin panel at `/admin/login`
2. Change the admin password via `/admin/settings`
3. Add some test players via `/admin/players`
4. Test voting functionality on public pages
5. Check stats at `/stats`

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).

