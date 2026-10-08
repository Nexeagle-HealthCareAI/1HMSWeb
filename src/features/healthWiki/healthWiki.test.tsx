import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...a: unknown[]) => toast(...a), useToast: () => ({ toast }) }));

import { forceHealthWikiMock } from './api/healthWikiApi';
import { resetMockHealthWiki } from './api/mockHealthWikiApi';
import ArticleBody from './components/ArticleBody';
import ViewsChart from './components/ViewsChart';
import HealthWikiArticlePage from './pages/HealthWikiArticlePage';
import HealthWikiInboxPage from './pages/HealthWikiInboxPage';

forceHealthWikiMock();

const renderAt = (path: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/health-wiki" element={<HealthWikiInboxPage />} />
          <Route path="/health-wiki/:slug" element={<HealthWikiArticlePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => { resetMockHealthWiki(); toast.mockClear(); });

describe('Inbox', () => {
  it('shows the two badges with counts, oldest waiting first', async () => {
    renderAt('/health-wiki');
    const pending = await screen.findByRole('tab', { name: /Pending at you/ });
    expect(pending).toHaveTextContent('2');
    expect(screen.getByRole('tab', { name: /Published/ })).toHaveTextContent('1,248 views');
    const rows = within(screen.getByRole('tabpanel')).getAllByRole('button');
    expect(rows[0]).toHaveTextContent('Living with High Blood Pressure');
    expect(rows[0]).toHaveTextContent('Waiting 4 days');
    expect(rows[1]).toHaveTextContent('Waiting 1 day');
  });

  it('lists published articles by views, with views and likes', async () => {
    renderAt('/health-wiki');
    await userEvent.click(await screen.findByRole('tab', { name: /Published/ }));
    const rows = within(screen.getByRole('tabpanel')).getAllByRole('button');
    expect(rows[0]).toHaveTextContent('Understanding Type 2 Diabetes');
    expect(screen.getByLabelText('842 views and 61 likes')).toBeInTheDocument();
  });

  it('opens an article from the list', async () => {
    renderAt('/health-wiki');
    await userEvent.click(await screen.findByText('Thyroid Basics: Hypo and Hyperthyroidism'));
    expect(await screen.findByRole('heading', { level: 1, name: /Thyroid Basics/ })).toBeInTheDocument();
  });
});

describe('Review', () => {
  it('shows the article as readers see it, with the doctor named as reviewer', async () => {
    renderAt('/health-wiki/high-blood-pressure');
    expect(await screen.findByText(/Medically reviewed by/i)).toBeInTheDocument();
    const panel = screen.getByRole('complementary', { name: 'Your review' });
    expect(within(panel).getByText('Reg. 48213 · Delhi Medical Council')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Know your numbers' })).toBeInTheDocument();
  });

  it('needs the accuracy tick before it can approve, then asks to confirm', async () => {
    renderAt('/health-wiki/high-blood-pressure');
    const approve = await screen.findByRole('button', { name: 'Approve and publish' });
    expect(approve).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(approve);
    const dialog = await screen.findByRole('alertdialog', { name: 'Confirm approval' });
    expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('publishes on confirmation and the article moves to Published', async () => {
    renderAt('/health-wiki/thyroid-basics');
    await userEvent.click(await screen.findByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Approve and publish' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Publish' }));
    expect(await screen.findByRole('tab', { name: /Pending at you/ })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /Published/ })).toHaveTextContent('4');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/Published on Doctor Dekho/) }));
  });

  it('needs a real comment to request changes, and sends the article back', async () => {
    renderAt('/health-wiki/high-blood-pressure');
    await userEvent.click(await screen.findByRole('button', { name: 'Request changes' }));
    expect(await screen.findByText(/Add a short comment/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Need changes?'), 'Add when to see a doctor.');
    await userEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    expect(await screen.findByRole('tab', { name: /Pending at you/ })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /Published/ })).toHaveTextContent('3');
  });

  it('shows performance, not a decision panel, for a published article', async () => {
    renderAt('/health-wiki/diabetes-type-2');
    const panel = await screen.findByRole('complementary', { name: 'Performance' });
    expect(within(panel).getByText('842')).toBeInTheDocument();
    expect(within(panel).getByText('61')).toBeInTheDocument();
    expect(within(panel).getByRole('img', { name: /Views per day for the last 14 days/ })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Your review' })).toBeNull();
  });

  it('reports an unknown article', async () => {
    renderAt('/health-wiki/nope');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this article');
  });
});

describe('ArticleBody', () => {
  it('drops scripts, handlers and unsafe links, and demotes a level-1 heading', () => {
    const { container } = render(<ArticleBody markdown={'# Big\n\n<script>alert(1)</script>\n\n<img src="https://x.test/a.png" onerror="alert(2)">\n\n[go](javascript:alert(3))'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toMatch(/onerror/i);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Big' })).toBeInTheDocument();
    expect(screen.queryByText('go')?.closest('a')?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
  });
  it('opens outside links safely', () => {
    render(<ArticleBody markdown="[WHO](https://www.who.int)" />);
    const a = screen.getByRole('link', { name: 'WHO' });
    expect(a).toHaveAttribute('target', '_blank');
    expect(a.getAttribute('rel')).toMatch(/noopener/);
  });
});

describe('ViewsChart', () => {
  it('describes the series for screen readers and scales to the busiest day', () => {
    render(<ViewsChart values={[1, 2, 4]} />);
    expect(screen.getByRole('img')).toHaveAccessibleName('Views per day for the last 3 days, from 1 to 4');
    expect(screen.getByText('Today: 4')).toBeInTheDocument();
  });
});
