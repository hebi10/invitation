'use client';

import type { WeddingThemeRendererProps } from '../../../weddingPageRenderers';
import WeddingBase from '../WeddingBase';

export default function GyeolPage(props: WeddingThemeRendererProps) {
  return <WeddingBase {...props} theme="gyeol" />;
}
