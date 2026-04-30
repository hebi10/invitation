import type { ComponentType } from 'react';

import type { EventPageReadyState } from '../../eventPageState';
import type { FirstBirthdayThemeKey } from '../firstBirthdayThemes';
import FirstBirthdayMintRenderer from './mint';
import FirstBirthdayPinkRenderer from './pink';

export type FirstBirthdayThemeRendererComponent = ComponentType<{
  state: EventPageReadyState;
}>;

const firstBirthdayThemeRendererByKey = {
  'first-birthday-pink': FirstBirthdayPinkRenderer,
  'first-birthday-mint': FirstBirthdayMintRenderer,
} satisfies Record<FirstBirthdayThemeKey, FirstBirthdayThemeRendererComponent>;

export function getFirstBirthdayThemeRenderer(theme: FirstBirthdayThemeKey) {
  return firstBirthdayThemeRendererByKey[theme];
}
