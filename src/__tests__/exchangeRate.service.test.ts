import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockFind, mockFindOne } = vi.hoisted(() => ({
  mockFind: vi.fn(),
  mockFindOne: vi.fn(),
}));

vi.mock('@config/properties', () => ({
  properties: {
    exchangeRate: { threshold: 0.25, rateWindowSize: 6 },
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
  calculatePrevNext,
  checkUpperStepReached,
  computeMaxIncrease,
  checkHighExchangeRateIncrease,
} from '@services/exchangeRate.service';
import { setPrevNextStep } from '@config/step';

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

describe('calculatePrevNext', () => {
  it('handles a value in the middle of a step', () => {
    expect(calculatePrevNext(6.85)).toEqual({ prev: 6.8, next: 6.9 });
  });

  it('handles a value that is exactly on a floating-point boundary (6.9)', () => {
    // 6.9 / 0.1 = 68.999... in JS — old code would give prev=6.8, next=6.9
    expect(calculatePrevNext(6.9)).toEqual({ prev: 6.9, next: 7.0 });
  });

  it('handles an exact integer boundary (7.0)', () => {
    // 7.0 / 0.1 can be 69.999... in JS — old code would give prev=6.9, next=7.0
    expect(calculatePrevNext(7.0)).toEqual({ prev: 7.0, next: 7.1 });
  });

  it('handles a value just above a boundary (7.05)', () => {
    expect(calculatePrevNext(7.05)).toEqual({ prev: 7.0, next: 7.1 });
  });

  it('handles a value at the upper end of a step (7.09)', () => {
    expect(calculatePrevNext(7.09)).toEqual({ prev: 7.0, next: 7.1 });
  });

  it('handles another floating-point boundary (7.1)', () => {
    expect(calculatePrevNext(7.1)).toEqual({ prev: 7.1, next: 7.2 });
  });
});

// ---------------------------------------------------------------------------

describe('checkUpperStepReached', () => {
  beforeEach(() => {
    setPrevNextStep({ prev: 6.9, next: 7.0 });
  });

  it('returns false when rate is below the next threshold', () => {
    expect(checkUpperStepReached(6.95)).toBe(false);
  });

  it('returns true when rate hits exactly the next threshold', () => {
    expect(checkUpperStepReached(7.0)).toBe(true);
  });

  it('returns true when rate exceeds the next threshold', () => {
    expect(checkUpperStepReached(7.05)).toBe(true);
  });

  it('returns false when rate drops below the current range', () => {
    expect(checkUpperStepReached(6.5)).toBe(false);
  });

  it('updates state after crossing so the next alert fires at the new step', () => {
    checkUpperStepReached(7.05); // crosses 7.0 → state becomes { prev:7.0, next:7.1 }
    expect(checkUpperStepReached(7.09)).toBe(false); // 7.09 < 7.1
    expect(checkUpperStepReached(7.1)).toBe(true);   // hits 7.1
  });

  it('does not fire again for the same step after state is updated', () => {
    checkUpperStepReached(7.05); // crosses 7.0
    // rate stays in the 7.0–7.1 band → no second alert
    expect(checkUpperStepReached(7.08)).toBe(false);
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
