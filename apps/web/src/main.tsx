import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthSessionGate } from './features/auth/AuthSessionGate';
import { SignupGate } from './features/auth/SignupGate';
import { HomeScreenNext } from './features/home/HomeScreenNext';
import { AppLaunchSplash } from './shared/components/AppLaunchSplash';
import './shared/styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthSessionGate>
      <SignupGate>
        <HomeScreenNext />
      </SignupGate>
    </AuthSessionGate>
    <AppLaunchSplash />
  </React.StrictMode>,
);
