import { prisma } from './lib/prisma';

async function testVisitors() {
  try {
    console.log('Testing visitor tracking...\n');

    // Check if we can query visitors
    const count = await prisma.visitor.count();
    console.log(`Total visitors in database: ${count}`);

    // Get all visitors
    const visitors = await prisma.visitor.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\nRecent visitors (last 10):`);
    visitors.forEach((v, i) => {
      console.log(`${i + 1}. IP: ${v.ipAddress}, Date: ${v.date.toISOString()}, Created: ${v.createdAt.toISOString()}`);
    });

    // Try to create a test visitor
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      const testVisitor = await prisma.visitor.create({
        data: {
          ipAddress: 'test-' + Date.now(),
          date: today,
        },
      });
      console.log(`\n✅ Successfully created test visitor: ${testVisitor.id}`);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        console.log('\n⚠️  Test visitor already exists (unique constraint)');
      } else {
        console.error('\n❌ Error creating test visitor:', error);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testVisitors();




















