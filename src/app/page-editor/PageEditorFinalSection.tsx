import type { ChangeEvent, RefObject } from 'react';

import type { InvitationPageSeed } from '@/types/invitationPage';

import type { PageEditorUploadFieldKind } from './pageEditorClientTypes';
import { renderFieldMeta } from './pageEditorFieldMeta';
import { keywordsToText } from './pageEditorUtils';
import styles from './page.module.css';

type MetadataGroup = 'root' | 'images' | 'openGraph' | 'twitter' | 'keywords';

interface PageEditorFinalSectionProps {
  formState: InvitationPageSeed;
  isAdminLoggedIn: boolean;
  canUploadImages: boolean;
  uploadingField: PageEditorUploadFieldKind | null;
  faviconUploadInputRef: RefObject<HTMLInputElement | null>;
  onSingleImageUploadChange: (
    field: Exclude<PageEditorUploadFieldKind, 'gallery'>,
    event: ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  onTriggerImagePicker: (field: PageEditorUploadFieldKind) => void;
  onMetadataFieldChange: (
    group: MetadataGroup,
    field: string,
    value: string
  ) => void;
}

export default function PageEditorFinalSection({
  formState,
  isAdminLoggedIn,
  canUploadImages,
  uploadingField,
  faviconUploadInputRef,
  onSingleImageUploadChange,
  onTriggerImagePicker,
  onMetadataFieldChange,
}: PageEditorFinalSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>공유 정보와 최종 확인</h2>
          <p className={styles.sectionDescription}>
            손님이 링크를 받았을 때 보이는 제목과 설명을 먼저 정리한 뒤, 마지막 저장 상태를 확인해 주세요.
          </p>
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          {renderFieldMeta(
            '공유 제목',
            'required',
            '링크 공유 카드와 검색 결과에 보여줄 제목입니다.'
          )}
          <input
            className={styles.input}
            value={formState.metadata.title}
            placeholder="예: 김신랑 ♥ 나신부 결혼식에 초대합니다"
            onChange={(event) =>
              onMetadataFieldChange('root', 'title', event.target.value)
            }
          />
        </label>

        <label className={styles.field}>
          {renderFieldMeta(
            '공유 설명',
            'required',
            '공유 카드와 검색 결과 요약에 함께 쓰입니다.'
          )}
          <input
            className={styles.input}
            value={formState.metadata.description}
            placeholder="예: 2026년 4월 14일, 소중한 분들을 초대합니다."
            onChange={(event) =>
              onMetadataFieldChange('root', 'description', event.target.value)
            }
          />
        </label>

        <div className={`${styles.field} ${styles.fieldWide}`}>
          {renderFieldMeta(
            '사이트 아이콘 주소',
            'required',
            '브라우저 탭과 검색 미리보기 아이콘으로 사용됩니다.'
          )}
          <div className={styles.assetInlineActions}>
            <input
              ref={faviconUploadInputRef}
              className={styles.hiddenFileInput}
              type="file"
              accept="image/*"
              onChange={(event) => void onSingleImageUploadChange('favicon', event)}
            />
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onTriggerImagePicker('favicon')}
              disabled={!canUploadImages || uploadingField === 'favicon'}
            >
              {uploadingField === 'favicon' ? '업로드 중..' : '아이콘 업로드'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onMetadataFieldChange('images', 'favicon', '')}
              disabled={!formState.metadata.images.favicon}
            >
              비우기
            </button>
          </div>
          <div className={styles.faviconPreviewRow}>
            {formState.metadata.images.favicon ? (
              <img
                className={styles.faviconPreviewImage}
                src={formState.metadata.images.favicon}
                alt="사이트 아이콘 미리보기"
              />
            ) : (
              <div className={styles.assetPreviewPlaceholder}>
                사이트 아이콘을 업로드하면 검색/공유 미리보기에도 함께 반영됩니다.
              </div>
            )}
          </div>
          <input
            className={styles.input}
            value={formState.metadata.images.favicon}
            placeholder="예: https://.../favicon.png"
            onChange={(event) =>
              onMetadataFieldChange('images', 'favicon', event.target.value)
            }
          />
        </div>
      </div>

      {isAdminLoggedIn ? (
        <details className={styles.detailsGroup}>
          <summary className={styles.detailsSummary}>
            SNS 전용 문구와 검색 키워드 추가 설정
          </summary>
          <div className={styles.detailsBody}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                {renderFieldMeta('오픈그래프 제목', 'optional')}
                <input
                  className={styles.input}
                  value={formState.metadata.openGraph.title}
                  placeholder="예: 김신랑 ♥ 나신부 결혼식"
                  onChange={(event) =>
                    onMetadataFieldChange('openGraph', 'title', event.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                {renderFieldMeta('오픈그래프 설명', 'optional')}
                <input
                  className={styles.input}
                  value={formState.metadata.openGraph.description}
                  placeholder="예: 링크 공유 시 보여줄 설명을 입력해 주세요."
                  onChange={(event) =>
                    onMetadataFieldChange(
                      'openGraph',
                      'description',
                      event.target.value
                    )
                  }
                />
              </label>
              <label className={styles.field}>
                {renderFieldMeta('트위터 제목', 'optional')}
                <input
                  className={styles.input}
                  value={formState.metadata.twitter.title}
                  placeholder="예: 김신랑 ♥ 나신부 결혼식"
                  onChange={(event) =>
                    onMetadataFieldChange('twitter', 'title', event.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                {renderFieldMeta('트위터 설명', 'optional')}
                <input
                  className={styles.input}
                  value={formState.metadata.twitter.description}
                  placeholder="예: 트위터 공유 시 보여줄 설명을 입력해 주세요."
                  onChange={(event) =>
                    onMetadataFieldChange(
                      'twitter',
                      'description',
                      event.target.value
                    )
                  }
                />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                {renderFieldMeta('검색 키워드', 'optional', '쉼표로 구분해서 입력해 주세요.')}
                <input
                  className={styles.input}
                  value={keywordsToText(formState.metadata.keywords)}
                  onChange={(event) =>
                    onMetadataFieldChange('keywords', 'keywords', event.target.value)
                  }
                  placeholder="예: 결혼식, 모바일 청첩장, 김신랑 나신부"
                />
              </label>
            </div>
          </div>
        </details>
      ) : null}

      <div className={styles.guideListCard}>
        <strong className={styles.guideTitle}>발행 전 체크리스트</strong>
        <ul className={styles.guideBulletList}>
          <li>신랑 · 신부 이름, 날짜, 장소, 인사말이 모두 들어갔는지 확인해 주세요.</li>
          <li>대표 이미지와 공유 카드 문구가 원하는 분위기인지 미리보기로 확인해 주세요.</li>
          <li>비공개 상태에서 충분히 점검한 뒤 발행하기 버튼을 눌러 주세요.</li>
        </ul>
      </div>
    </section>
  );
}
