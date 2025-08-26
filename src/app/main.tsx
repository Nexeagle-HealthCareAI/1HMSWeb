import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import '../styles/index.css'

// Ensure React is available before rendering
if (typeof React === 'undefined') {
  console.error('React is not available');
  throw new Error('React is required but not loaded');
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  // Show a user-friendly error message
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h2>Application Error</h2>
      <p>Sorry, the application failed to load. Please refresh the page.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Refresh Page
      </button>
    </div>
  `;
}
