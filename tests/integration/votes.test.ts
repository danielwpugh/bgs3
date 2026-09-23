import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { execFileSync } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';
import { NextRequest } from 'next/server';

// Disposable PostgreSQL instance: never reads or mutates the configured app DB.
test('public vote endpoint enforces the Pacific daily limit in PostgreSQL', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'beastgames-votes-'));
  const socket = createServer();
  await new Promise<void>(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>(resolve => socket.close(() => resolve()));
  const pg = new EmbeddedPostgres({ databaseDir: join(dir, 'db'), user: 'test', password: 'test', port, persistent: false, postgresFlags: ['-h', '127.0.0.1', '-k', dir] });
  let db: typeof import('../../lib/prisma').prisma | undefined;
  try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('votes_test');
    process.env.DATABASE_URL = `postgresql://test:test@127.0.0.1:${port}/votes_test`;
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
    db = (await import('../../lib/prisma')).prisma;
    const { POST } = await import('../../app/api/votes/route');
    const { getPacificDateKey } = await import('../../lib/utils');
    const player = await db.player.create({ data: { name: 'Daily limit', slug: 'daily-limit', team: 'OG' } });
    const other = await db.player.create({ data: { name: 'Other player', slug: 'other', team: 'OG' } });
    const vote = (voter: string, playerId = player.id, cookie = false, type = 'UPVOTE') => POST(new NextRequest('http://localhost/api/votes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie: `voter-id=${voter}` } : { 'x-voter-id': voter }) },
      body: JSON.stringify({ playerId, type }),
    }));

    await t.test('missing settings cannot disable limits; other players and browsers remain eligible', async () => {
      const id = randomUUID();
      assert.equal((await vote(id)).status, 200);
      const duplicate = await vote(id);
      assert.equal(duplicate.status, 400);
      assert.match((await duplicate.json()).error, /midnight Pacific Time/);
      assert.equal((await vote(id, other.id)).status, 200);
      assert.equal((await vote(randomUUID())).status, 200);
    });
    const settings = await db.settings.create({ data: { dailyVoteLimitEnabled: false } });
    await t.test('legacy disabled setting still rejects simultaneous cookie-free SALP requests', async () => {
      const id = randomUUID();
      const before = await db!.player.findUniqueOrThrow({ where: { id: player.id } });
      const responses = await Promise.all(Array.from({ length: 5 }, () => vote(id)));
      assert.equal(responses.filter(r => r.status === 200).length, 1);
      assert.equal(responses.filter(r => r.status === 400).length, 4);
      assert.equal(await db!.vote.count({ where: { voterId: id } }), 1);
      const after = await db!.player.findUniqueOrThrow({ where: { id: player.id } });
      assert.equal(after.upvoteCount, before.upvoteCount + 1);
    });
    await t.test('cookies and vote types share the same daily allowance', async () => {
      const id = randomUUID();
      assert.equal((await vote(id, player.id, true)).status, 200);
      assert.equal((await vote(id, player.id, true, 'DOWNVOTE')).status, 400);
    });
    await t.test('yesterday is eligible while existing votes today count toward the limit', async () => {
      const yesterdayId = randomUUID();
      const todayId = randomUUID();
      const now = new Date();
      const yesterday = new Date(`${getPacificDateKey(now)}T12:00:00.000Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      await db!.$transaction([
        db!.vote.create({ data: { playerId: player.id, voterId: yesterdayId, dayPacific: getPacificDateKey(yesterday), createdAt: yesterday } }),
        db!.vote.create({ data: { playerId: player.id, voterId: todayId, dayPacific: getPacificDateKey(now) } }),
        db!.player.update({ where: { id: player.id }, data: { upvoteCount: { increment: 2 } } }),
      ]);
      assert.equal((await vote(yesterdayId)).status, 200);
      assert.equal((await vote(todayId)).status, 400);
    });
    await t.test('admin settings report the required policy and reject disabling it', async () => {
      process.env.JWT_SECRET = 'vote-tests-only-secret-with-at-least-32-characters';
      const { createToken } = await import('../../lib/auth');
      const { GET, PUT } = await import('../../app/api/admin/settings/route');
      const admin = await db!.adminUser.create({ data: { username: 'vote-test-admin', password: 'unused' } });
      const headers = { cookie: `admin-token=${createToken(admin)}`, 'content-type': 'application/json' };
      const response = await GET(new NextRequest('http://localhost/api/admin/settings', { headers }));
      assert.equal((await response.json()).settings.dailyVoteLimitEnabled, true);
      const disabled = await PUT(new NextRequest('http://localhost/api/admin/settings', {
        method: 'PUT', headers, body: JSON.stringify({ dailyVoteLimitEnabled: false }),
      }));
      assert.equal(disabled.status, 400);
    });
    await t.test('voting pause and elimination still block votes', async () => {
      await db!.settings.update({ where: { id: settings.id }, data: { pauseVoting: true } });
      assert.equal((await vote(randomUUID())).status, 403);
      await db!.settings.update({ where: { id: settings.id }, data: { pauseVoting: false } });
      await db!.player.update({ where: { id: player.id }, data: { eliminated: true } });
      assert.equal((await vote(randomUUID())).status, 400);
    });
  } finally {
    await db?.$disconnect();
    await pg.stop();
    await rm(dir, { recursive: true, force: true });
  }
});
