import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

const mockTranslateText = vi.fn();
vi.mock('@/features/prescription/services/translationApi', () => ({
  translationApi: { translateText: (...args: unknown[]) => mockTranslateText(...args) },
}));

import { FieldTranslationTool } from './FieldTranslationTool';

describe('FieldTranslationTool', () => {
  beforeEach(() => {
    mockTranslateText.mockReset();
    mockToast.mockReset();
  });

  it('translates on click and calls onTranslated with the result', async () => {
    mockTranslateText.mockResolvedValueOnce({ translatedText: 'बुखार' });
    const onTranslated = vi.fn();
    const user = userEvent.setup();

    render(<FieldTranslationTool text="fever" onTranslated={onTranslated} targetLanguage="Hindi" />);
    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(onTranslated).toHaveBeenCalledWith('बुखार'));
    expect(mockTranslateText).toHaveBeenCalledWith({ text: 'fever', targetLanguage: 'Hindi' });
  });

  it('regression guard: after a successful translation, clicking again UNDOES it -- restores the original text, not another translation', async () => {
    // This is the actual safety fix: before it, this tool overwrote the live form field with
    // no way back, and a saved prescription would permanently lose the original text.
    mockTranslateText.mockResolvedValueOnce({ translatedText: 'बुखार' });
    const onTranslated = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<FieldTranslationTool text="fever" onTranslated={onTranslated} targetLanguage="Hindi" />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(onTranslated).toHaveBeenCalledWith('बुखार'));

    // Simulate the parent form applying the translated value back into `text`, exactly as
    // EPrescriptionPad's onTranslated={(newText) => setPrescriptionData(...)} does.
    rerender(<FieldTranslationTool text="बुखार" onTranslated={onTranslated} targetLanguage="Hindi" />);

    await user.click(screen.getByRole('button'));

    expect(onTranslated).toHaveBeenLastCalledWith('fever'); // reverted, not re-translated
    expect(mockTranslateText).toHaveBeenCalledTimes(1); // undo must NOT call the API again
  });

  it('clears the undo state once the doctor edits the field after translating', async () => {
    // If the field no longer holds exactly what we translated it to, there's no safe
    // "original" left to restore -- reverting at that point would silently discard whatever
    // the doctor just typed. The button must fall back to normal "translate" behavior instead
    // of undoing to stale content.
    mockTranslateText.mockResolvedValueOnce({ translatedText: 'बुखार' });
    mockTranslateText.mockResolvedValueOnce({ translatedText: 'दूसरा अनुवाद' });
    const onTranslated = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<FieldTranslationTool text="fever" onTranslated={onTranslated} targetLanguage="Hindi" />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(onTranslated).toHaveBeenCalledWith('बुखार'));

    // Doctor manually edits the field to something else entirely -- not the translation,
    // not the original.
    rerender(<FieldTranslationTool text="high fever with chills" onTranslated={onTranslated} targetLanguage="Hindi" />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(mockTranslateText).toHaveBeenCalledTimes(2));
    expect(mockTranslateText).toHaveBeenLastCalledWith({ text: 'high fever with chills', targetLanguage: 'Hindi' });
  });

  it('shows a toast and leaves the field untouched when translation fails', async () => {
    mockTranslateText.mockRejectedValueOnce(new Error('network error'));
    const onTranslated = vi.fn();
    const user = userEvent.setup();

    render(<FieldTranslationTool text="fever" onTranslated={onTranslated} targetLanguage="Hindi" />);
    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    ));
    expect(onTranslated).not.toHaveBeenCalled();
  });

  it('does nothing for empty/whitespace-only text', async () => {
    const onTranslated = vi.fn();
    render(<FieldTranslationTool text="   " onTranslated={onTranslated} targetLanguage="Hindi" />);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
