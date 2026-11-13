import { describe, expect, it } from 'vitest';
import { DOCTOR_DEKHO_URL } from '@/app/publicSite';
import { liveArticleUrl } from './liveUrl';

describe('liveArticleUrl', () => {
  it('opens the article on the same Doctor Dekho the rest of the app uses, with the way back to EasyHMS', () => {
    expect(liveArticleUrl('high-blood-pressure')).toBe(`${DOCTOR_DEKHO_URL}/health/conditions/high-blood-pressure?from=1hms`);
  });

  it('keeps an unusual slug safe in the address', () => {
    expect(liveArticleUrl('a b/c')).toContain('/health/conditions/a%20b%2Fc?from=1hms');
  });
});
