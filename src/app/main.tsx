import React from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted Inter (variable) — one consistent brand font on every OS, precached for offline.
import '@fontsource-variable/inter'
import App from './App.tsx'
import '../styles/index.css'

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
