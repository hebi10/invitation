import { BulletList } from './BulletList';
import { SectionCard } from './SectionCard';

type WebPreviewNoticeProps = {
  title?: string;
  description?: string;
};

const WEB_PREVIEW_NOTICE_ITEMS = [
  'Expo 웹 빌드는 내부 QA와 UI 미리보기 용도로만 제공됩니다.',
  '웹에서는 페이지 로그인, 생성, 운영 편집 기능을 지원하지 않습니다.',
  '실제 운영은 Next 웹 편집기 또는 Expo 네이티브 앱에서 진행해 주세요.',
];

export function WebPreviewNotice({
  title = '웹 미리보기 안내',
  description = '현재 화면은 Expo 웹 빌드에서 열려 있습니다.',
}: WebPreviewNoticeProps) {
  return (
    <SectionCard title={title} description={description} badge="미리보기 전용">
      <BulletList items={WEB_PREVIEW_NOTICE_ITEMS} />
    </SectionCard>
  );
}
