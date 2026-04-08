'use client';

import { useMemo } from 'react';
import type { ComponentProps, ComponentType } from 'react';

import {
  Cover,
  CoverSimple,
  Gallery,
  GallerySimple,
  GiftInfo,
  GiftInfoSimple,
  Greeting,
  GreetingSimple,
  Schedule,
  ScheduleSimple,
  WeddingCalendar,
  WeddingCalendarSimple,
} from '@/components/sections';
import {
  DEFAULT_INVITATION_THEME,
  getInvitationThemeLabel,
} from '@/lib/invitationThemes';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type { InvitationPageSeed } from '@/types/invitationPage';

import {
  getCeremonySchedule,
  createWeddingCalendarEvent,
  getCeremonyAddress,
  getCeremonyContact,
  getMapDescription,
  getReceptionSchedule,
} from '../_components/weddingPageRenderers';
import { resolveInvitationPageDataByTheme } from '@/lib/invitationThemePageData';
import styles from './page.module.css';
import {
  buildPreviewPage,
  buildWeddingDate,
  getPreviewImages,
  type PreviewThemeKey,
} from './pageEditorPreviewUtils';

export type PreviewSectionKind =
  | 'cover'
  | 'wedding'
  | 'greeting'
  | 'gallery'
  | 'gift'
  | 'metadata';

interface PageEditorSectionPreviewProps {
  section: PreviewSectionKind;
  theme: PreviewThemeKey;
  slug: string;
  formState: InvitationPageSeed;
  published: boolean;
  highlighted?: boolean;
  onRequestEdit?: () => void;
}

interface PreviewThemeProfile {
  label: string;
  surfaceClassName: string;
  calendarSeparator: string;
  CoverComponent: ComponentType<ComponentProps<typeof Cover>>;
  GreetingComponent: ComponentType<ComponentProps<typeof Greeting>>;
  GalleryComponent: ComponentType<ComponentProps<typeof Gallery>>;
  GiftInfoComponent: ComponentType<ComponentProps<typeof GiftInfo>>;
  ScheduleComponent: ComponentType<ComponentProps<typeof Schedule>>;
  CalendarComponent: ComponentType<ComponentProps<typeof WeddingCalendar>>;
}

const fallbackPreviewThemeProfile: PreviewThemeProfile = {
  label: getInvitationThemeLabel('emotional'),
  surfaceClassName: styles.previewSurfaceEmotional,
  calendarSeparator: '♡',
  CoverComponent: Cover,
  GreetingComponent: Greeting,
  GalleryComponent: Gallery,
  GiftInfoComponent: GiftInfo,
  ScheduleComponent: Schedule,
  CalendarComponent: WeddingCalendar,
};

const previewThemeProfiles: Partial<Record<PreviewThemeKey, PreviewThemeProfile>> = {
  emotional: fallbackPreviewThemeProfile,
  simple: {
    label: getInvitationThemeLabel('simple'),
    surfaceClassName: styles.previewSurfaceSimple,
    calendarSeparator: '·',
    CoverComponent: CoverSimple,
    GreetingComponent: GreetingSimple,
    GalleryComponent: GallerySimple,
    GiftInfoComponent: GiftInfoSimple,
    ScheduleComponent: ScheduleSimple,
    CalendarComponent: WeddingCalendarSimple,
  },
};

function resolvePreviewThemeProfile(theme: PreviewThemeKey) {
  const defaultProfile = previewThemeProfiles[DEFAULT_INVITATION_THEME];
  return previewThemeProfiles[theme] ?? defaultProfile ?? fallbackPreviewThemeProfile;
}

const SECTION_COPY: Record<
  PreviewSectionKind,
  { eyebrow: string; title: string; description: string }
