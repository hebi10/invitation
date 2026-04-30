import type { ComponentType } from 'react';

import type { EventPageReadyState } from '../../eventPageState';
import type { BirthdayThemeKey } from '../birthdayThemes';
import BirthdayFloralRenderer from './floral';
import BirthdayMinimalRenderer from './minimal';

export type BirthdayThemeRendererComponent = ComponentType<{
  state: EventPageReadyState;
}>;

const birthdayThemeRendererByKey = {
  'birthday-minimal': BirthdayMinimalRenderer,
  'birthday-floral': BirthdayFloralRenderer,
} satisfies Record<BirthdayThemeKey, BirthdayThemeRendererComponent>;

export function getBirthdayThemeRenderer(theme: BirthdayThemeKey) {
  return birthdayThemeRendererByKey[theme];
}
