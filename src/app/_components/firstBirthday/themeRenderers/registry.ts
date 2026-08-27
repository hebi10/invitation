import type { ComponentType } from 'react';

import {
  DawnChapterPage,
  FirstChapterPage,
} from '../../public-invitations/first-birthday';
import type { EventPageReadyState } from '../../eventPageState';
import type { FirstBirthdayThemeKey } from '../firstBirthdayThemes';

export type FirstBirthdayThemeRendererComponent = ComponentType<{
  state: EventPageReadyState;
}>;

const firstBirthdayThemeRendererByKey = {
  'first-birthday-pink': FirstChapterPage,
  'first-birthday-mint': DawnChapterPage,
} satisfies Record<FirstBirthdayThemeKey, FirstBirthdayThemeRendererComponent>;

export function getFirstBirthdayThemeRenderer(theme: FirstBirthdayThemeKey) {
  return firstBirthdayThemeRendererByKey[theme];
}
