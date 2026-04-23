import type { ComponentType } from 'react';

import type { InvitationThemeKey } from '@/lib/invitationThemes';

import type { WeddingThemeRendererProps } from '../weddingPageRenderers';
import EmotionalThemeRenderer from './emotional';
import RomanticThemeRenderer from './romantic';
import SimpleThemeRenderer from './simple';

export type WeddingThemeRendererComponent =
  ComponentType<WeddingThemeRendererProps>;

type WeddingThemeRendererRegistryEntry = {
  key: InvitationThemeKey;
  component: WeddingThemeRendererComponent;
};

export const WEDDING_THEME_RENDERER_REGISTRY = [
  {
    key: 'emotional',
    component: EmotionalThemeRenderer,
  },
  {
    key: 'romantic',
    component: RomanticThemeRenderer,
  },
  {
    key: 'simple',
    component: SimpleThemeRenderer,
  },
] as const satisfies readonly WeddingThemeRendererRegistryEntry[];

const weddingThemeRendererByKey = Object.fromEntries(
  WEDDING_THEME_RENDERER_REGISTRY.map((entry) => [entry.key, entry.component])
) as Record<InvitationThemeKey, WeddingThemeRendererComponent>;

export function getWeddingThemeRenderer(theme: InvitationThemeKey) {
  return weddingThemeRendererByKey[theme];
}
