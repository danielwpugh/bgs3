import { PrismaClient, PlayerTeam } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const url = new URL(process.env.DATABASE_URL || '');
const count = Number(process.env.TEST_VOTES || 100000);
if (!['localhost','127.0.0.1','db'].includes(url.hostname) || !url.pathname.endsWith('_local')) throw new Error('Test fixtures only run against a local database ending in _local');
if (!Number.isInteger(count) || count < 0 || count > 5000000) throw new Error('TEST_VOTES must be 0–5000000');
async function main() {
  // Refuse existing real data; only replace namespaced fixture players.
  if (await prisma.player.count({where:{NOT:{slug:{startsWith:'fixture-player-'}}}})) throw new Error('Database contains non-fixture players');
  await prisma.$transaction(async tx => {
    await tx.vote.deleteMany(); await tx.player.deleteMany();
    await tx.player.createMany({data:Array.from({length:200},(_,i)=>({playerNumber:i+1,slug:`fixture-player-${i+1}`,name:`Test Player ${String(i+1).padStart(3,'0')}`,team:(['STRONG','SMART','OG'] as PlayerTeam[])[i%3],eliminated:i>=180,bio:'Local test fixture.'}))});
    // Generate realistic historical records in SQL instead of sending millions of JSON rows.
    await tx.$executeRaw`INSERT INTO "Vote" ("playerId", type, "voterId", "dayPacific", "createdAt") SELECT p.id, CASE WHEN n % 5 = 0 THEN 'DOWNVOTE'::"VoteType" ELSE 'UPVOTE'::"VoteType" END, 'fixture-' || n, to_char(now() - (n % 30) * interval '1 day', 'YYYY-MM-DD'), now() - (n % 30) * interval '1 day' FROM generate_series(1, ${count}::integer) n JOIN "Player" p ON p."playerNumber" = 1 + (n % 200)`;
    await tx.$executeRaw`UPDATE "Player" p SET "upvoteCount" = (SELECT count(*)::integer FROM "Vote" v WHERE v."playerId"=p.id AND v.type='UPVOTE'), "downvoteCount"=(SELECT count(*)::integer FROM "Vote" v WHERE v."playerId"=p.id AND v.type='DOWNVOTE')`;
    await tx.settings.deleteMany(); await tx.settings.create({data:{dailyVoteLimitEnabled:true}});
    const password = await bcrypt.hash('local-beastgames-admin',10);
    await tx.adminUser.upsert({where:{username:'local_admin'},create:{username:'local_admin',password},update:{password}});
  }, {timeout:180000});
  console.log(`Seeded 200 players and ${count} votes. Local admin: local_admin / local-beastgames-admin`);
}
main().finally(()=>prisma.$disconnect());
