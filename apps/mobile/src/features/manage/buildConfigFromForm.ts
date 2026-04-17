import type {
  MobileInvitationDashboard,
  MobileInvitationGiftInfo,
  MobileInvitationKakaoMapData,
  MobileInvitationMetadata,
  MobileInvitationMetadataImages,
  MobileInvitationPageData,
  MobileInvitationSeed,
} from '../../types/mobileInvitation';

import {
  DEFAULT_MUSIC_VOLUME,
  buildKakaoMapPinUrl,
  buildKakaoMapSearchUrl,
  clampNumber,
  hasValidCoordinates,
  isTemporaryImagePreviewUrl,
  parseAccountsText,
  parseGuidesText,
  parseOptionalNumber,
  readRecord,
  type ManageFormState,
} from './shared';

type BuildConfigFromFormInput = {
  dashboard: MobileInvitationDashboard;
  form: ManageFormState;
};

export function buildConfigFromForm({
  dashboard,
  form,
}: BuildConfigFromFormInput): MobileInvitationSeed {
  const groomName = form.groom.name.trim();
  const brideName = form.bride.name.trim();
  const maxGalleryImages = dashboard.page.features.maxGalleryImages;
  const nextGalleryImages = form.galleryImages.slice(0, maxGalleryImages);
  const nextGalleryThumbnailUrls = nextGalleryImages.map(
    (imageUrl, index) => {
      const thumbnailUrl = form.galleryImageThumbnailUrls[index]?.trim() || imageUrl;
      return isTemporaryImagePreviewUrl(thumbnailUrl) ? imageUrl : thumbnailUrl;
    }
  );
  const nextGroomAccounts = parseAccountsText(form.groomAccountsText, 3);
  const nextBrideAccounts = parseAccountsText(form.brideAccountsText, 3);
  const nextVenueGuide = parseGuidesText(form.venueGuideText, 3);
  const nextWreathGuide = parseGuidesText(form.wreathGuideText, 3);

  const existingPageData = readRecord<MobileInvitationPageData>(
    dashboard.page.config.pageData
  );
  const existingCeremony = readRecord<NonNullable<MobileInvitationPageData['ceremony']>>(
    existingPageData.ceremony
  );
  const existingReception = readRecord<NonNullable<MobileInvitationPageData['reception']>>(
    existingPageData.reception
  );
  const existingKakaoMap = readRecord<MobileInvitationKakaoMapData>(
    existingPageData.kakaoMap
  );
  const existingGiftInfo = readRecord<MobileInvitationGiftInfo>(existingPageData.giftInfo);
  const existingPageDataGroom = readRecord<NonNullable<MobileInvitationPageData['groom']>>(
    existingPageData.groom
  );
  const existingPageDataBride = readRecord<NonNullable<MobileInvitationPageData['bride']>>(
    existingPageData.bride
  );
  const existingMetadata = readRecord<MobileInvitationMetadata>(
    dashboard.page.config.metadata
  );
  const existingMetadataImages = readRecord<MobileInvitationMetadataImages>(
    existingMetadata.images
  );
  const existingOpenGraph = readRecord<NonNullable<MobileInvitationMetadata['openGraph']>>(
    existingMetadata.openGraph
  );
  const existingTwitter = readRecord<NonNullable<MobileInvitationMetadata['twitter']>>(
    existingMetadata.twitter
  );

  const nextLatitude = parseOptionalNumber(form.kakaoLatitude) ?? 0;
  const nextLongitude = parseOptionalNumber(form.kakaoLongitude) ?? 0;
  const nextKakaoLevel = Math.max(
    1,
    Math.min(
      14,
      Math.round(
        parseOptionalNumber(form.kakaoLevel) ??
          (typeof existingKakaoMap.level === 'number' &&
          Number.isFinite(existingKakaoMap.level)
            ? existingKakaoMap.level
            : 3)
      )
    )
  );

  const existingMusicVolume =
    typeof dashboard.page.config.musicVolume === 'number' &&
    Number.isFinite(dashboard.page.config.musicVolume)
      ? dashboard.page.config.musicVolume
      : DEFAULT_MUSIC_VOLUME;

  const normalizedMusicVolume = clampNumber(
    parseOptionalNumber(form.musicVolume),
    0,
    1,
    existingMusicVolume
  );

  const ceremonyTime = form.ceremonyTime.trim() || form.date.trim();
  const resolvedMarkerTitle =
    form.kakaoMarkerTitle.trim() || form.venue.trim() || form.ceremonyAddress.trim();
  const resolvedMapUrl = hasValidCoordinates(nextLatitude, nextLongitude)
    ? buildKakaoMapPinUrl(
        resolvedMarkerTitle || '선택한 위치',
        nextLatitude,
        nextLongitude
      )
    : form.ceremonyAddress.trim()
      ? buildKakaoMapSearchUrl(form.ceremonyAddress.trim())
      : form.mapUrl.trim();

  const nextConfig: MobileInvitationSeed = {
    ...dashboard.page.config,
    displayName: form.displayName.trim(),
    description: form.description.trim(),
    date: form.date.trim(),
    venue: form.venue.trim(),
    groomName,
    brideName,
    musicEnabled: dashboard.page.features.showMusic ? form.musicEnabled : false,
    musicCategoryId: dashboard.page.features.showMusic ? form.musicCategoryId.trim() : '',
    musicTrackId: dashboard.page.features.showMusic ? form.musicTrackId.trim() : '',
    musicStoragePath: dashboard.page.features.showMusic
      ? form.musicStoragePath.trim()
      : '',
    musicVolume: dashboard.page.features.showMusic
      ? normalizedMusicVolume
      : existingMusicVolume,
    couple: {
      ...dashboard.page.config.couple,
      groom: {
        ...dashboard.page.config.couple.groom,
        name: groomName,
        order: form.groom.order.trim(),
        phone: form.groom.phone.trim(),
        father: {
          ...(dashboard.page.config.couple.groom.father ?? {}),
          relation: form.groom.father.relation.trim(),
          name: form.groom.father.name.trim(),
          phone: form.groom.father.phone.trim(),
        },
        mother: {
          ...(dashboard.page.config.couple.groom.mother ?? {}),
          relation: form.groom.mother.relation.trim(),
          name: form.groom.mother.name.trim(),
          phone: form.groom.mother.phone.trim(),
        },
      },
      bride: {
        ...dashboard.page.config.couple.bride,
        name: brideName,
        order: form.bride.order.trim(),
        phone: form.bride.phone.trim(),
        father: {
          ...(dashboard.page.config.couple.bride.father ?? {}),
          relation: form.bride.father.relation.trim(),
          name: form.bride.father.name.trim(),
          phone: form.bride.father.phone.trim(),
        },
        mother: {
          ...(dashboard.page.config.couple.bride.mother ?? {}),
          relation: form.bride.mother.relation.trim(),
          name: form.bride.mother.name.trim(),
          phone: form.bride.mother.phone.trim(),
        },
      },
    },
    pageData: {
      ...existingPageData,
      subtitle: form.subtitle.trim(),
      venueName: form.venue.trim(),
      ceremonyAddress: form.ceremonyAddress.trim(),
      ceremonyContact: form.ceremonyContact.trim(),
      ceremonyTime,
      ceremony: {
        ...existingCeremony,
        time: ceremonyTime,
        location: form.ceremonyLocation.trim(),
      },
      reception: {
        ...existingReception,
        time: form.receptionTime.trim(),
        location: form.receptionLocation.trim(),
      },
      mapDescription: form.mapDescription.trim(),
      mapUrl: resolvedMapUrl,
      kakaoMap: {
        ...existingKakaoMap,
        latitude: nextLatitude,
        longitude: nextLongitude,
        level: nextKakaoLevel,
        markerTitle: resolvedMarkerTitle,
      },
      greetingMessage: form.greetingMessage.trim(),
      greetingAuthor: form.greetingAuthor.trim(),
      galleryImages: nextGalleryImages,
      coverImageThumbnailUrl: isTemporaryImagePreviewUrl(form.coverImageThumbnailUrl)
        ? form.coverImageUrl.trim()
        : form.coverImageThumbnailUrl.trim(),
      galleryImageThumbnailUrls: nextGalleryThumbnailUrls,
      venueGuide: nextVenueGuide,
      wreathGuide: nextWreathGuide,
      giftInfo: {
        ...existingGiftInfo,
        message: form.giftMessage.trim(),
        groomAccounts: nextGroomAccounts,
        brideAccounts: nextBrideAccounts,
      },
      groom: {
        ...existingPageDataGroom,
        ...dashboard.page.config.couple.groom,
        name: groomName,
        order: form.groom.order.trim(),
        phone: form.groom.phone.trim(),
      },
      bride: {
        ...existingPageDataBride,
        ...dashboard.page.config.couple.bride,
        name: brideName,
        order: form.bride.order.trim(),
        phone: form.bride.phone.trim(),
      },
    },
  };

  nextConfig.metadata = {
    ...existingMetadata,
    title: form.shareTitle.trim(),
    description: form.shareDescription.trim(),
    images: {
      ...existingMetadataImages,
      wedding: form.coverImageUrl.trim(),
    },
    openGraph: {
      ...existingOpenGraph,
      title: form.shareTitle.trim(),
      description: form.shareDescription.trim(),
    },
    twitter: {
      ...existingTwitter,
      title: form.shareTitle.trim(),
      description: form.shareDescription.trim(),
    },
  };

  return nextConfig;
}
