import type { PropsWithChildren } from 'react';

import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { AuthProvider } from './AuthContext';
import { DraftsProvider } from './DraftsContext';
import { InvitationOpsProvider } from './InvitationOpsContext';
import { AppFeedbackProvider } from './AppFeedbackContext';
import { PreferencesProvider } from './PreferencesContext';

export function AppStateProvider({ children }: PropsWithChildren) {
  return (
    <PreferencesProvider>
      <AppErrorBoundary>
        <AppFeedbackProvider>
          <DraftsProvider>
            <AuthProvider>
              <InvitationOpsProvider>{children}</InvitationOpsProvider>
            </AuthProvider>
          </DraftsProvider>
        </AppFeedbackProvider>
      </AppErrorBoundary>
    </PreferencesProvider>
  );
}
