import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Let the schema resolve DATABASE_URL at query time; builds need no database credentials.
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Reuse the client across Next development hot reloads.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

