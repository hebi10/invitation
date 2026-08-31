import type { ComponentType } from 'react';

import type { InvitationThemeKey } from '@/lib/invitationThemes';

import weddingClosingStyles from '../WeddingClosing.module.css';
import {
  getWeddingThemeClosingDefinition,
  withWeddingClosing,
  type WeddingThemeRendererProps,
} from '../weddingPageRenderers';
import {
  GardenNotePage,
  GyeolPage,
  LetterpressPage,
  PortraitLetterPage,
  QuietCeremonyPage,
} from '../public-invitations/wedding';

export type WeddingThemeRendererComponent =
  ComponentType<WeddingThemeRendererProps>;

type WeddingThemeRendererRegistryEntry = {
  key: InvitationThemeKey;
  component: WeddingThemeRendererComponent;
};

export const WEDDING_THEME_RENDERER_REGISTRY = [
  {
    key: 'emotional',
    component: PortraitLetterPage,
  },
  {
    key: 'romantic',
    component: GardenNotePage,
  },
  {
    key: 'simple',
    component: QuietCeremonyPage,
  },
  {
    key: 'classic-r',
    component: LetterpressPage,
  },
  {
    key: 'gyeol',
    component: GyeolPage,
  },
] as const satisfies readonly WeddingThemeRendererRegistryEntry[];

const weddingThemeRendererByKey = Object.fromEntries(
  WEDDING_THEME_RENDERER_REGISTRY.map((entry) => {
    const closingDefinition = getWeddingThemeClosingDefinition(entry.key);

    return [
      entry.key,
      withWeddingClosing(entry.component, {
        renderClosing: closingDefinition.renderClosing,
        theme: entry.key,
        canvasClassName: weddingClosingStyles.canvas,
      }),
    ];
  })
) as Record<InvitationThemeKey, WeddingThemeRendererComponent>;

export function getWeddingThemeRenderer(theme: InvitationThemeKey) {
  return weddingThemeRendererByKey[theme];
}
