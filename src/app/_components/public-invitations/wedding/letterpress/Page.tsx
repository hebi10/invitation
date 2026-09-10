'use client';

import type { WeddingThemeRendererProps } from '../../../weddingPageRenderers';
import WeddingBase from '../WeddingBase';

export default function LetterpressPage(props: WeddingThemeRendererProps) {
  return <WeddingBase {...props} theme="classic-r" />;
}
