import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AiLearningStore, type NewLearnedRecord } from '../services/aiLearningStore';

/** Each store gets its own throwaway file so tests never touch real data. */
function tempFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'petpal-learn-'));
  return path.join(dir, 'learned.json');
}

const base: NewLearnedRecord = {
  pet: 'dogs',
  food: 'dragonfruit',
  safety: 'caution',
  description: 'test record',
};

describe('AiLearningStore', () => {
  test('records a new answer as pending', () => {
    const store = new AiLearningStore(tempFile());
    const record = store.recordAnswer(base);

    expect(record).not.toBeNull();
    expect(record?.status).toBe('pending');
    expect(store.stats()).toEqual({ pending: 1, approved: 0, rejected: 0, total: 1 });
    expect(store.listApproved()).toHaveLength(0);
  });

  test('ignores duplicates while pending or approved, but not after rejection', () => {
    const store = new AiLearningStore(tempFile());
    const first = store.recordAnswer(base);
    expect(first).not.toBeNull();

    expect(store.recordAnswer(base)).toBeNull(); // already pending

    store.approve(first!.id);
    expect(store.recordAnswer(base)).toBeNull(); // already approved

    store.reject(first!.id);
    expect(store.recordAnswer(base)).not.toBeNull(); // rejected may be re-queued
  });

  test('approve and reject move records between states', () => {
    const store = new AiLearningStore(tempFile());
    const a = store.recordAnswer({ ...base, food: 'alpha' })!;
    const b = store.recordAnswer({ ...base, food: 'bravo' })!;

    store.approve(a.id);
    store.reject(b.id);

    expect(store.stats()).toEqual({ pending: 0, approved: 1, rejected: 1, total: 2 });
    expect(store.listApproved().map((record) => record.food)).toEqual(['alpha']);
    expect(store.find(b.id)?.reviewedAt).toBeTruthy();
  });

  test('persists across instances', () => {
    const file = tempFile();
    const store = new AiLearningStore(file);
    store.approve(store.recordAnswer(base)!.id);

    const reloaded = new AiLearningStore(file);
    expect(reloaded.stats().approved).toBe(1);
    expect(reloaded.listApproved()).toHaveLength(1);
  });

  test('unknown ids return null', () => {
    const store = new AiLearningStore(tempFile());
    expect(store.approve('missing')).toBeNull();
    expect(store.reject('missing')).toBeNull();
  });
});
