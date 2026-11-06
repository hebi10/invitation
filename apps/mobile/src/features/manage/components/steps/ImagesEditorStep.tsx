import { memo } from 'react';
import { Image as ExpoImage } from 'expo-image';
import {
  Image as NativeImage,
  type ImageStyle,
  type StyleProp,
  View,
} from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
import { Disclosure } from '../../../../components/Disclosure';
import { AppText } from '../../../../components/AppText';
import { SectionCard } from '../../../../components/SectionCard';
import { useVisualPreferences } from '../../../../contexts/PreferencesContext';
import type { ImageUploadProgressState } from '../../hooks/useImageUpload';
import {
  isTemporaryImagePreviewUrl,
  type EditableImageAssetKind,
  type ManageGalleryPreviewItem,
} from '../../shared';
import { manageStyles } from '../../manageStyles';

type ImagesEditorStepProps = {
  coverPreviewUrl: string;
  sharePreviewUrl: string;
  kakaoCardPreviewUrl: string;
  galleryPreviewItems: ManageGalleryPreviewItem[];
  maxGalleryImageCount: number;
  uploadingImageKind: EditableImageAssetKind | null;
  uploadProgress: ImageUploadProgressState | null;
  onUploadImage: (assetKind: EditableImageAssetKind) => void | Promise<void>;
  onRemoveSingleImage: (assetKind: 'cover' | 'share-preview' | 'kakao-card') => void;
  onMoveGalleryImage: (index: number, direction: 'up' | 'down') => void;
  onRemoveGalleryImage: (index: number) => void;
};

type GalleryPreviewCardProps = {
  image: ManageGalleryPreviewItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveGalleryImage: (index: number, direction: 'up' | 'down') => void;
  onRemoveGalleryImage: (index: number) => void;
};

type PreviewImageProps = {
  uri: string;
  alt: string;
  style: StyleProp<ImageStyle>;
  fit?: 'cover' | 'contain';
};

type SingleImageCardProps = {
  title: string;
  description: string;
  previewUrl: string;
  assetKind: 'cover' | 'share-preview' | 'kakao-card';
  uploadingImageKind: EditableImageAssetKind | null;
  onUploadImage: (assetKind: EditableImageAssetKind) => void | Promise<void>;
  onRemoveSingleImage: (assetKind: 'cover' | 'share-preview' | 'kakao-card') => void;
};

const IMAGE_CACHE_POLICY = 'memory-disk' as const;

function PreviewImage({ uri, alt, style, fit = 'cover' }: PreviewImageProps) {
  const normalizedUri = uri.trim().toLowerCase();
  const shouldUseExpoImage =
    normalizedUri.startsWith('ph://') ||
    normalizedUri.startsWith('assets-library://') ||
    !isTemporaryImagePreviewUrl(uri);

  if (!shouldUseExpoImage) {
    return (
      <NativeImage
        key={uri}
        source={{ uri }}
        accessibilityLabel={alt}
        style={style}
        resizeMode={fit}
      />
    );
  }

  return (
    <ExpoImage
      key={uri}
      source={{ uri }}
      alt={alt}
      accessibilityLabel={alt}
      style={style}
      contentFit={fit}
      cachePolicy={IMAGE_CACHE_POLICY}
      transition={120}
    />
  );
}

function getUploadProgressLabel(assetKind: EditableImageAssetKind) {
  switch (assetKind) {
    case 'cover':
      return '대표 이미지 업로드 중';
    case 'share-preview':
      return '공유 미리보기 이미지 업로드 중';
    case 'kakao-card':
      return '카카오 카드 이미지 업로드 중';
    case 'gallery':
    default:
      return '갤러리 이미지 업로드 중';
  }
}

