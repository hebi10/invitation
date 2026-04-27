import type { InvitationPageSeed } from '@/types/invitationPage';

import { renderFieldMeta } from './pageEditorFieldMeta';
import styles from './page.module.css';

type TopLevelTextField = 'displayName' | 'description' | 'venue';
type PageDataTextField =
  | 'subtitle'
  | 'ceremonyTime'
  | 'ceremonyAddress'
  | 'ceremonyContact'
  | 'greetingMessage'
  | 'greetingAuthor'
  | 'mapUrl'
  | 'mapDescription'
  | 'venueName';

interface PageEditorBasicInfoSectionProps {
  formState: InvitationPageSeed;
  onTopLevelFieldChange: (field: TopLevelTextField, value: string) => void;
  onPageDataFieldChange: (field: PageDataTextField, value: string) => void;
}

export default function PageEditorBasicInfoSection({
  formState,
  onTopLevelFieldChange,
  onPageDataFieldChange,
}: PageEditorBasicInfoSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>표지에 가장 먼저 보이는 정보</h2>
          <p className={styles.sectionDescription}>
            청첩장 이름과 소개 문구는 첫 화면에서 가장 먼저 보이는 핵심 문구입니다.
          </p>
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          {renderFieldMeta(
            '청첩장 이름',
            'required',
            '신랑 · 신부 이름이 함께 보이도록 입력해 주세요.'
          )}
          <input
            className={styles.input}
            value={formState.displayName}
            placeholder="예: 김신랑 ♥ 나신부"
            onChange={(event) =>
              onTopLevelFieldChange('displayName', event.target.value)
            }
          />
        </label>

        <label className={styles.field}>
          {renderFieldMeta(
            '표지 보조 문구',
            'optional',
            '두 사람이 사랑으로 하나가 되는 날 같은 짧은 문구를 넣을 수 있습니다.'
          )}
          <input
            className={styles.input}
            value={formState.pageData?.subtitle ?? ''}
            placeholder="예: 두 사람이 사랑으로 하나가 되는 날"
            onChange={(event) =>
              onPageDataFieldChange('subtitle', event.target.value)
            }
          />
        </label>

        <label className={`${styles.field} ${styles.fieldWide}`}>
          {renderFieldMeta(
            '소개 문구',
            'required',
            '검색 결과와 첫 화면 소개에 함께 쓰이는 문구입니다.'
          )}
          <textarea
            className={styles.textarea}
            value={formState.description}
            placeholder="예: 사랑으로 하나가 되는 날, 소중한 분들을 초대합니다."
            onChange={(event) =>
              onTopLevelFieldChange('description', event.target.value)
            }
          />
        </label>
      </div>
    </section>
  );
}
