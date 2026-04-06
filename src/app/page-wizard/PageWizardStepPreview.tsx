import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type {
  InvitationPageSeed,
  InvitationThemeKey,
} from '@/types/invitationPage';

import styles from './page.module.css';
import {
  buildWeddingDateObject,
  composeDisplayName,
  formatDateLabel,
  formatTimeLabel,
  hasText,
  type StepValidation,
  type WizardStepDefinition,
  type WizardStepKey,
} from './pageWizardData';
import { getProductTierLabel, getThemeLabel } from './pageWizardShared';

type WizardReviewItem = {
  step: WizardStepDefinition;
  validation: StepValidation;
};

interface PageWizardStepPreviewProps {
  stepKey: WizardStepKey;
  theme: InvitationThemeKey;
  slug: string;
  formState: InvitationPageSeed;
  published: boolean;
  reviewSummary?: WizardReviewItem[];
}

function getFilledGuideCount(
  items?: Array<{
    title: string;
    content: string;
  }>
) {
  return (items ?? []).filter((item) => hasText(item.title) || hasText(item.content)).length;
}

function getFilledAccountCount(
  accounts?: Array<{
    bank: string;
    accountNumber: string;
    accountHolder: string;
  }>
) {
  return (accounts ?? []).filter(
    (account) =>
      hasText(account.bank) || hasText(account.accountNumber) || hasText(account.accountHolder)
  ).length;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.previewRow}>
      <span className={styles.previewLabel}>{label}</span>
      <span className={styles.previewValue}>{value}</span>
    </div>
  );
}

