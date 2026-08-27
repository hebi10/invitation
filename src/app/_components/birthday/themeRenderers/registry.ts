import type { ComponentType } from 'react';

import {
  BirthdayStoryPage,
  PartyNotesPage,
} from '../../public-invitations/birthday';
import type { EventPageReadyState } from '../../eventPageState';
import type { BirthdayThemeKey } from '../birthdayThemes';

export type BirthdayThemeRendererComponent = ComponentType<{
  state: EventPageReadyState;
}>;

const birthdayThemeRendererByKey = {
  'birthday-minimal': PartyNotesPage,
  'birthday-floral': BirthdayStoryPage,
} satisfies Record<BirthdayThemeKey, BirthdayThemeRendererComponent>;

export function getBirthdayThemeRenderer(theme: BirthdayThemeKey) {
  return birthdayThemeRendererByKey[theme];
}
