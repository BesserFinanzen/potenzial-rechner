import { describe, it, expect } from 'vitest';
import { EngagedClock, isHeartbeat, reachedDepths, MAX_ENGAGED_S } from '../src/tracking/page';

describe('reachedDepths', () => {
  const none = new Set<number>();
  it('oben auf der Seite: nichts erreicht', () => {
    expect(reachedDepths(0, 800, 4000, none)).toEqual([]);
  });
  it('meldet nur neu erreichte Schwellen', () => {
    expect(reachedDepths(500, 800, 4000, none)).toEqual([25]); // unterer Rand 1300 von 4000 = 32 %
    expect(reachedDepths(1300, 800, 4000, new Set([25]))).toEqual([50]); // 2100 = 52 %
  });
  it('mehrere Schwellen auf einmal bei grossem Sprung', () => {
    expect(reachedDepths(2300, 800, 4000, none)).toEqual([25, 50, 75]); // 3100 = 77 %
  });
  it('ganz unten: 100 % (Toleranz fuer Subpixel)', () => {
    expect(reachedDepths(3199, 800, 4000, new Set([25, 50, 75]))).toEqual([100]);
    expect(reachedDepths(3150, 800, 4000, new Set([25, 50, 75]))).toEqual([]);
  });
  it('bereits erreichte Schwellen kommen nie wieder', () => {
    expect(reachedDepths(3200, 800, 4000, new Set([25, 50, 75, 100]))).toEqual([]);
  });
  it('Seite kuerzer als Viewport: alles sofort erreicht', () => {
    expect(reachedDepths(0, 900, 700, none)).toEqual([25, 50, 75, 100]);
  });
  it('Dokumenthoehe 0: nichts', () => {
    expect(reachedDepths(0, 800, 0, none)).toEqual([]);
  });
});

describe('EngagedClock', () => {
  it('zaehlt aktive Sekunden', () => {
    const c = new EngagedClock(0);
    expect(c.tick(1000, true)).toBe(true);
    expect(c.tick(2000, true)).toBe(true);
    expect(c.seconds).toBe(2);
  });
  it('zaehlt nicht bei verstecktem Tab', () => {
    const c = new EngagedClock(0);
    expect(c.tick(1000, false)).toBe(false);
    expect(c.seconds).toBe(0);
  });
  it('zaehlt nicht mehr nach 10 s ohne Interaktion, wieder nach Aktivitaet', () => {
    const c = new EngagedClock(0);
    expect(c.tick(10000, true)).toBe(true);
    expect(c.tick(11000, true)).toBe(false);
    c.activity(11500);
    expect(c.tick(12000, true)).toBe(true);
    expect(c.seconds).toBe(2);
  });
});

describe('isHeartbeat', () => {
  it('alle 15 s bis zum Maximum', () => {
    expect([14, 15, 16, 30, 45].map(isHeartbeat)).toEqual([false, true, false, true, true]);
    expect(isHeartbeat(MAX_ENGAGED_S)).toBe(true);
    expect(isHeartbeat(MAX_ENGAGED_S + 15)).toBe(false);
    expect(isHeartbeat(0)).toBe(false);
  });
});
