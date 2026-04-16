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
        title="예식장 주소와 연락처"
        description="주소 검색으로 좌표를 다시 맞추고 지도 설명 문구도 함께 정리합니다."
      >
        <TextField
          label="상세 주소"
          value={form.ceremonyAddress}
          onChangeText={(value) => onUpdateField('ceremonyAddress', value)}
          placeholder="예: 서울시 강남구..."
          multiline
        />
        <View style={manageStyles.actionRow}>
          <ActionButton
            variant="secondary"
            onPress={() => void onSearchAddress()}
            loading={isSearchingAddress}
          >
            주소 검색으로 위치 다시 맞추기
          </ActionButton>
        </View>
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
          label="지도 안내 문구"
          value={form.mapDescription}
          onChangeText={(value) => onUpdateField('mapDescription', value)}
          placeholder="예: 건물 뒤 주차장을 이용해 주세요."
          multiline
        />
      </SectionCard>

      <SectionCard
        title="지도 미리보기"
        description="주소 검색 결과로 실제 연결되는 위치를 앱 안에서 바로 확인합니다."
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
            <AppText style={manageStyles.mapPreviewTitle}>
              {form.venue.trim() || '선택한 예식장 위치'}
            </AppText>
            <AppText variant="muted" style={manageStyles.mapPreviewAddress}>
              {form.ceremonyAddress.trim() || '주소를 입력하면 지도 위치가 준비됩니다.'}
            </AppText>
            {hasValidCoordinates(mapLatitude, mapLongitude) ? (
              <AppText variant="caption" style={manageStyles.mapPreviewMeta}>
                좌표: {mapLatitude}, {mapLongitude}
              </AppText>
            ) : null}
            <ActionButton variant="secondary" onPress={() => void onOpenMapUrl()} fullWidth>
              앱 안에서 지도 열기
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
            <AppText variant="muted" style={manageStyles.helperText}>
              아직 지도 위치가 준비되지 않았습니다. 주소를 검색하면 연결되는 위치를 바로
              확인할 수 있습니다.
            </AppText>
          </View>
        )}
      </SectionCard>
    </>
  );
}
