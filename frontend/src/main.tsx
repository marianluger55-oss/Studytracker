/*
 * main.tsx
 * ─────────────────────────────────────────────────────────────
 * The entry point of the React application.
 * This is the very first file that runs when the browser loads the app.
 *
 * What happens here:
 *  1. Import StrictMode — a React helper that warns about common mistakes
 *     during development (it does NOT affect the production build).
 *  2. Import createRoot — the React 18 way to attach React to the HTML page.
 *  3. Import the global CSS so styles are applied to the whole app.
 *  4. Import App — the root component that contains everything else.
 *  5. Find the <div id="root"> in index.html and render our React app into it.
 * ─────────────────────────────────────────────────────────────
 */

import { StrictMode } from 'react';           // Development helper: logs extra warnings
import { createRoot } from 'react-dom/client'; // React 18 API to mount the app
import './index.css';                          // Global styles (CSS variables, base styles)
import App from './App.tsx';                   // The root component

// 1. Find the element with id="root" in public/index.html
// 2. The "!" tells TypeScript "trust me, this element exists" (non-null assertion)
// 3. createRoot() prepares that DOM node to be managed by React
// 4. .render() inserts our entire React tree into that node
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Everything in the app lives inside <App /> */}
    <App />
  </StrictMode>,
);
