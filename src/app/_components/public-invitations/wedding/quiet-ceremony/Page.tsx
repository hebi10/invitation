'use client';

import type { WeddingThemeRendererProps } from '../../../weddingPageRenderers';
import WeddingBase from '../WeddingBase';

export default function QuietCeremonyPage(props: WeddingThemeRendererProps) {
  return <WeddingBase {...props} theme="simple" />;
}
