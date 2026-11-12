import type { InvitationIntroChoice, InvitationIntroPresetId } from '../../../lib/invitationIntroCatalog';
import type { MobileMusicCategory } from '../../../types/mobileInvitation';
import type { EventTypeKey } from '../../../../../src/lib/eventTypes';
import type { ImageUploadProgressState } from '../hooks/useImageUpload';
import type {
  EditableImageAssetKind,
  EditorStepKey,
  ManageFormState,
  ManageGalleryPreviewItem,
  ManageParentState,
  ManageStringFieldKey,
  MusicDropdownPanel,
} from '../shared';
import { BasicEditorStep } from './steps/BasicEditorStep';
import { GreetingEditorStep } from './steps/GreetingEditorStep';
import { ImagesEditorStep } from './steps/ImagesEditorStep';
import { LocationEditorStep } from './steps/LocationEditorStep';
import { MusicEditorStep } from './steps/MusicEditorStep';
import { ScheduleEditorStep } from './steps/ScheduleEditorStep';
import { SettingsEditorStep } from './steps/SettingsEditorStep';

type ManageEditorStepContentProps = {
  stepKey: EditorStepKey;
  form: ManageFormState;
  eventType: EventTypeKey;
  savedPublished?: boolean;
  savedIntroPresetId: InvitationIntroChoice | null;
  hasUnknownSavedIntroPreset: boolean;
  introAssetBaseUrl: string;
  mapPreviewUrl: string;
  mapLatitude: number | null;
  mapLongitude: number | null;
  galleryPreviewItems: ManageGalleryPreviewItem[];
  maxGalleryImageCount: number;
  supportsMusicFeature: boolean;
  musicLibraryLoading: boolean;
  musicCategories: MobileMusicCategory[];
  openMusicDropdown: MusicDropdownPanel;
  selectedMusicCategoryLabel: string;
  selectedMusicTrackLabel: string;
  availableMusicTracks: MobileMusicCategory['tracks'];
  uploadingImageKind: EditableImageAssetKind | null;
  uploadProgress: ImageUploadProgressState | null;
  isSearchingAddress: boolean;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onUpdatePersonField: (
    role: 'groom' | 'bride',
    field: 'name' | 'order' | 'phone',
    value: string
  ) => void;
  onUpdateParentField: (
    role: 'groom' | 'bride',
    parent: 'father' | 'mother',
    field: keyof ManageParentState,
    value: string
  ) => void;
  onUploadImage: (assetKind: EditableImageAssetKind) => void | Promise<void>;
  onRemoveSingleImage: (
    assetKind: Exclude<EditableImageAssetKind, 'gallery'>
  ) => void;
  onMoveGalleryImage: (index: number, direction: 'up' | 'down') => void;
  onRemoveGalleryImage: (index: number) => void;
  onSearchAddress: () => void | Promise<void>;
  onOpenMapUrl: () => void | Promise<void>;
  onSetMusicEnabled: (enabled: boolean) => void;
  onSetPublished: (published: boolean) => void;
  onSetIntroPresetId: (choice: InvitationIntroChoice) => void;
  onPreviewIntroPreset: (id: InvitationIntroPresetId) => void;
  onToggleMusicDropdown: (panel: MusicDropdownPanel) => void;
  onSelectMusicCategory: (categoryId: string) => void;
  onSelectMusicTrack: (trackId: string) => void;
};

export function ManageEditorStepContent({
  stepKey,
  form,
  eventType,
  savedPublished,
  savedIntroPresetId,
  hasUnknownSavedIntroPreset,
  introAssetBaseUrl,
  mapPreviewUrl,
  mapLatitude,
  mapLongitude,
  galleryPreviewItems,
  maxGalleryImageCount,
  supportsMusicFeature,
  musicLibraryLoading,
  musicCategories,
  openMusicDropdown,
  selectedMusicCategoryLabel,
  selectedMusicTrackLabel,
  availableMusicTracks,
  uploadingImageKind,
  uploadProgress,
  isSearchingAddress,
  onUpdateField,
  onUpdatePersonField,
  onUpdateParentField,
  onUploadImage,
  onRemoveSingleImage,
  onMoveGalleryImage,
  onRemoveGalleryImage,
  onSearchAddress,
  onOpenMapUrl,
  onSetMusicEnabled,
  onSetPublished,
  onSetIntroPresetId,
  onPreviewIntroPreset,
  onToggleMusicDropdown,
  onSelectMusicCategory,
  onSelectMusicTrack,
}: ManageEditorStepContentProps) {
  switch (stepKey) {
    case 'basic':
      return (
        <BasicEditorStep
          form={form}
          onUpdateField={onUpdateField}
          onUpdatePersonField={onUpdatePersonField}
          onUpdateParentField={onUpdateParentField}
        />
      );
    case 'schedule':
      return <ScheduleEditorStep form={form} onUpdateField={onUpdateField} />;
    case 'location':
      return (
        <LocationEditorStep
          form={form}
          mapPreviewUrl={mapPreviewUrl}
          mapLatitude={mapLatitude}
          mapLongitude={mapLongitude}
          onUpdateField={onUpdateField}
          onSearchAddress={onSearchAddress}
          onOpenMapUrl={onOpenMapUrl}
          isSearchingAddress={isSearchingAddress}
        />
      );
    case 'greeting':
      return <GreetingEditorStep form={form} onUpdateField={onUpdateField} />;
    case 'images':
      return (
        <ImagesEditorStep
          coverPreviewUrl={form.coverImageThumbnailUrl.trim() || form.coverImageUrl.trim()}
          sharePreviewUrl={
            form.sharePreviewImageThumbnailUrl.trim() || form.sharePreviewImageUrl.trim()
          }
          kakaoCardPreviewUrl={
            form.kakaoCardImageThumbnailUrl.trim() || form.kakaoCardImageUrl.trim()
          }
          galleryPreviewItems={galleryPreviewItems}
          maxGalleryImageCount={maxGalleryImageCount}
          uploadingImageKind={uploadingImageKind}
          uploadProgress={uploadProgress}
          onUploadImage={onUploadImage}
          onRemoveSingleImage={onRemoveSingleImage}
          onMoveGalleryImage={onMoveGalleryImage}
          onRemoveGalleryImage={onRemoveGalleryImage}
        />
      );
    case 'music':
      return (
        <MusicEditorStep
          form={form}
          supportsMusicFeature={supportsMusicFeature}
          musicLibraryLoading={musicLibraryLoading}
          musicCategories={musicCategories}
          openMusicDropdown={openMusicDropdown}
          selectedMusicCategoryLabel={selectedMusicCategoryLabel}
          selectedMusicTrackLabel={selectedMusicTrackLabel}
          availableMusicTracks={availableMusicTracks}
          onUpdateField={onUpdateField}
          onSetMusicEnabled={onSetMusicEnabled}
          onToggleMusicDropdown={onToggleMusicDropdown}
          onSelectMusicCategory={onSelectMusicCategory}
          onSelectMusicTrack={onSelectMusicTrack}
        />
      );
    case 'settings':
    default:
      return (
        <SettingsEditorStep
          form={form}
          eventType={eventType}
          savedPublished={savedPublished}
          savedIntroPresetId={savedIntroPresetId}
          hasUnknownSavedIntroPreset={hasUnknownSavedIntroPreset}
          introAssetBaseUrl={introAssetBaseUrl}
          onUpdateField={onUpdateField}
          onSetPublished={onSetPublished}
          onSetIntroPresetId={onSetIntroPresetId}
          onPreviewIntroPreset={onPreviewIntroPreset}
        />
      );
  }
}
