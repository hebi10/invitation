import { redirect } from 'next/navigation';
import { DEMO_EXPERIENCE_DAILY_SLUG } from '@/config/demoExperienceSeeds';

export default function ExperiencePageWizardPage() {
  redirect(`/experience/page-wizard/${DEMO_EXPERIENCE_DAILY_SLUG}`);
}
