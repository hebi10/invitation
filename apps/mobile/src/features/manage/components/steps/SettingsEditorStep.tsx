import { View } from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
import { AppText } from '../../../../components/AppText';
import { ChoiceChip } from '../../../../components/ChoiceChip';
import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import {
  INVITATION_THEME_KEYS,
  getInvitationThemeLabel,
} from '../../../../lib/invitationThemes';
import type { ManageFormState, ManageStringFieldKey } from '../../shared';
import { manageStyles } from '../../manageStyles';

type SettingsEditorStepProps = {
  form: ManageFormState;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onSetPublished: (published: boolean) => void;
};

export function SettingsEditorStep({
  form,
  onUpdateField,
  onSetPublished,
}: SettingsEditorStepProps) {
  return (
    <>
      <SectionCard
        title="공유 문구"
        description="링크 공유 때 보이는 제목과 설명을 마지막으로 다듬습니다."
      >
        <TextField
          label="공유 제목"
          value={form.shareTitle}
          onChangeText={(value) => onUpdateField('shareTitle', value)}
          placeholder="예: 박신랑 김신부 결혼식에 초대합니다."
        />
        <TextField
          label="공유 설명"
          value={form.shareDescription}
          onChangeText={(value) => onUpdateField('shareDescription', value)}
          placeholder="미리보기 카드에서 보일 설명을 입력해 주세요."
          multiline
        />
      </SectionCard>

      <SectionCard
        title="기본 테마와 공개 상태"
        description="기본 테마 변경은 티켓 사용에서만 가능하며, 여기서는 현재 상태만 확인합니다."
      >
        <AppText variant="caption" style={manageStyles.helperText}>
          현재 기본 테마
        </AppText>
        <View style={manageStyles.chipRow}>
          {INVITATION_THEME_KEYS.map((themeKey) => (
            <ChoiceChip
              key={`settings-default-theme-${themeKey}`}
              label={getInvitationThemeLabel(themeKey)}
              selected={form.defaultTheme === themeKey}
              onPress={() => {}}
            />
          ))}
        </View>
        <AppText variant="muted" style={manageStyles.helperText}>
          기본 테마를 바꾸려면 운영 탭의 `티켓 사용`에서 디자인 변경을 진행해 주세요.
        </AppText>

        <ActionButton
          variant={form.published ? 'primary' : 'secondary'}
          onPress={() => onSetPublished(!form.published)}
          fullWidth
        >
          {form.published ? '현재 공개 상태 유지' : '현재 비공개 상태 유지'}
        </ActionButton>
      </SectionCard>
    </>
  );
}
