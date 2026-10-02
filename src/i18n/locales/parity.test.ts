import { describe, expect, it } from 'vitest';
import en from './en.json';
import hi from './hi.json';

type Tree = { [k: string]: unknown };

const leaves = (obj: Tree, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? leaves(v as Tree, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

// Two legacy blocks cross-reference the *other* language ("clinic_hi" in EN, a Devanagari key
// with an "_en" suffix in HI). They are not user-facing strings, so they are exempt from parity.
const EXEMPT = /(_hi|_en)$|hospitalTypes\.[^.]*[^\x00-\x7F]/;

describe('i18n parity (en <-> hi)', () => {
  const enKeys = new Set(leaves(en as Tree).filter(k => !EXEMPT.test(k)));
  const hiKeys = new Set(leaves(hi as Tree).filter(k => !EXEMPT.test(k)));

  it('every English key has a Hindi translation', () => {
    const missing = [...enKeys].filter(k => !hiKeys.has(k));
    expect(missing).toEqual([]);
  });

  it('no Hindi value is empty', () => {
    const flat = (obj: Tree, prefix = ''): Array<[string, unknown]> =>
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object' ? flat(v as Tree, `${prefix}${k}.`) : [[`${prefix}${k}`, v] as [string, unknown]],
      );
    const empty = flat(hi as Tree).filter(([, v]) => typeof v === 'string' && v.trim() === '').map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('interpolation placeholders match between languages', () => {
    const get = (obj: Tree, path: string): unknown => path.split('.').reduce<unknown>((o, p) => (o as Tree | undefined)?.[p], obj);
    const placeholders = (s: unknown) => (typeof s === 'string' ? (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map(x => x.replace(/\s/g, '')).sort() : []);
    const mismatched = [...enKeys].filter(k => hiKeys.has(k) && JSON.stringify(placeholders(get(en as Tree, k))) !== JSON.stringify(placeholders(get(hi as Tree, k))));
    expect(mismatched).toEqual([]);
  });
});
