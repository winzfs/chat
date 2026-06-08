import React from 'react';
import ReactDOM from 'react-dom/client';
import { HomeScreenNext } from './features/home/HomeScreenNext';
import './shared/styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HomeScreenNext />
  </React.StrictMode>,
);
