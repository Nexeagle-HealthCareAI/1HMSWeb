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
import HealthWikiTopicsPage from './pages/HealthWikiTopicsPage';

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

describe('Topics and writing', () => {
  const renderTopics = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/health-wiki/topics']}>
          <Routes>
            <Route path="/health-wiki" element={<HealthWikiInboxPage />} />
            <Route path="/health-wiki/topics" element={<HealthWikiTopicsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('lists the doctor\'s suggestions with what happens next', async () => {
    renderTopics();
    expect(await screen.findByText('Sleep and blood pressure')).toBeInTheDocument();
    expect(screen.getByText('Writer requested')).toBeInTheDocument();
    expect(screen.getByText('Home care for a child with fever')).toBeInTheDocument();
    expect(screen.getByText(/Which age group does this cover/)).toBeInTheDocument();
  });

  it('suggests a topic, which the team writes and the doctor reviews', async () => {
    renderTopics();
    await userEvent.click(await screen.findByRole('button', { name: 'Suggest a topic' }));
    const form = screen.getByRole('form', { name: 'Suggest a topic' });
    await userEvent.click(within(form).getByRole('button', { name: 'Send to the team' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Fill in the topic');
    await userEvent.type(within(form).getByLabelText('Topic'), 'Sodium and the heart');
    await userEvent.type(within(form).getByLabelText('What would you write about?'), 'How much salt is too much.');
    await userEvent.type(within(form).getByLabelText('Why does it matter?'), 'Patients ask.');
    expect(within(form).getByText(/The NexEagle team writes this one/)).toBeInTheDocument();
    expect(within(form).queryByRole('checkbox')).toBeNull();
    await userEvent.click(within(form).getByRole('button', { name: 'Send to the team' }));
    expect(await screen.findByText('Sodium and the heart')).toBeInTheDocument();
    expect(screen.getAllByText('Writer requested')).toHaveLength(2);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('Sent to the team') }));
  });

  it('answers a request for more detail', async () => {
    renderTopics();
    const form = await screen.findByRole('form', { name: /Add detail to Home care/ });
    await userEvent.type(within(form).getByLabelText('What would you write about?'), ' For children under 5.');
    await userEvent.click(within(form).getByRole('button', { name: 'Send the detail' }));
    await waitFor(() => expect(screen.queryByRole('form', { name: /Add detail to Home care/ })).not.toBeInTheDocument());
  });

  it('offers Write an article on the inbox, which opens Doctor Dekho signed in', async () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true });
    renderAt('/health-wiki');
    await userEvent.click(await screen.findByRole('button', { name: /Write an article/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(expect.stringContaining('/contribute/sso?code=')));
  });
});
