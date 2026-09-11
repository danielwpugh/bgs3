const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const randomPassword = `${crypto.randomBytes(18).toString('base64url')}!Aa1`;
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  await prisma.adminUser.upsert({
    where: { username: 'danny_lightsailvr' },
    update: {
      password: hashedPassword,
    },
    create: {
      username: 'danny_lightsailvr',
      password: hashedPassword,
    },
  });

  console.log('Admin user created/updated:');
  console.log('  Username: danny_lightsailvr');
  console.log('  Password:', randomPassword);
  console.log('Save this password and change it via /admin/settings after first login.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
