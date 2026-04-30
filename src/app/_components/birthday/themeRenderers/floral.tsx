'use client';

import type { EventPageReadyState } from '../../eventPageState';
import { BirthdayThemeRenderer } from './shared';

export default function BirthdayFloralRenderer({
  state,
}: {
  state: EventPageReadyState;
}) {
  return <BirthdayThemeRenderer state={state} theme="birthday-floral" />;
}
