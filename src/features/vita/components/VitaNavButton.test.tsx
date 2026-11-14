import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../config', () => ({ VITA_API_URL: 'https://vita.test' }));

import { VitaNavButton } from './VitaNavButton';
import { useVitaUi } from '../store';
import { useAuthStore } from '@/store/authStore';

describe('VitaNavButton (top nav)', () => {
  beforeEach(() => {
    useVitaUi.setState({ open: false });
    useAuthStore.setState({ token: 'jwt' } as never);
  });

  it('opens and closes the Vita drawer', () => {
    render(<VitaNavButton />);
    const btn = screen.getByRole('button', { name: 'Ask Vita' });
    expect(btn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(btn);
    expect(useVitaUi.getState().open).toBe(true);
    expect(btn).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(btn);
    expect(useVitaUi.getState().open).toBe(false);
  });

  it('is hidden when nobody is signed in', () => {
    useAuthStore.setState({ token: null } as never);
    render(<VitaNavButton />);
    expect(screen.queryByRole('button', { name: 'Ask Vita' })).toBeNull();
  });

  it('remembers the open state across reloads', () => {
    useVitaUi.getState().setOpen(true);
    expect(localStorage.getItem('vita.open')).toBe('1');
    useVitaUi.getState().setOpen(false);
    expect(localStorage.getItem('vita.open')).toBe('0');
  });
});
