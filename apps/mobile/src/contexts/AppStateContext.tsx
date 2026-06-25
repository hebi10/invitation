import type { PropsWithChildren } from 'react';

import { AuthProvider } from './AuthContext';
import { DraftsProvider } from './DraftsContext';
import { InvitationOpsProvider } from './InvitationOpsContext';
import { AppFeedbackProvider } from './AppFeedbackContext';
import { PreferencesProvider } from './PreferencesContext';

export function AppStateProvider({ children }: PropsWithChildren) {
  return (
    <PreferencesProvider>
      <AppFeedbackProvider>
        <DraftsProvider>
          <AuthProvider>
            <InvitationOpsProvider>{children}</InvitationOpsProvider>
          </AuthProvider>
        </DraftsProvider>
      </AppFeedbackProvider>
    </PreferencesProvider>
  );
}
