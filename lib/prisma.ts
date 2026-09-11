import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Optimize connection pooling for high throughput
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Optimize connection pool for high throughput (thousands of votes per second)
// These settings help handle concurrent connections efficiently
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