function SingleImageCard({
  title,
  description,
  previewUrl,
  assetKind,
  uploadingImageKind,
  onUploadImage,
  onRemoveSingleImage,
}: SingleImageCardProps) {
  const { palette } = useVisualPreferences();

  return (
    <SectionCard title={title} description={description}
      badge={previewUrl ? '등록됨' : '미등록'}
      badgeTone={previewUrl ? 'success' : 'neutral'}>
      {previewUrl ? (
        <View
          style={[
            manageStyles.previewFrame,
            assetKind === 'cover' ? manageStyles.coverPreviewFrame : manageStyles.sharePreviewFrame,
            {
              backgroundColor: palette.surface,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <PreviewImage
            uri={previewUrl}
            alt={`${title} 미리보기`}
            style={manageStyles.coverPreviewImage}
            fit="contain"
          />
        </View>
      ) : (
        <View
          style={[
            manageStyles.emptyImageState,
            {
              backgroundColor: palette.surfaceMuted,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <AppText variant="muted" style={manageStyles.helperText}>
            사진을 등록하면 여기에서 미리 볼 수 있습니다.
          </AppText>
        </View>
      )}
      <View style={manageStyles.actionRow}>
        <ActionButton
          variant="secondary"
          onPress={() => void onUploadImage(assetKind)}
          loading={uploadingImageKind === assetKind}
          style={manageStyles.imageAction}
        >
          {previewUrl ? '사진 교체' : '사진 등록'}
        </ActionButton>
        <ActionButton
          variant={previewUrl ? 'danger' : 'secondary'}
          onPress={() => onRemoveSingleImage(assetKind)}
          disabled={!previewUrl}
          style={manageStyles.imageAction}
        >
          이미지 제거
        </ActionButton>
      </View>
    </SectionCard>
  );
}

const GalleryPreviewCard = memo(function GalleryPreviewCard({
  image,
  index,
  isFirst,
  isLast,
  onMoveGalleryImage,
  onRemoveGalleryImage,
}: GalleryPreviewCardProps) {
  const { palette } = useVisualPreferences();

  return (
    <View style={[manageStyles.galleryCard, {
      backgroundColor: palette.surface,
      borderColor: palette.cardBorder,
    }]}>
      <View style={[
        manageStyles.previewFrame,
        manageStyles.galleryPreviewFrame,
        { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder },
      ]}>
        <PreviewImage
          uri={image.previewUrl}
          alt={`갤러리 이미지 ${index + 1}번 미리보기`}
          style={manageStyles.galleryPreviewImage}
          fit="contain"
        />
      </View>
      <View style={manageStyles.galleryCardBody}>
        <View style={manageStyles.galleryCardCopy}>
          <AppText style={manageStyles.galleryCardTitle}>사진 {index + 1}</AppText>
          <AppText variant="caption" color={palette.textMuted} style={manageStyles.galleryCardMeta}>
            청첩장에 표시되는 순서입니다.
          </AppText>
        </View>
        <View style={manageStyles.galleryCardActions}>
          <ActionButton variant="secondary" onPress={() => onMoveGalleryImage(index, 'up')}
            disabled={isFirst} style={manageStyles.galleryAction}>앞으로</ActionButton>
          <ActionButton variant="secondary" onPress={() => onMoveGalleryImage(index, 'down')}
            disabled={isLast} style={manageStyles.galleryAction}>뒤로</ActionButton>
          <ActionButton variant="danger" onPress={() => onRemoveGalleryImage(index)}
            style={manageStyles.galleryAction}>제거</ActionButton>
        </View>
      </View>
    </View>
  );
});

export function ImagesEditorStep({
  coverPreviewUrl,
  sharePreviewUrl,
  kakaoCardPreviewUrl,
  galleryPreviewItems,
  maxGalleryImageCount,
  uploadingImageKind,
  uploadProgress,
  onUploadImage,
  onRemoveSingleImage,
  onMoveGalleryImage,
  onRemoveGalleryImage,
}: ImagesEditorStepProps) {
  const { palette } = useVisualPreferences();

  return (
    <>
      {uploadProgress ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            manageStyles.uploadProgressCard,
            {
              backgroundColor: palette.noticeSoft,
              borderColor: palette.notice,
            },
          ]}
        >
          <AppText color={palette.notice} style={manageStyles.uploadProgressTitle}>
            {getUploadProgressLabel(uploadProgress.assetKind)}
          </AppText>
          <AppText variant="caption" color={palette.notice} style={manageStyles.helperText}>
            총 {uploadProgress.totalCount}장 중 {uploadProgress.completedCount}장 완료
          </AppText>
          <AppText variant="muted" style={manageStyles.helperText}>
            현재 {Math.min(uploadProgress.currentIndex, uploadProgress.totalCount)} /{' '}
            {uploadProgress.totalCount} 처리 중
          </AppText>
        </View>
      ) : null}

      <SingleImageCard
        title="대표 이미지"
        description="청첩장을 열었을 때 가장 먼저 보이는 사진입니다."
        previewUrl={coverPreviewUrl}
        assetKind="cover"
        uploadingImageKind={uploadingImageKind}
        onUploadImage={onUploadImage}
        onRemoveSingleImage={onRemoveSingleImage}
      />

      <Disclosure
        title="공유용 이미지 (선택)"
        description="링크 미리보기와 카카오톡 공유 카드에 별도 사진을 사용하려면 펼쳐 주세요."
        defaultExpanded={Boolean(sharePreviewUrl || kakaoCardPreviewUrl)}
      >
        <SingleImageCard
          title="링크 미리보기 사진"
          description="메신저로 청첩장 링크를 보낼 때 미리 보이는 사진입니다."
          previewUrl={sharePreviewUrl}
          assetKind="share-preview"
          uploadingImageKind={uploadingImageKind}
          onUploadImage={onUploadImage}
          onRemoveSingleImage={onRemoveSingleImage}
        />
        <SingleImageCard
          title="카카오톡 공유 카드 사진"
          description="카카오톡 카드형 공유에 사용할 사진입니다."
          previewUrl={kakaoCardPreviewUrl}
          assetKind="kakao-card"
          uploadingImageKind={uploadingImageKind}
          onUploadImage={onUploadImage}
          onRemoveSingleImage={onRemoveSingleImage}
        />
      </Disclosure>

      <SectionCard
        title={`갤러리 사진 (${galleryPreviewItems.length}/${maxGalleryImageCount})`}
        description="여러 장의 사진을 등록하고, 하객에게 보여줄 순서를 조정해 주세요."
      >
        <View style={manageStyles.actionRow}>
          <ActionButton
            variant="secondary"
            onPress={() => void onUploadImage('gallery')}
            loading={uploadingImageKind === 'gallery'}
            disabled={galleryPreviewItems.length >= maxGalleryImageCount}
            style={manageStyles.imageAction}
          >
            갤러리 사진 추가
          </ActionButton>
        </View>
        {galleryPreviewItems.length ? (
          <View style={manageStyles.galleryList}>
            {galleryPreviewItems.map((image, index) => (
              <GalleryPreviewCard
                key={image.id}
                image={image}
                index={index}
                isFirst={index === 0}
                isLast={index === galleryPreviewItems.length - 1}
                onMoveGalleryImage={onMoveGalleryImage}
                onRemoveGalleryImage={onRemoveGalleryImage}
              />
            ))}
          </View>
        ) : (
          <View
            style={[
              manageStyles.emptyImageState,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <AppText variant="muted" style={manageStyles.helperText}>
              아직 갤러리 이미지가 없습니다. 업로드하면 현재 순서 그대로 미리보기가 표시됩니다.
            </AppText>
          </View>
        )}
      </SectionCard>
    </>
  );
}