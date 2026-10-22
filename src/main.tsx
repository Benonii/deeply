import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './account';
import { App } from './platform/App';
import './engine/styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