> = {
  cover: {
    eyebrow: '표지 미리보기',
    title: '대표 제목과 첫 화면 분위기를 바로 확인할 수 있습니다.',
    description: '청첩장 이름, 대표 문구, 날짜, 장소, 대표 이미지가 즉시 반영됩니다.',
  },
  wedding: {
    eyebrow: '예식 안내 미리보기',
    title: '날짜, 시간, 장소 안내가 어떻게 보이는지 함께 확인합니다.',
    description: '예식 달력과 일정 카드, 장소 요약을 한 번에 보여줍니다.',
  },
  greeting: {
    eyebrow: '인사말 미리보기',
    title: '신랑 · 신부 소개와 인사말 문구가 그대로 반영됩니다.',
    description: '이름, 호칭, 부모님 정보와 인사말 문구가 함께 보입니다.',
  },
  gallery: {
    eyebrow: '이미지 미리보기',
    title: '대표 이미지와 갤러리 첫 화면 느낌을 확인할 수 있습니다.',
    description: '대표 이미지 주소를 바꾸면 손님이 보게 될 사진 분위기가 즉시 바뀝니다.',
  },
  gift: {
    eyebrow: '마음 전하실 곳 미리보기',
    title: '계좌 안내 영역을 실제 화면과 비슷하게 보여줍니다.',
    description: '입력한 안내 문구와 계좌 목록을 오른쪽에서 바로 확인할 수 있습니다.',
  },
  metadata: {
    eyebrow: '공유 정보 미리보기',
    title: '검색 결과와 링크 공유 카드에 어떻게 보일지 미리 확인합니다.',
    description: '공유 제목, 공유 설명, 대표 이미지가 어떻게 보일지 요약합니다.',
  },
};

function renderLocationSummary(
  venueName: string,
  address: string,
  contact?: string,
  mapDescription?: string
) {
  return (
    <div className={styles.previewDetailCard}>
      <div className={styles.previewDetailHeader}>
        <h3 className={styles.previewDetailTitle}>장소 안내 요약</h3>
        <span className={styles.metaChip}>정적 미리보기</span>
      </div>

      <div className={styles.previewDetailList}>
        <div className={styles.previewDetailItem}>
          <span className={styles.previewDetailLabel}>예식장</span>
          <strong className={styles.previewDetailValue}>
            {venueName || '예식장 이름을 입력해 주세요'}
          </strong>
        </div>
        <div className={styles.previewDetailItem}>
          <span className={styles.previewDetailLabel}>주소</span>
          <span className={styles.previewDetailValue}>
            {address || '주소를 입력해 주세요'}
          </span>
        </div>
        <div className={styles.previewDetailItem}>
          <span className={styles.previewDetailLabel}>연락처</span>
          <span className={styles.previewDetailValue}>
            {contact || '연락처를 입력해 주세요'}
          </span>
        </div>
        <div className={styles.previewDetailItem}>
          <span className={styles.previewDetailLabel}>오시는 길 문구</span>
          <span className={styles.previewDetailValue}>
            {mapDescription || '교통 안내 문구를 입력해 주세요'}
          </span>
        </div>
      </div>
    </div>
  );
}

