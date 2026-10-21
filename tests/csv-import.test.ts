import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/admin/import-csv/route';
import { GET as exportCsv } from '../app/api/admin/export-csv/route';
import { createToken } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { parse } from 'csv-parse/sync';

test('optional CSV teams preserve updates and elimination groups round-trip', async (t) => {
  process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
  const player = {
    id: 1, playerNumber: 1, name: 'Example', slug: 'example',
    title: null, team: 'SMART', bio: null, imageUrl: null,
    eliminated: false, groupNumber: 4, extraFields: null,
  };
  function stub(target: any, method: string, implementation: (...args: any[]) => any) {
    const original = target[method];
    target[method] = implementation;
    t.after(() => { target[method] = original; });
  }
  stub(prisma.adminUser, 'findUnique', async () => ({ id: 1, username: 'admin' }));
  stub(prisma.player, 'findUnique', async () => player);
  stub(prisma.player, 'count', async () => 1);
  stub(prisma.player, 'update', async ({ data }: any) => {
    Object.assign(player, Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)));
    return player;
  });
  stub(prisma.player, 'findMany', async () => [player]);
  const headers = { Cookie: 'admin-token=' + createToken({ id: 1, username: 'admin' }) };
  async function importCsv(csv: string) {
    const body = new FormData();
    body.set('csv', new Blob([csv]), 'players.csv');
    const response = await POST(new NextRequest('http://localhost/api/admin/import-csv', { method: 'POST', headers, body }));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.errors, []);
    return result;
  }

  await importCsv('id,playerNumber,name,slug\n1,1,Example,example\n');
  assert.equal(player.team, 'SMART');
  assert.equal(player.groupNumber, 4);
  await importCsv('id,playerNumber,name,slug,team,groupNumber\n1,1,Example,example,,7\n');
  assert.equal(player.team, 'SMART');
  assert.equal(player.groupNumber, 7);
  const exported = await exportCsv(new NextRequest('http://localhost/api/admin/export-csv', { headers }));
  const csv = await exported.text();
  assert.equal(parse(csv, { columns: true })[0].groupNumber, '7');
  await importCsv(csv);
  assert.equal(player.team, 'SMART');
  assert.equal(player.groupNumber, 7);
  await importCsv('id,playerNumber,name,slug,team,groupNumber\n1,1,Example,example,OG,\n');
  assert.equal(player.team, 'OG');
  assert.equal(player.groupNumber, null);

  stub(prisma.player, 'findUnique', async () => null);
  let created: any;
  stub(prisma.player, 'create', async ({ data }: any) => { created = data; return data; });
  const result = await importCsv('playerNumber,name,slug,groupNumber\n2,New Player,new-player,2\n');
  assert.equal(result.created, 1);
  assert.equal(created.team, 'STRONG');
  assert.equal(created.groupNumber, 2);
});
