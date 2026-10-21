import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolvePlayerImageUrl } from '../lib/utils';

test('player photos prefer public images, then uploads, then stored URLs', async () => {
  const originalCwd = process.cwd();
  const root = await mkdtemp(join(tmpdir(), 'player-images-'));
  try {
    await mkdir(join(root, 'public/players/images'), { recursive: true });
    await mkdir(join(root, 'uploads/players'), { recursive: true });
    await writeFile(join(root, 'public/players/images/001.webp'), 'public photo');
    await writeFile(join(root, 'uploads/players/001.png'), 'uploaded photo');
    await writeFile(join(root, 'uploads/players/002.jpg'), 'uploaded photo');
    process.chdir(root);
    assert.equal(await resolvePlayerImageUrl(1, '/stored.jpg'), '/players/images/001.webp');
    assert.equal(await resolvePlayerImageUrl(2, '/stored.jpg'), '/uploads/players/002.jpg');
    assert.equal(await resolvePlayerImageUrl(3, 'stored.jpg'), '/stored.jpg');
    assert.equal(await resolvePlayerImageUrl(4, null), null);
    assert.equal(await resolvePlayerImageUrl(null, 'https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
  } finally {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  }
});
