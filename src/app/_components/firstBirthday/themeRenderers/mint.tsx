'use client';

import type { EventPageReadyState } from '../../eventPageState';
import { FirstBirthdayThemeRenderer } from './shared';

export default function FirstBirthdayMintRenderer({
  state,
}: {
  state: EventPageReadyState;
}) {
  return <FirstBirthdayThemeRenderer state={state} theme="first-birthday-mint" />;
}
