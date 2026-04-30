'use client';

import type { EventPageReadyState } from '../../eventPageState';
import { FirstBirthdayThemeRenderer } from './shared';

export default function FirstBirthdayPinkRenderer({
  state,
}: {
  state: EventPageReadyState;
}) {
  return <FirstBirthdayThemeRenderer state={state} theme="first-birthday-pink" />;
}
