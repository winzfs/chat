import React from 'react';
import ReactDOM from 'react-dom/client';
import { SignupGate } from './features/auth/SignupGate';
import { HomeScreenNext } from './features/home/HomeScreenNext';
import { AppLaunchSplash } from './shared/components/AppLaunchSplash';
import './shared/styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SignupGate>
      <HomeScreenNext />
      <AppLaunchSplash />
    </SignupGate>
  </React.StrictMode>,
);
