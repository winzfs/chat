import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthSessionGate } from './features/auth/AuthSessionGate';
import { SignupGate } from './features/auth/SignupGate';
import { AccountDeletionSettingsMount } from './features/home/components/AccountDeletionSettingsMount';
import { HomeScreenNext } from './features/home/HomeScreenNext';
import { AppErrorBoundary } from './shared/components/AppErrorBoundary';
import { AppLaunchSplash } from './shared/components/AppLaunchSplash';
import './shared/styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AuthSessionGate>
        <SignupGate>
          <HomeScreenNext />
          <AccountDeletionSettingsMount />
        </SignupGate>
      </AuthSessionGate>
      <AppLaunchSplash />
    </AppErrorBoundary>
  </React.StrictMode>,
);
