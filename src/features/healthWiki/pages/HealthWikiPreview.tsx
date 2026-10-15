import { Route, Routes } from 'react-router-dom';
import { forceHealthWikiMock } from '../api/healthWikiApi';
import { HealthWikiBase } from '../base';
import HealthWikiArticlePage from './HealthWikiArticlePage';
import HealthWikiInboxPage from './HealthWikiInboxPage';
import HealthWikiTopicsPage from './HealthWikiTopicsPage';

/**
 * DEV-ONLY preview of the doctor's Health Wiki screens with example data, no login needed.
 * Routed at /health-wiki-preview only under import.meta.env.DEV (see AppRoutes).
 */
forceHealthWikiMock();

export default function HealthWikiPreview() {
  return (
    <HealthWikiBase base="/health-wiki-preview">
      <Routes>
        <Route index element={<HealthWikiInboxPage />} />
        <Route path="topics" element={<HealthWikiTopicsPage />} />
        <Route path=":slug" element={<HealthWikiArticlePage />} />
      </Routes>
    </HealthWikiBase>
  );
}
