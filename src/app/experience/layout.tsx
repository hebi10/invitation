import type { ReactNode } from 'react';

import ExperienceAppProviders from './ExperienceAppProviders';
import ExperienceBanner from './_components/ExperienceBanner';
import ExperienceGuide from './_components/ExperienceGuide';

export default function ExperienceLayout({ children }: { children: ReactNode }) {
  return (
    <ExperienceAppProviders>
      <ExperienceBanner />
      <ExperienceGuide />
      {children}
    </ExperienceAppProviders>
  );
}
