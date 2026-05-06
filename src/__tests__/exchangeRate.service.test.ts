import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockFind, mockFindOne } = vi.hoisted(() => ({
  mockFind: vi.fn(),
  mockFindOne: vi.fn(),
}));

vi.mock('@config/properties', () => ({
  properties: {
    exchangeRate: {
      threshold: 0.25,
      rateWindowSize: 6,
      zscoreThreshold: 2.0,
      zscoreWindowSize: 20,
    },
  },
}));

vi.mock('@config/client', () => ({ default: {} }));

vi.mock('@utils/logger', () => ({
  default: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@models/exchangeRate.model', () => ({
  default: { find: mockFind, findOne: mockFindOne },
}));

import {
  checkHighExchangeRateIncrease,
  checkHighExchangeRateZScore,
  computeCurrentZScore,
  computeMaxIncrease,
  computeZScore,
  stepCrossed,
} from '@services/exchangeRate.service';

// Build a chainable mongoose query mock
const makeQueryChain = (docs: { rate: number }[]) => ({
  sort: vi.fn().mockReturnValue({
    limit: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(docs),
    }),
  }),
});

const toDocs = (rates: number[]) => rates.map((rate) => ({ rate }));

// ---------------------------------------------------------------------------

describe('stepCrossed', () => {
  it('returns true when rate moves into the next 0.1 step', () => {
    expect(stepCrossed(7.05, 6.95)).toBe(true); // 6.9-step → 7.0-step
  });

  it('returns false when rate stays in the same step', () => {
    expect(stepCrossed(7.09, 7.01)).toBe(false); // both in 7.0-step
  });

  it('returns true when rate lands exactly on a boundary', () => {
    expect(stepCrossed(7.0, 6.99)).toBe(true);  // 6.9-step → 7.0-step
  });

  it('handles floating-point boundaries correctly (6.9, 7.0, 7.1)', () => {
    expect(stepCrossed(6.9, 6.85)).toBe(true);  // 6.8-step → 6.9-step
    expect(stepCrossed(7.0, 6.9)).toBe(true);   // 6.9-step → 7.0-step
    expect(stepCrossed(7.1, 7.09)).toBe(true);  // 7.0-step → 7.1-step
  });

  it('returns false when rate drops (no alert on downward moves)', () => {
    expect(stepCrossed(6.95, 7.05)).toBe(false);
  });

  it('returns true for a multi-step jump (server was down)', () => {
    expect(stepCrossed(7.25, 6.85)).toBe(true); // jumped multiple steps
  });

  it('returns false when current and previous are in the same step after a jump', () => {
    expect(stepCrossed(7.08, 7.02)).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('computeMaxIncrease', () => {
  it('returns total increase for a steadily rising rate (newest-first input)', () => {
    // chronological: 6.8 → 6.9 → 7.0 → 7.1 → 7.2 → 7.3  (+0.5 total)
    const rates = [7.3, 7.2, 7.1, 7.0, 6.9, 6.8];
    expect(computeMaxIncrease(rates)).toBeCloseTo(0.5);
  });

  it('returns 0 for a steadily falling rate', () => {
    // chronological: 7.3 → 7.2 → ... → 6.8  (all decreasing)
    const rates = [6.8, 6.9, 7.0, 7.1, 7.2, 7.3];
    expect(computeMaxIncrease(rates)).toBe(0);
  });

  it('detects max contiguous increase when there is a dip in the window', () => {
    // chronological: 6.9 → 7.2 → 7.3 → 7.1 → 6.9  (max run = 6.9→7.3 = +0.4)
    // rates newest-first: [6.9, 7.1, 7.3, 7.2, 6.9]
    const rates = [6.9, 7.1, 7.3, 7.2, 6.9];
    expect(computeMaxIncrease(rates)).toBeCloseTo(0.4);
  });

  it('detects a sharp increase at the end of the window after an initial drop', () => {
    // chronological: 6.95 → 6.90 → 6.85 → 6.90 → 7.40 → 7.50
    // initial drop resets running; then 6.85→7.50 = +0.65 dominates
    const rates = [7.5, 7.4, 6.9, 6.85, 6.9, 6.95];
    expect(computeMaxIncrease(rates)).toBeCloseTo(0.65);
  });

  it('returns 0 for a single element', () => {
    expect(computeMaxIncrease([7.0])).toBe(0);
  });

  it('returns 0 for an empty array', () => {
    expect(computeMaxIncrease([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('checkHighExchangeRateIncrease', () => {
  beforeEach(() => {
    mockFind.mockReset();
  });

  it('returns null when there is fewer than 2 data points', async () => {
    mockFind.mockReturnValue(makeQueryChain(toDocs([7.0])));
    expect(await checkHighExchangeRateIncrease()).toBeNull();
  });

  it('returns null when the increase is below the 0.25 threshold', async () => {
    // total increase = 0.2 < 0.25
    const rates = [7.05, 7.0, 6.95, 6.9, 6.88, 6.85];
    mockFind.mockReturnValue(makeQueryChain(toDocs(rates)));
    expect(await checkHighExchangeRateIncrease()).toBeNull();
  });

  it('returns the current (newest) rate when increase meets the threshold', async () => {
    // total increase = 0.35 >= 0.25
    const rates = [7.15, 7.05, 6.95, 6.9, 6.85, 6.8];
    mockFind.mockReturnValue(makeQueryChain(toDocs(rates)));
    expect(await checkHighExchangeRateIncrease()).toBe(7.15);
  });

  it('returns null when the rate fell overall', async () => {
    const rates = [6.8, 6.85, 6.9, 6.95, 7.0, 7.05];
    mockFind.mockReturnValue(makeQueryChain(toDocs(rates)));
    expect(await checkHighExchangeRateIncrease()).toBeNull();
  });

  it('detects a large increase even after an initial dip in the window', async () => {
    // chronological: 6.95 → 6.90 → 6.85 → 6.90 → 7.40 → 7.50 (max run ≈ 0.65)
    const rates = [7.5, 7.4, 6.9, 6.85, 6.9, 6.95];
    mockFind.mockReturnValue(makeQueryChain(toDocs(rates)));
    expect(await checkHighExchangeRateIncrease()).toBe(7.5);
  });
});

// ---------------------------------------------------------------------------

describe('computeZScore', () => {
  it('returns a positive z-score when current is above the historical mean', () => {
    // mean=7.0, stddev=0 if all equal — use varied history
    const historical = [6.9, 7.0, 6.95, 7.05, 7.0, 6.9, 7.0, 6.95]; // mean ≈ 6.97
    const zScore = computeZScore(7.3, historical);
    expect(zScore).toBeGreaterThan(0);
  });

  it('returns a negative z-score when current is below the historical mean', () => {
    const historical = [7.1, 7.2, 7.15, 7.1, 7.2, 7.1, 7.15, 7.2];
    const zScore = computeZScore(6.9, historical);
    expect(zScore).toBeLessThan(0);
  });

  it('returns 0 when stddev is zero (all historical rates identical)', () => {
    const historical = [7.0, 7.0, 7.0, 7.0, 7.0];
    expect(computeZScore(7.5, historical)).toBe(0);
  });

  it('returns 0 when there are fewer than 2 historical points', () => {
    expect(computeZScore(7.5, [7.0])).toBe(0);
    expect(computeZScore(7.5, [])).toBe(0);
  });

  it('returns a z-score >= 2.0 for a rate clearly above recent history', () => {
    // tightly clustered history around 7.0, then a big spike
    const historical = [6.98, 7.0, 7.02, 6.99, 7.01, 7.0, 6.98, 7.02];
    const zScore = computeZScore(7.1, historical);
    expect(zScore).toBeGreaterThanOrEqual(2.0);
  });
});

// ---------------------------------------------------------------------------

describe('computeCurrentZScore', () => {
  beforeEach(() => {
    mockFind.mockReset();
  });

  it('returns null when there are fewer than 3 data points', async () => {
    mockFind.mockReturnValue(makeQueryChain(toDocs([7.1, 7.0])));
    expect(await computeCurrentZScore()).toBeNull();
  });

  it('returns the raw z-score even when below 2.0 (unlike checkHighExchangeRateZScore)', async () => {
    // Volatile history — a modest current rate produces z-score < 2.0
    const rates = [7.05, 6.8, 7.2, 6.9, 7.1, 6.85, 7.0, 6.95, 7.15, 6.8];
    mockFind.mockReturnValue(makeQueryChain(toDocs(rates)));
    const result = await computeCurrentZScore();
    expect(result).not.toBeNull();
    expect(result).toBeLessThan(2.0);
  });

  it('returns a high z-score for a clear outlier', async () => {
    const historical = [
      6.99, 7.01, 7.00, 6.98, 7.02, 7.00, 6.99, 7.01,
      7.00, 7.01, 6.99, 7.00, 7.01, 6.98, 7.02, 7.00,
      6.99, 7.01, 7.00,
    ];
    mockFind.mockReturnValue(makeQueryChain(toDocs([7.1, ...historical])));
    const result = await computeCurrentZScore();
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThanOrEqual(2.0);
  });

  it('returns 0 (not null) when stddev is zero', async () => {
    mockFind.mockReturnValue(makeQueryChain(toDocs(Array(10).fill(7.0))));
    expect(await computeCurrentZScore()).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('checkHighExchangeRateZScore', () => {
  beforeEach(() => {
    mockFind.mockReset();
  });

  // zscoreWindowSize=20, so find is called with limit 21 (20+1)
  // We need current (rates[0]) + at least 2 historical points → minimum 3 docs
  it('returns null when there are fewer than 3 data points', async () => {
    mockFind.mockReturnValue(makeQueryChain(toDocs([7.1, 7.0])));
    expect(await checkHighExchangeRateZScore()).toBeNull();
  });

  it('returns null when the rate is within normal range (z-score < 2.0)', () => {
    // Volatile history — a modest current rate won't stand out
    const rates = [7.05, 6.8, 7.2, 6.9, 7.1, 6.85, 7.0, 6.95, 7.15, 6.8];
    mockFind.mockReturnValue(makeQueryChain(toDocs(rates)));
    return expect(checkHighExchangeRateZScore()).resolves.toBeNull();
  });

  it('returns the current rate when it is a clear outlier (z-score >= 2.0)', async () => {
    // Tightly clustered history (small natural variation around 7.0, stddev ≈ 0.01)
    // then a spike to 7.1 → z-score ≈ 9, well above threshold of 2.0
    const historical = [
      6.99, 7.01, 7.00, 6.98, 7.02, 7.00, 6.99, 7.01,
      7.00, 7.01, 6.99, 7.00, 7.01, 6.98, 7.02, 7.00,
      6.99, 7.01, 7.00,
    ];
    const current = 7.1;
    const rates = [current, ...historical]; // newest-first
    mockFind.mockReturnValue(makeQueryChain(toDocs(rates)));
    expect(await checkHighExchangeRateZScore()).toBe(current);
  });

  it('returns null when all rates are identical (stddev = 0)', async () => {
    const rates = Array(10).fill(7.0);
    mockFind.mockReturnValue(makeQueryChain(toDocs(rates)));
    expect(await checkHighExchangeRateZScore()).toBeNull();
  });
});
