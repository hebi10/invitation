import { memo } from 'react';
import { Image as ExpoImage } from 'expo-image';
import {
  Image as NativeImage,
  type ImageStyle,
  type StyleProp,
  View,
} from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
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
    <SectionCard title={title} description={description}>
      <View style={manageStyles.actionRow}>
        <ActionButton
          variant="secondary"
          onPress={() => void onUploadImage(assetKind)}
          loading={uploadingImageKind === assetKind}
        >
          이미지 업로드
        </ActionButton>
        <ActionButton
          variant="danger"
          onPress={() => onRemoveSingleImage(assetKind)}
          disabled={!previewUrl}
        >
          이미지 제거
        </ActionButton>
      </View>
      {previewUrl ? (
        <View
          style={[
            manageStyles.previewFrame,
            manageStyles.coverPreviewFrame,
            {
              backgroundColor: palette.surface,
              borderColor: palette.accent,
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
            아직 등록된 이미지가 없습니다.
          </AppText>
        </View>
      )}
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
    <View
      style={[
        manageStyles.galleryCard,
        {
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.cardBorder,
        },
      ]}
    >
      <View
        style={[
          manageStyles.previewFrame,
          manageStyles.galleryPreviewFrame,
          {
            backgroundColor: palette.surface,
            borderColor: palette.accent,
          },
        ]}
      >
        <PreviewImage
          uri={image.previewUrl}
          alt={`갤러리 이미지 ${index + 1}번 미리보기`}
          style={manageStyles.galleryPreviewImage}
          fit="contain"
        />
      </View>
      <View style={manageStyles.galleryCardCopy}>
        <AppText style={manageStyles.galleryCardTitle}>노출 순서 {index + 1}</AppText>
        <AppText variant="caption" style={manageStyles.galleryCardMeta}>
          아래 버튼으로 순서를 바꾸고, 필요 없는 이미지는 바로 제거할 수 있습니다.
        </AppText>
      </View>
      <View style={manageStyles.galleryCardActions}>
        <ActionButton
          variant="secondary"
          onPress={() => onMoveGalleryImage(index, 'up')}
          disabled={isFirst}
        >
          앞으로
        </ActionButton>
        <ActionButton
          variant="secondary"
          onPress={() => onMoveGalleryImage(index, 'down')}
          disabled={isLast}
        >
          뒤로
        </ActionButton>
        <ActionButton variant="danger" onPress={() => onRemoveGalleryImage(index)}>
          제거
        </ActionButton>
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
        description="청첩장 최상단에 노출되는 메인 이미지입니다."
        previewUrl={coverPreviewUrl}
        assetKind="cover"
        uploadingImageKind={uploadingImageKind}
        onUploadImage={onUploadImage}
        onRemoveSingleImage={onRemoveSingleImage}
      />

      <SingleImageCard
        title="공유 미리보기 이미지"
        description="og:image와 twitter:image에 사용하는 링크 미리보기 이미지입니다."
        previewUrl={sharePreviewUrl}
        assetKind="share-preview"
        uploadingImageKind={uploadingImageKind}
        onUploadImage={onUploadImage}
        onRemoveSingleImage={onRemoveSingleImage}
      />

      <SingleImageCard
        title="카카오 카드 이미지"
        description="카카오 카드형 공유에 사용하는 전용 이미지입니다."
        previewUrl={kakaoCardPreviewUrl}
        assetKind="kakao-card"
        uploadingImageKind={uploadingImageKind}
        onUploadImage={onUploadImage}
        onRemoveSingleImage={onRemoveSingleImage}
      />

      <SectionCard
        title={`갤러리 이미지 (${galleryPreviewItems.length}/${maxGalleryImageCount})`}
        description="갤러리 이미지는 실제 노출 순서대로 정렬하고 필요 없는 이미지는 바로 제거합니다."
      >
        <View style={manageStyles.actionRow}>
          <ActionButton
            variant="secondary"
            onPress={() => void onUploadImage('gallery')}
            loading={uploadingImageKind === 'gallery'}
            disabled={galleryPreviewItems.length >= maxGalleryImageCount}
          >
            갤러리 이미지 업로드
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