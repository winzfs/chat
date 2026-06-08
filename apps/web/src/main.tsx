import React from 'react';
import ReactDOM from 'react-dom/client';
import { LandingPage } from './features/landing/LandingPage';
import './shared/styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
);
