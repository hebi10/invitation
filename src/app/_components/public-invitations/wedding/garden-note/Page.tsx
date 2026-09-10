'use client';

import type { WeddingThemeRendererProps } from '../../../weddingPageRenderers';
import WeddingBase from '../WeddingBase';

export default function GardenNotePage(props: WeddingThemeRendererProps) {
  return <WeddingBase {...props} theme="romantic" />;
}
