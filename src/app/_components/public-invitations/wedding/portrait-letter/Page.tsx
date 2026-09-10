'use client';

import type { WeddingThemeRendererProps } from '../../../weddingPageRenderers';
import WeddingBase from '../WeddingBase';

export default function PortraitLetterPage(props: WeddingThemeRendererProps) {
  return <WeddingBase {...props} theme="emotional" />;
}
