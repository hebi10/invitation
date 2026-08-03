import type { ReactNode } from 'react';

import ExperienceAppProviders from './ExperienceAppProviders';
import ExperienceBanner from './_components/ExperienceBanner';

export default function ExperienceLayout({ children }: { children: ReactNode }) {
  return (
    <ExperienceAppProviders>
      <ExperienceBanner />
      {children}
    </ExperienceAppProviders>
  );
}
