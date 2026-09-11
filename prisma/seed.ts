import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Generate a strong random password
  const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + '!@#';
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  // Create or update admin user
  const admin = await prisma.adminUser.upsert({
    where: { username: 'danny_lightsailvr' },
    update: {
      password: hashedPassword,
    },
    create: {
      username: 'danny_lightsailvr',
      password: hashedPassword,
    },
  });

  console.log('✅ Admin user created/updated:');
  console.log('   Username: danny_lightsailvr');
  console.log('   Password:', randomPassword);
  console.log('\n⚠️  IMPORTANT: Save this password and change it via /admin/settings after first login!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

