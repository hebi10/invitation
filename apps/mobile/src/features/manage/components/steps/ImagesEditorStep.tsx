import { memo } from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
import { AppText } from '../../../../components/AppText';
import { SectionCard } from '../../../../components/SectionCard';
import { useVisualPreferences } from '../../../../contexts/PreferencesContext';
import type { ImageUploadProgressState } from '../../hooks/useImageUpload';
import type { ManageGalleryPreviewItem } from '../../shared';
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

const GALLERY_IMAGE_CACHE_POLICY = 'memory-disk' as const;

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
      <Image
        source={{ uri: image.previewUrl }}
        alt={`갤러리 이미지 ${index + 1}번 미리보기`}
        accessibilityLabel={`갤러리 이미지 ${index + 1}번 미리보기`}
        style={manageStyles.galleryPreviewImage}
        contentFit="cover"
        cachePolicy={GALLERY_IMAGE_CACHE_POLICY}
        transition={120}
      />
      <View style={manageStyles.galleryCardCopy}>
        <AppText style={manageStyles.galleryCardTitle}>노출 순서 {index + 1}</AppText>
        <AppText variant="caption" style={manageStyles.galleryCardMeta}>
          순서에 맞춰 이미지를 정리하면 실제 화면에서도 같은 흐름으로 보입니다.
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
            총 {uploadProgress.totalCount}개 중 {uploadProgress.completedCount}개 완료
          </AppText>
          <AppText variant="muted" style={manageStyles.helperText}>
            현재 {Math.min(uploadProgress.currentIndex, uploadProgress.totalCount)} /{' '}
            {uploadProgress.totalCount} 처리 중
          </AppText>
        </View>
      ) : null}

      <SectionCard
        title="대표 이미지"
        description="커버에 먼저 노출되는 대표 이미지를 업로드하고 바로 미리보기로 확인할 수 있습니다."
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
          <Image
            source={{ uri: coverPreviewUrl }}
            alt="대표 이미지 미리보기"
            accessibilityLabel="대표 이미지 미리보기"
            style={manageStyles.coverPreviewImage}
            contentFit="cover"
            cachePolicy={GALLERY_IMAGE_CACHE_POLICY}
            transition={120}
          />
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
              아직 대표 이미지가 없습니다. 업로드하면 커버 미리보기로 바로 확인할 수 있습니다.
            </AppText>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title={`갤러리 이미지 (${galleryPreviewItems.length}/${maxGalleryImageCount})`}
        description="실제 노출 순서를 보면서 위아래로 정렬할 수 있습니다."
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
              아직 갤러리 이미지가 없습니다. 업로드하면 순서를 바로 조정할 수 있습니다.
            </AppText>
          </View>
        )}
      </SectionCard>
    </>
  );
}
