import test from 'node:test';
import assert from 'node:assert/strict';
import { getPacificDateKey } from '../lib/utils';

test('Pacific dates reset at local midnight in both standard and daylight time', () => {
  for (const [instant, day] of [
    ['2026-01-15T07:59:59.999Z', '2026-01-14'],
    ['2026-01-15T08:00:00.000Z', '2026-01-15'],
    ['2026-07-15T06:59:59.999Z', '2026-07-14'],
    ['2026-07-15T07:00:00.000Z', '2026-07-15'],
    // Spring-forward day is 23 hours; fall-back day is 25 hours.
    ['2026-03-08T08:00:00.000Z', '2026-03-08'],
    ['2026-03-09T06:59:59.999Z', '2026-03-08'],
    ['2026-03-09T07:00:00.000Z', '2026-03-09'],
    ['2026-11-01T07:00:00.000Z', '2026-11-01'],
    ['2026-11-02T07:59:59.999Z', '2026-11-01'],
    ['2026-11-02T08:00:00.000Z', '2026-11-02'],
  ]) assert.equal(getPacificDateKey(new Date(instant)), day, instant);
});
