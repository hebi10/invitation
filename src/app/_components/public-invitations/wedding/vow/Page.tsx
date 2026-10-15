'use client';

import type { WeddingThemeRendererProps } from '../../../weddingPageRenderers';
import WeddingBase from '../WeddingBase';

export default function VowPage(props: WeddingThemeRendererProps) {
  return <WeddingBase {...props} theme="vow" />;
}