export default function PageWizardStepPreview({
  stepKey,
  theme,
  slug,
  formState,
  published,
  reviewSummary = [],
}: PageWizardStepPreviewProps) {
  const features = resolveInvitationFeatures(formState.productTier, formState.features);
  const weddingDate = buildWeddingDateObject(formState);
  const displayName =
    formState.displayName.trim() ||
    composeDisplayName(formState.couple.groom.name, formState.couple.bride.name);
  const subtitle = formState.pageData?.subtitle?.trim() || '표지 보조 문구를 아직 입력하지 않았습니다.';
  const venueName = formState.pageData?.venueName?.trim() || formState.venue.trim() || '예식장명을 입력해 주세요.';
  const venueAddress = formState.pageData?.ceremonyAddress?.trim() || '주소를 입력해 주세요.';
  const greetingMessage =
    formState.pageData?.greetingMessage?.trim() || '인사말을 아직 입력하지 않았습니다.';
  const coverImage = formState.metadata.images.wedding?.trim();
  const galleryImages = (formState.pageData?.galleryImages ?? []).filter((imageUrl) =>
    hasText(imageUrl)
  );
  const groomAccounts = getFilledAccountCount(formState.pageData?.giftInfo?.groomAccounts);
  const brideAccounts = getFilledAccountCount(formState.pageData?.giftInfo?.brideAccounts);
  const venueGuideCount = getFilledGuideCount(formState.pageData?.venueGuide);
  const wreathGuideCount = getFilledGuideCount(formState.pageData?.wreathGuide);
  const invalidItems = reviewSummary.filter((item) => !item.validation.valid);

  if (stepKey === 'theme') {
    return (
      <section className={styles.previewSummary}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>선택한 구성</h3>
          <div className={styles.previewPillRow}>
            <span className={styles.previewPill}>{getThemeLabel(theme)}</span>
            <span className={styles.previewPill}>{getProductTierLabel(formState.productTier ?? 'premium')}</span>
          </div>
        </div>
        <div className={styles.previewKeyList}>
          <PreviewRow label="갤러리" value={`최대 ${features.maxGalleryImages}장`} />
          <PreviewRow
            label="공유 방식"
            value={features.shareMode === 'card' ? '카카오 카드형 공유' : '카카오 링크형 공유'}
          />
          <PreviewRow
            label="캘린더 카운트다운"
            value={features.showCountdown ? '사용 가능' : '포함되지 않음'}
          />
          <PreviewRow
            label="방명록"
            value={features.showGuestbook ? '사용 가능' : '포함되지 않음'}
          />
        </div>
      </section>
    );
  }

  if (stepKey === 'slug') {
    return (
      <section className={styles.previewSummary}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>최종 주소 미리보기</h3>
          <span className={styles.previewCaption}>공개 후 이 주소로 접속합니다.</span>
        </div>
        <div className={styles.previewUrlCard}>
          <span className={styles.previewUrlValue}>https://msgnote.kr/{slug}</span>
        </div>
      </section>
    );
  }

  if (stepKey === 'basic') {
    return (
      <section className={styles.previewSummary}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>표지 요약</h3>
          <span className={styles.previewCaption}>첫 화면에 보이는 정보입니다.</span>
        </div>
        <div className={styles.previewHeroCard}>
          <span className={styles.previewHeroLabel}>표지 제목</span>
          <strong className={styles.previewHeroTitle}>{displayName}</strong>
          <p className={styles.previewHeroSubtitle}>{subtitle}</p>
          <div className={styles.previewPillRow}>
            <span className={styles.previewPill}>
              신랑 {formState.couple.groom.name.trim() || '미입력'}
            </span>
            <span className={styles.previewPill}>
              신부 {formState.couple.bride.name.trim() || '미입력'}
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (stepKey === 'schedule') {
    return (
      <section className={styles.previewSummary}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>예식 일정 요약</h3>
          <span className={styles.previewCaption}>달력 섹션과 일정 카드에 반영됩니다.</span>
        </div>
        <div className={styles.previewKeyList}>
          <PreviewRow
            label="예식 일시"
            value={
              weddingDate
                ? `${formatDateLabel(weddingDate)} ${formatTimeLabel(weddingDate)}`
                : '날짜와 시간을 입력해 주세요.'
            }
          />
          <PreviewRow
            label="일정 카드 문구"
            value={formState.pageData?.ceremonyTime?.trim() || '시간 문구가 자동으로 들어갑니다.'}
          />
        </div>
      </section>
    );
  }

  if (stepKey === 'venue') {
    return (
      <section className={styles.previewSummary}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>예식장 안내 요약</h3>
          <span className={styles.previewCaption}>오시는 길 섹션에 노출됩니다.</span>
        </div>
        <div className={styles.previewKeyList}>
          <PreviewRow label="예식장명" value={venueName} />
          <PreviewRow label="주소" value={venueAddress} />
          <PreviewRow
            label="연락처"
            value={formState.pageData?.ceremonyContact?.trim() || '연락처를 입력하지 않았습니다.'}
          />
          <PreviewRow
            label="지도 링크"
            value={
              formState.pageData?.mapUrl?.trim()
                ? '지도 링크가 연결되었습니다.'
                : '지도 링크를 아직 입력하지 않았습니다.'
            }
          />
        </div>
      </section>
    );
  }

  if (stepKey === 'greeting') {
    return (
      <section className={styles.previewSummary}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>인사말 요약</h3>
          <span className={styles.previewCaption}>인사말 섹션과 연락 정보에 반영됩니다.</span>
        </div>
        <div className={styles.previewQuoteCard}>
          <p className={styles.previewQuoteText}>
            {greetingMessage.length > 140 ? `${greetingMessage.slice(0, 140)}…` : greetingMessage}
          </p>
          <span className={styles.previewQuoteAuthor}>
            {formState.pageData?.greetingAuthor?.trim() || '인사말 서명을 아직 입력하지 않았습니다.'}
          </span>
        </div>
      </section>
    );
  }

  if (stepKey === 'images') {
    return (
      <section className={styles.previewSummary}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>사진 요약</h3>
          <span className={styles.previewCaption}>대표 이미지와 갤러리 구성을 빠르게 확인합니다.</span>
        </div>
        <div className={styles.previewImageCard}>
          {coverImage ? (
            <img className={styles.previewThumbnail} src={coverImage} alt="대표 이미지 미리보기" />
          ) : (
            <div className={styles.previewThumbnailEmpty}>대표 이미지를 아직 등록하지 않았습니다.</div>
          )}
          <div className={styles.previewKeyList}>
            <PreviewRow label="대표 이미지" value={coverImage ? '등록됨' : '미등록'} />
            <PreviewRow label="갤러리 이미지" value={`${galleryImages.length}장`} />
            <PreviewRow label="허용 장수" value={`최대 ${features.maxGalleryImages}장`} />
          </div>
        </div>
      </section>
    );
  }

  if (stepKey === 'extra') {
    return (
      <section className={styles.previewSummary}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>추가 안내 요약</h3>
          <span className={styles.previewCaption}>선택한 안내 항목만 공개 페이지에 노출됩니다.</span>
        </div>
        <div className={styles.previewKeyList}>
          <PreviewRow label="신랑측 계좌" value={`${groomAccounts}개`} />
          <PreviewRow label="신부측 계좌" value={`${brideAccounts}개`} />
          <PreviewRow label="예식장 안내" value={`${venueGuideCount}개`} />
          <PreviewRow label="화환 안내" value={`${wreathGuideCount}개`} />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.previewSummary}>
      <div className={styles.previewHeader}>
        <h3 className={styles.previewTitle}>최종 확인</h3>
        <span className={styles.previewCaption}>공개 상태와 공유 정보를 확인합니다.</span>
      </div>
      <div className={styles.previewKeyList}>
        <PreviewRow label="공개 상태" value={published ? '저장 후 바로 공개' : '비공개 초안'} />
        <PreviewRow
          label="브라우저 제목"
          value={formState.metadata.title.trim() || displayName || '자동 제목 사용'}
        />
        <PreviewRow
          label="공유 설명"
          value={
            formState.metadata.description.trim() ||
            formState.description.trim() ||
            '설명을 입력하지 않았습니다.'
          }
        />
      </div>
      {invalidItems.length > 0 ? (
        <div className={styles.previewValidationCard}>
          <strong className={styles.previewValidationTitle}>입력이 필요한 단계</strong>
          <ul className={styles.previewValidationList}>
            {invalidItems.map((item) => (
              <li key={`preview-invalid-${item.step.key}`}>
                <span>{item.step.number}</span>
                <span>{item.validation.messages[0] ?? `${item.step.title} 내용을 확인해 주세요.`}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={styles.previewSuccessCard}>모든 필수 입력을 완료했습니다.</div>
      )}
    </section>
  );
}
