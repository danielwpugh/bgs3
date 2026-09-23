import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCountry, mergeExtraFields } from '../lib/country';
import { GET } from '../app/api/admin/template.csv/route';
import { parse } from 'csv-parse/sync';

test('country names, codes, and common aliases resolve to flags', () => {
  assert.deepEqual(getCountry({ country: ' australia ' }), { name: 'Australia', flag: '🇦🇺' });
  assert.deepEqual(getCountry({ country: 'fr' }), { name: 'France', flag: '🇫🇷' });
  assert.deepEqual(getCountry({ country: 'USA' }), { name: 'United States', flag: '🇺🇸' });
  assert.deepEqual(getCountry({ country: 'UK' }), { name: 'United Kingdom', flag: '🇬🇧' });
});

test('legacy players and unknown countries render safely', () => {
  for (const extra of [null, {}, { country: '' }, { country: '  ' }, { country: 123 }]) {
    assert.equal(getCountry(extra), null);
  }
  assert.deepEqual(getCountry({ country: 'Custom country' }), { name: 'Custom country', flag: '' });
});

test('country CSV edits preserve metadata and distinguish clearing from omission', () => {
  const original = { country: 'France', linkUrl: 'https://example.com', custom: { value: 1 } };
  assert.deepEqual(mergeExtraFields(original, { country: 'AU' }), { ...original, country: 'AU' });
  assert.deepEqual(mergeExtraFields(original, { country: '' }), { ...original, country: '' });
  assert.deepEqual(mergeExtraFields(original, { customColumn: 'value' }), { ...original, customColumn: 'value' });
  assert.deepEqual(mergeExtraFields(null, { country: 'AU' }), { country: 'AU' });
});

test('downloadable CSV includes correctly aligned country examples', async () => {
  const response = await GET();
  const rows = parse(await response.text(), { columns: true, skip_empty_lines: true });
  assert.equal(rows[0].country, 'Australia');
  assert.equal(rows[1].country, 'France');
  assert.equal(rows[0].groupNumber, '');
  assert.equal(rows[1].team, 'STRONG');
});
