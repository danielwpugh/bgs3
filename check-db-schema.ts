import { prisma } from './lib/prisma';

async function checkSchema() {
  try {
    console.log('Checking database schema...\n');

    // Try to query the Settings table with the new columns
    const settings = await prisma.settings.findFirst();
    
    if (settings) {
      console.log('✅ Settings table exists');
      console.log('Current Settings record:', {
        id: settings.id,
        backgroundImageUrl: settings.backgroundImageUrl ? 'set' : 'null',
        logoUrl: settings.logoUrl ? 'set' : 'null',
        frontendPasswordEnabled: (settings as any).frontendPasswordEnabled ?? 'COLUMN MISSING',
        frontendPassword: (settings as any).frontendPassword ? 'set' : ((settings as any).frontendPassword === null ? 'null' : 'COLUMN MISSING'),
        updatedAt: settings.updatedAt,
      });
    } else {
      console.log('⚠️  Settings table exists but is empty');
    }

    // Try to check the table structure directly using raw SQL
    try {
      const result = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Settings' 
        ORDER BY column_name;
      `;
      
      console.log('\n📋 Columns in Settings table:');
      result.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });

      const hasFrontendPasswordEnabled = result.some(col => col.column_name === 'frontendPasswordEnabled');
      const hasFrontendPassword = result.some(col => col.column_name === 'frontendPassword');

      console.log('\n🔍 Column Check:');
      console.log(`  frontendPasswordEnabled: ${hasFrontendPasswordEnabled ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`  frontendPassword: ${hasFrontendPassword ? '✅ EXISTS' : '❌ MISSING'}`);

    } catch (error: any) {
      console.error('❌ Error checking table structure:', error.message);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('frontendPasswordEnabled')) {
      console.log('\n💡 The column is missing! You need to run:');
      console.log('   npm run db:push');
      console.log('   OR');
      console.log('   npm run db:migrate (then commit migration files)');
      console.log('   npm run db:deploy (on server)');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();