function renderMetadataPreview(
  slug: string,
  title: string,
  description: string,
  imageUrl: string,
  faviconUrl: string,
  ogTitle: string,
  ogDescription: string,
  twitterTitle: string,
  twitterDescription: string
) {
  return (
    <div className={styles.previewMetaStack}>
      <div className={styles.previewDetailCard}>
        <div className={styles.previewDetailHeader}>
          <h3 className={styles.previewDetailTitle}>검색 결과 미리보기</h3>
          <span className={styles.metaChip}>웹 노출</span>
        </div>

        <div className={styles.previewSearchCard}>
          <div className={styles.previewSearchTop}>
            {faviconUrl ? (
              <img className={styles.previewSearchFavicon} src={faviconUrl} alt="" />
            ) : (
              <div className={styles.previewSearchFaviconPlaceholder}>W</div>
            )}
            <div className={styles.previewSearchMeta}>
              <strong className={styles.previewSearchSite}>wedding.example</strong>
              <span className={styles.previewSearchUrl}>/{slug}</span>
            </div>
          </div>
          <h4 className={styles.previewSearchTitle}>
            {title || '공유 제목을 입력해 주세요'}
          </h4>
          <p className={styles.previewSearchDescription}>
            {description || '공유 설명을 입력해 주세요'}
          </p>
        </div>
      </div>

      <div className={styles.previewDetailCard}>
        <div className={styles.previewDetailHeader}>
          <h3 className={styles.previewDetailTitle}>링크 공유 카드 미리보기</h3>
          <span className={styles.metaChip}>SNS 노출</span>
        </div>

        <div className={styles.previewSocialCard}>
          {imageUrl ? (
            <img className={styles.previewSocialImage} src={imageUrl} alt="" />
          ) : (
            <div className={styles.previewSocialImagePlaceholder}>
              대표 이미지가 여기에 표시됩니다.
            </div>
          )}
          <div className={styles.previewSocialBody}>
            <p className={styles.previewSocialLabel}>오픈그래프</p>
            <h4 className={styles.previewSocialTitle}>
              {ogTitle || title || '오픈그래프 제목을 입력해 주세요'}
            </h4>
            <p className={styles.previewSocialText}>
              {ogDescription || description || '오픈그래프 설명을 입력해 주세요'}
            </p>

            <div className={styles.previewSocialDivider} />

            <p className={styles.previewSocialLabel}>트위터</p>
            <h4 className={styles.previewSocialTitle}>
              {twitterTitle || title || '트위터 제목을 입력해 주세요'}
            </h4>
            <p className={styles.previewSocialText}>
              {twitterDescription || description || '트위터 설명을 입력해 주세요'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PageEditorSectionPreview({
  section,
  theme,
  slug,
  formState,
  published,
  highlighted = false,
  onRequestEdit,
}: PageEditorSectionPreviewProps) {
  const previewPage = useMemo(
    () => buildPreviewPage(slug, formState, published),
    [formState, published, slug]
  );
  const previewFeatures = useMemo(
    () => resolveInvitationFeatures(previewPage.productTier, previewPage.features),
    [previewPage.features, previewPage.productTier]
  );
  const previewPageData = useMemo(
    () => resolveInvitationPageDataByTheme(previewPage, theme),
    [previewPage, theme]
  );
  const weddingDate = useMemo(() => buildWeddingDate(previewPage), [previewPage]);
  const previewImages = useMemo(() => {
    const themedGallery =
      previewPageData?.galleryImages?.slice(0, previewFeatures.maxGalleryImages) ?? [];

    if (themedGallery.length > 0) {
      return themedGallery;
    }

    return getPreviewImages(previewPage);
  }, [previewFeatures.maxGalleryImages, previewPage, previewPageData?.galleryImages]);
  const groomAccounts = previewPageData?.giftInfo?.groomAccounts ?? [];
  const brideAccounts = previewPageData?.giftInfo?.brideAccounts ?? [];
  const giftMessage = previewPageData?.giftInfo?.message ?? '';
  const previewDateText = `${previewPage.date} ${
    previewPageData?.ceremonyTime ?? ''
  }`.trim();
  const sectionCopy = SECTION_COPY[section];
  const previewThemeProfile = resolvePreviewThemeProfile(theme);

  const previewContent = (() => {
    if (section === 'cover') {
      const CoverComponent = previewThemeProfile.CoverComponent;

      return (
        <CoverComponent
          title={previewPage.displayName}
          subtitle={previewPageData?.subtitle ?? ''}
          weddingDate={previewDateText}
          ceremonyTime={previewPageData?.ceremonyTime}
          venueName={previewPage.venue}
          primaryActionTargetId="page-editor-cover-preview"
          imageUrl={previewPage.metadata.images.wedding}
          brideName={previewPage.brideName}
          groomName={previewPage.groomName}
          preloadComplete
        />
      );
    }

    if (section === 'wedding') {
      const CalendarComponent = previewThemeProfile.CalendarComponent;
      const ScheduleComponent = previewThemeProfile.ScheduleComponent;

      return (
        <>
          <CalendarComponent
            title="예식 달력"
            weddingDate={weddingDate}
            currentMonth={weddingDate}
            events={[
              createWeddingCalendarEvent(
                previewPage,
                weddingDate,
                previewThemeProfile.calendarSeparator,
                previewPageData
              ),
            ]}
            showCountdown={previewFeatures.showCountdown}
            countdownTitle="결혼식까지"
          />

          <ScheduleComponent
            date={previewPage.date}
            time={previewPageData?.ceremonyTime ?? ''}
            venue={previewPage.venue}
            address={getCeremonyAddress(previewPage, previewPageData)}
            ceremony={getCeremonySchedule(previewPage, previewPageData)}
            reception={getReceptionSchedule(previewPage, previewPageData)}
            venueGuide={previewPageData?.venueGuide}
            wreathGuide={previewPageData?.wreathGuide}
          />

          {renderLocationSummary(
            previewPageData?.venueName ?? previewPage.venue,
            getCeremonyAddress(previewPage, previewPageData),
            getCeremonyContact(previewPage, previewPageData),
            getMapDescription(previewPage, previewPageData)
          )}
        </>
      );
    }

    if (section === 'greeting') {
      const GreetingComponent = previewThemeProfile.GreetingComponent;

      return (
        <GreetingComponent
          message={previewPageData?.greetingMessage ?? ''}
          author={previewPageData?.greetingAuthor ?? ''}
          groom={previewPage.couple.groom}
          bride={previewPage.couple.bride}
        />
      );
    }

    if (section === 'gallery') {
      if (previewImages.length === 0) {
        return (
          <div className={styles.emptyCard}>
            대표 이미지 주소를 입력하면 이 영역에 갤러리 분위기가 바로 표시됩니다.
          </div>
        );
      }

      const GalleryComponent = previewThemeProfile.GalleryComponent;

      return <GalleryComponent title="대표 이미지 미리보기" images={previewImages} />;
    }

    if (section === 'gift') {
      if (!(groomAccounts.length || brideAccounts.length || giftMessage.trim())) {
        return (
          <div className={styles.emptyCard}>
            계좌나 안내 문구를 입력하면 실제 노출 모습이 여기에 표시됩니다.
          </div>
        );
      }

      const GiftInfoComponent = previewThemeProfile.GiftInfoComponent;

      return (
        <GiftInfoComponent
          groomAccounts={groomAccounts}
          brideAccounts={brideAccounts}
          message={giftMessage}
        />
      );
    }

    return renderMetadataPreview(
      slug,
      previewPage.metadata.title,
      previewPage.metadata.description,
      previewPage.metadata.images.wedding,
      previewPage.metadata.images.favicon,
      previewPage.metadata.openGraph.title,
      previewPage.metadata.openGraph.description,
      previewPage.metadata.twitter.title,
      previewPage.metadata.twitter.description
    );
  })();

  return (
    <section className={styles.previewColumn}>
      <section
        className={`${styles.previewCard} ${
          highlighted ? styles.previewCardHighlighted : ''
        }`}
      >
        <div className={styles.previewHeader}>
          <div className={styles.previewIntro}>
            <p className={styles.previewEyebrow}>{sectionCopy.eyebrow}</p>
            <h2 className={styles.previewTitle}>{sectionCopy.title}</h2>
            <p className={styles.previewDescription}>{sectionCopy.description}</p>
          </div>

          <div className={styles.previewControls}>
            <span className={styles.metaChip}>
              {previewThemeProfile.label} 미리보기
            </span>
            {previewImages.length > 0 && section !== 'metadata' ? (
              <span className={styles.metaChip}>대표 이미지 반영 중</span>
            ) : null}
            {onRequestEdit ? (
              <button
                type="button"
                className={styles.previewJumpButton}
                onClick={onRequestEdit}
              >
                이 단계 수정하기
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.previewViewport}>
          <div className={`${styles.previewSurface} ${previewThemeProfile.surfaceClassName}`}>
            <div className={styles.previewFrame}>{previewContent}</div>
          </div>
        </div>
      </section>
    </section>
  );
}
