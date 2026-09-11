# Beast Games

A production-ready voting/polling platform and player directory ("Beastdex") for a TV show with ~200 players.

## Features

- **Public Pages:**
  - Landing page with overview
  - Beastdex: Grid view of all players with filtering and search
  - Player detail pages with voting functionality
  - Real-time statistics dashboard

- **Admin Panel:**
  - Player management (CRUD operations)
  - CSV import/export for bulk player management
  - Image upload with automatic resizing
  - Password-based authentication  
  - Settings management

- **Voting System:**
  - Rate limiting to prevent spam
  - Session-based vote tracking
  - Real-time vote counts
  - Elimination status handling 

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS Variables
- **Database:** PostgreSQL with Prisma ORM
- **Image Processing:** Sharp
- **Authentication:** JWT-based sessions

## Analytics (GA4)

- **Measurement ID**: set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to enable Google Analytics.
- **SPA pageviews**: tracked on App Router route changes.
- **Iframe support**: sets `cookie_flags: 'SameSite=None;Secure'` to improve cookie behavior when embedded.

## Getting Started

### Prerequisites

- Node.js 20+ 
- PostgreSQL 14+
- npm or yarn

### Quick Start

For detailed local development setup instructions for **macOS** and **Ubuntu**, see [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md).

**Quick setup:**
```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 3. Set up database
npm run db:generate
npm run db:migrate
npm run db:seed  # Save the generated password!

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Important:** The seed script will generate a random password for the admin user `danny_lightsailvr`. Save this password and change it via `/admin/settings` after first login.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:deploy` - Deploy migrations (production)
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
beastgames/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin pages
│   ├── beastdex/          # Player directory
│   ├── players/           # Player detail pages
│   ├── stats/             # Statistics page
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utility functions
│   ├── auth.ts           # Authentication helpers
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # General utilities
├── prisma/                # Prisma schema and migrations
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seed script
└── uploads/               # Uploaded images (gitignored)
```

## Database Schema

### Player
- Basic info: name, slug, title, team, bio
- Image URL for player photos
- Elimination status
- Flexible `extraFields` JSON for future expansion

### Vote
- Links to player
- Timestamp for time-based analytics
- Optional metadata JSON

### AdminUser
- Username and hashed password (bcrypt)

## API Routes

### Public
- `GET /api/players` - List all players
- `GET /api/players/[slug]` - Get player by slug
- `POST /api/votes` - Submit a vote
- `GET /api/stats` - Get statistics

### Admin (Protected)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/me` - Get current admin session
- `POST /api/admin/change-password` - Change admin password
- `GET /api/admin/players` - List players (admin)
- `POST /api/admin/players` - Create player
- `PUT /api/admin/players/[id]` - Update player
- `DELETE /api/admin/players/[id]` - Delete player
- `POST /api/admin/players/[id]/toggle-eliminated` - Toggle eliminated status
- `POST /api/admin/upload-image` - Upload player image
- `POST /api/admin/import-csv` - Import players from CSV
- `GET /api/admin/template.csv` - Download CSV template

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to DigitalOcean with Nginx and HTTPS.

## Security Features

- Password hashing with bcrypt
- JWT-based session management
- Rate limiting on voting endpoint
- Input validation with Zod
- Secure cookie settings
- SQL injection protection via Prisma

## License

ISC

