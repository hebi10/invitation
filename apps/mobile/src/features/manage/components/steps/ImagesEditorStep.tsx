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
  type ManageGalleryPreviewItem,
} from '../../shared';
import { manageStyles } from '../../manageStyles';

type ImagesEditorStepProps = {
  coverPreviewUrl: string;
  galleryPreviewItems: ManageGalleryPreviewItem[];
  maxGalleryImageCount: number;
  uploadingImageKind: 'cover' | 'gallery' | null;
  uploadProgress: ImageUploadProgressState | null;
  onUploadImage: (assetKind: 'cover' | 'gallery') => void | Promise<void>;
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
          전체 이미지가 보이는 상태로 순서를 확인한 뒤 위아래로 정렬할 수 있습니다.
        </AppText>
      </View>
      <View style={manageStyles.galleryCardActions}>
        <ActionButton
          variant="secondary"
          onPress={() => onMoveGalleryImage(index, 'up')}
          disabled={isFirst}
        >
          위로
        </ActionButton>
        <ActionButton
          variant="secondary"
          onPress={() => onMoveGalleryImage(index, 'down')}
          disabled={isLast}
        >
          아래로
        </ActionButton>
        <ActionButton variant="danger" onPress={() => onRemoveGalleryImage(index)}>
          삭제
        </ActionButton>
      </View>
    </View>
  );
});

export function ImagesEditorStep({
  coverPreviewUrl,
  galleryPreviewItems,
  maxGalleryImageCount,
  uploadingImageKind,
  uploadProgress,
  onUploadImage,
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
            {uploadProgress.assetKind === 'cover'
              ? '대표 이미지 업로드 중'
              : '갤러리 이미지 업로드 중'}
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

      <SectionCard
        title="대표 이미지"
        description="잘리지 않게 전체 이미지를 보고 커버에 들어갈 대표 이미지를 확인합니다."
      >
        <View style={manageStyles.actionRow}>
          <ActionButton
            variant="secondary"
            onPress={() => void onUploadImage('cover')}
            loading={uploadingImageKind === 'cover'}
          >
            대표 이미지 업로드
          </ActionButton>
        </View>
        {coverPreviewUrl ? (
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
              uri={coverPreviewUrl}
              alt="대표 이미지 미리보기"
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
              아직 대표 이미지가 없습니다. 업로드하면 이 영역 안에서 전체 비율 그대로 미리볼 수
              있습니다.
            </AppText>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title={`갤러리 이미지 (${galleryPreviewItems.length}/${maxGalleryImageCount})`}
        description="갤러리도 잘리지 않게 전체 이미지를 본 뒤 실제 노출 순서를 정리합니다."
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
              아직 갤러리 이미지가 없습니다. 업로드하면 각 이미지 영역 안에서 전체 모습을 먼저 볼
              수 있습니다.
            </AppText>
          </View>
        )}
      </SectionCard>
    </>
  );
}
