import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import { App } from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Auto-recover from stale dynamic chunk imports on new deployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Preload error detected, auto-reloading to fetch latest bundle...', event);
  const lastReload = sessionStorage.getItem('last_preload_reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem('last_preload_reload', now.toString());
    window.location.reload();
  }
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);