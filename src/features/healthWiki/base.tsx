import { type ReactNode } from 'react';
import { BaseContext } from './baseContext';

// The Health Wiki pages link to each other. The real app serves them at /health-wiki; the dev-only
// preview serves the same pages at /health-wiki-preview, so the base path is a context.
export const HealthWikiBase = ({ base, children }: { base: string; children: ReactNode }) => <BaseContext.Provider value={base}>{children}</BaseContext.Provider>;
