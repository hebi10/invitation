import { View } from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
import { AppText } from '../../../../components/AppText';
import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import { usePreferences } from '../../../../contexts/PreferencesContext';
import {
  hasValidCoordinates,
  type ManageFormState,
  type ManageStringFieldKey,
} from '../../shared';
import { manageStyles } from '../../manageStyles';

type LocationEditorStepProps = {
  form: ManageFormState;
  mapPreviewUrl: string;
  mapLatitude: number | null;
  mapLongitude: number | null;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onSearchAddress: () => void | Promise<void>;
  onOpenMapUrl: () => void | Promise<void>;
  isSearchingAddress: boolean;
};

export function LocationEditorStep({
  form,
  mapPreviewUrl,
  mapLatitude,
  mapLongitude,
  onUpdateField,
  onSearchAddress,
  onOpenMapUrl,
  isSearchingAddress,
}: LocationEditorStepProps) {
  const { palette } = usePreferences();

  return (
    <>
      <SectionCard
        title="예식장 주소"
        description="주소를 입력한 다음 위치를 검색해 하객에게 안내할 지도를 확인해 주세요."
      >
        <TextField
          label="예식장 상세 주소"
          value={form.ceremonyAddress}
          onChangeText={(value) => onUpdateField('ceremonyAddress', value)}
          placeholder="예: 서울특별시 강남구 테헤란로 123"
          helperText="도로명 주소나 건물명을 정확하게 입력하면 하객이 장소를 찾기 쉽습니다."
          multiline
        />
        <ActionButton
          variant="secondary"
          onPress={() => void onSearchAddress()}
          loading={isSearchingAddress}
          fullWidth
        >
          입력한 주소로 위치 검색
        </ActionButton>
        <TextField
          label="예식장 연락처"
          value={form.ceremonyContact}
          onChangeText={(value) => onUpdateField('ceremonyContact', value)}
          placeholder="예: 02-1234-5678"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="phone-pad"
        />
        <TextField
          label="오시는 길 안내 (선택)"
          value={form.mapDescription}
          onChangeText={(value) => onUpdateField('mapDescription', value)}
          placeholder="예: 건물 뒤 주차장을 이용해 주세요."
          multiline
        />
      </SectionCard>

      <SectionCard
        title="지도 연결 확인"
        description="하객이 보게 될 지도 연결 정보를 확인합니다."
      >
        {mapPreviewUrl ? (
          <View
            style={[
              manageStyles.mapPreviewCard,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <AppText variant="title" style={manageStyles.mapPreviewTitle}>
              {form.venue.trim() || '선택한 예식장 위치'}
            </AppText>
            <AppText variant="muted" style={manageStyles.mapPreviewAddress}>
              {form.ceremonyAddress.trim() || '주소를 입력하면 지도 위치가 준비됩니다.'}
            </AppText>
            {hasValidCoordinates(mapLatitude, mapLongitude) ? (
              <AppText variant="caption" style={manageStyles.mapPreviewMeta}>
                지도 위치가 확인되었습니다.
              </AppText>
            ) : null}
            <ActionButton variant="secondary" onPress={() => void onOpenMapUrl()} fullWidth>
              지도에서 위치 확인
            </ActionButton>
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
            <AppText variant="title">지도 위치 미설정</AppText>
            <AppText variant="muted" style={manageStyles.helperText}>
              먼저 주소를 입력하고 위치 검색을 선택해 주세요.
            </AppText>
          </View>
        )}
      </SectionCard>
    </>
  );
}
