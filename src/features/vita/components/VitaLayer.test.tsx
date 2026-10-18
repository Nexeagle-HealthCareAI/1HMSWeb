import { describe, expect, it } from 'vitest';
import React, { useState } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VitaLayer, VITA_Z } from './VitaLayer';

function Page({ kind }: { kind: 'sheet' | 'dialog' }) {
  const [open, setOpen] = useState(true);
  const Box = kind === 'sheet' ? Sheet : Dialog;
  const Content = kind === 'sheet' ? SheetContent : DialogContent;
  const Title = kind === 'sheet' ? SheetTitle : DialogTitle;
  const Desc = kind === 'sheet' ? SheetDescription : DialogDescription;
  return (
    <>
      <Box open={open} onOpenChange={setOpen}>
        <Content>
          <Title>Add Item</Title>
          <Desc>1HMS drawer</Desc>
          <input aria-label="drawer field" />
        </Content>
      </Box>
      <span data-testid="state">{open ? 'open' : 'closed'}</span>
      <VitaLayer>
        <section data-vita-ui="dock" role="dialog" aria-label="Vita assistant" style={{ zIndex: VITA_Z.dock, position: 'fixed' }}>
          <textarea aria-label="Ask Vita" />
          <div data-testid="messages" style={{ overflowY: 'auto' }}>messages</div>
          <button type="button">Send</button>
        </section>
      </VitaLayer>
    </>
  );
}

describe.each(['sheet', 'dialog'] as const)('Vita above an open 1HMS %s', (kind) => {
  it('lives on <body>, above the drawer, and stays clickable', async () => {
    render(<Page kind={kind} />);
    const dock = await screen.findByRole('dialog', { name: 'Vita assistant', hidden: true });
    const layer = dock.parentElement!;
    expect(layer.parentElement).toBe(document.body);
    expect(layer.style.pointerEvents).toBe('auto');
    expect(Number(dock.style.zIndex)).toBeGreaterThan(100); // 1HMS sheets use z-[100]
  });

  it('typing in Vita keeps focus there and does not close the drawer', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<Page kind={kind} />);
    const box = await screen.findByLabelText('Ask Vita');
    await user.click(box);
    await user.keyboard('patient kaise admit kare');
    expect(document.activeElement).toBe(box);
    expect((box as HTMLTextAreaElement).value).toBe('patient kaise admit kare');
    await user.click(screen.getByText('Send'));
    expect(screen.getByTestId('state').textContent).toBe('open');
  });

  it('Escape and scrolling inside Vita are left alone by the drawer', async () => {
    render(<Page kind={kind} />);
    const box = await screen.findByLabelText('Ask Vita');
    act(() => box.focus());
    const escapes: Event[] = [];
    const onEsc = (e: Event) => escapes.push(e);
    window.addEventListener('vita:escape', onEsc);
    fireEvent.keyDown(box, { key: 'Escape' });
    window.removeEventListener('vita:escape', onEsc);
    expect(escapes).toHaveLength(1); // the dock gets it, to close itself
    const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 40 });
    screen.getByTestId('messages').dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    expect(screen.getByTestId('state').textContent).toBe('open');
  });

  it('the drawer still works normally for 1HMS: Escape on the page closes it', async () => {
    render(<Page kind={kind} />);
    const field = await screen.findByLabelText('drawer field');
    act(() => field.focus());
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.getByTestId('state').textContent).toBe('closed');
  });
});
