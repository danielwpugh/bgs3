import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const source = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1'].includes(source.hostname) || !source.pathname.endsWith('_local')) {
  throw new Error('Rehearsal requires a loopback fixture database ending in _local');
}
const sourceName = source.pathname.slice(1);
if (!/^[a-zA-Z0-9_]+$/.test(sourceName)) throw new Error('Unsupported database name');
const name = `beastgames_rehearsal_${Date.now()}`;
const controlUrl = new URL(source); controlUrl.pathname = '/postgres';
const targetUrl = new URL(source); targetUrl.pathname = `/${name}`;
const control = new PrismaClient({datasources:{db:{url:controlUrl.href}}});
const target = new PrismaClient({datasources:{db:{url:targetUrl.href}}});
const report = {database:name, startedAt:new Date().toISOString(), checks:[]};
let created = false;
function prisma(args) {
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
    env:{...process.env, DATABASE_URL:targetUrl.href}, encoding:'utf8', timeout:120000,
  });
  if (result.status !== 0) throw new Error(`Prisma ${args[0]} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}
async function counts() {
  return {
    players:await target.player.count(), votes:await target.vote.count(),
    counters:await target.player.aggregate({_sum:{upvoteCount:true,downvoteCount:true}}),
    mismatches:await target.$queryRaw`SELECT count(*)::int AS count FROM "Player" p WHERE p."upvoteCount" <> (SELECT count(*) FROM "Vote" v WHERE v."playerId"=p.id AND v.type='UPVOTE') OR p."downvoteCount" <> (SELECT count(*) FROM "Vote" v WHERE v."playerId"=p.id AND v.type='DOWNVOTE')`,
  };
}
try {
  // Source must have no active clients. Never terminate another application's sessions.
  await control.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE "${sourceName}"`);
  created = true;
  await target.$executeRawUnsafe('DROP TABLE IF EXISTS "_prisma_migrations"');
  report.before = await counts();
  const diff = prisma(['migrate','diff','--from-schema-datasource','prisma/schema.prisma','--to-schema-datamodel','prisma/schema.prisma','--exit-code']);
  report.checks.push('Existing schema matches checked-in schema');
  prisma(['migrate','resolve','--applied','20260911000000_baseline']);
  prisma(['migrate','deploy']);
  prisma(['migrate','status']);
  report.after = await counts();
  if (JSON.stringify(report.before)!==JSON.stringify(report.after)) throw new Error('Data changed during baselining');
  if (report.after.mismatches[0].count !== 0) throw new Error('Fixture vote counters do not reconcile');
  report.checks.push('Baseline marked applied; deploy/status pass; row counts and vote counters preserved');
  report.status = 'passed';
  console.log(JSON.stringify(report,null,2));
} catch(error) {report.status='failed';report.error=String(error);throw error;}
finally {
  await target.$disconnect();
  if(created) await control.$executeRawUnsafe(`DROP DATABASE "${name}"`);
  await control.$disconnect();
  await mkdir('artifacts/migration',{recursive:true});
  await writeFile('artifacts/migration/rehearsal.json',JSON.stringify(report,null,2));
}
