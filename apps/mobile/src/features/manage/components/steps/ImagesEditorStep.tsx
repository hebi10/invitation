import { Image, View } from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
import { AppText } from '../../../../components/AppText';
import { SectionCard } from '../../../../components/SectionCard';
import { usePreferences } from '../../../../contexts/PreferencesContext';
import type { ManageGalleryPreviewItem } from '../../shared';
import { manageStyles } from '../../manageStyles';

type ImagesEditorStepProps = {
  coverPreviewUrl: string;
  galleryPreviewItems: ManageGalleryPreviewItem[];
  maxGalleryImageCount: number;
  uploadingImageKind: 'cover' | 'gallery' | null;
  onUploadImage: (assetKind: 'cover' | 'gallery') => void | Promise<void>;
  onMoveGalleryImage: (index: number, direction: 'up' | 'down') => void;
  onRemoveGalleryImage: (index: number) => void;
};

export function ImagesEditorStep({
  coverPreviewUrl,
  galleryPreviewItems,
  maxGalleryImageCount,
  uploadingImageKind,
  onUploadImage,
  onMoveGalleryImage,
  onRemoveGalleryImage,
}: ImagesEditorStepProps) {
  const { palette } = usePreferences();

  return (
    <>
      <SectionCard
        title="대표 이미지"
        description="이미지 주소 대신 실제 미리보기를 보여주고, 대표 이미지는 썸네일을 우선 사용합니다."
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
            style={manageStyles.coverPreviewImage}
            resizeMode="cover"
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
        description="/page-wizard처럼 실제 노출 순서를 보면서 위아래로 정렬할 수 있습니다."
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
              <View
                key={image.id}
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
                  style={manageStyles.galleryPreviewImage}
                />
                <View style={manageStyles.galleryCardCopy}>
                  <AppText style={manageStyles.galleryCardTitle}>노출 순서 {index + 1}</AppText>
                  <AppText variant="caption" style={manageStyles.galleryCardMeta}>
                    대표 순서에 맞춰 원본 이미지를 유지하고, 편집 화면에서는 썸네일로
                    불러옵니다.
                  </AppText>
                </View>
                <View style={manageStyles.galleryCardActions}>
                  <ActionButton
                    variant="secondary"
                    onPress={() => onMoveGalleryImage(index, 'up')}
                    disabled={index === 0}
                  >
                    위로
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    onPress={() => onMoveGalleryImage(index, 'down')}
                    disabled={index === galleryPreviewItems.length - 1}
                  >
                    아래로
                  </ActionButton>
                  <ActionButton variant="danger" onPress={() => onRemoveGalleryImage(index)}>
                    삭제
                  </ActionButton>
                </View>
              </View>
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
