import { ActionButton } from '../../../components/ActionButton';
import { TextField } from '../../../components/TextField';
import type {
  ManageFormState,
  ManageStringFieldKey,
} from '../shared';

type OnboardingStepContentProps = {
  stepIndex: number;
  form: ManageFormState;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onUpdatePersonName: (role: 'groom' | 'bride', value: string) => void;
  onSetPublished: (published: boolean) => void;
};

export function OnboardingStepContent({
  stepIndex,
  form,
  onUpdateField,
  onUpdatePersonName,
  onSetPublished,
}: OnboardingStepContentProps) {
  switch (stepIndex) {
    case 0:
      return (
        <>
          <TextField
            label="대표 제목"
            value={form.displayName}
            onChangeText={(value) => onUpdateField('displayName', value)}
            placeholder="예: 신민제 · 김현지 결혼합니다"
          />
          <TextField
            label="소개 문구"
            value={form.description}
            onChangeText={(value) => onUpdateField('description', value)}
            placeholder="청첩장 첫 화면에 노출할 문구"
            multiline
          />
          <TextField
            label="신랑 이름"
            value={form.groom.name}
            onChangeText={(value) => onUpdatePersonName('groom', value)}
            placeholder="예: 신민제"
          />
          <TextField
            label="신부 이름"
            value={form.bride.name}
            onChangeText={(value) => onUpdatePersonName('bride', value)}
            placeholder="예: 김현지"
          />
        </>
      );
    case 1:
      return (
        <>
          <TextField
            label="예식 일시"
            value={form.date}
            onChangeText={(value) => onUpdateField('date', value)}
            placeholder="예: 2026.07.12 오후 2시"
          />
          <TextField
            label="예식 장소"
            value={form.venue}
            onChangeText={(value) => onUpdateField('venue', value)}
            placeholder="예: 더컨벤션 서울"
          />
          <TextField
            label="상세 주소"
            value={form.ceremonyAddress}
            onChangeText={(value) => onUpdateField('ceremonyAddress', value)}
            placeholder="예: 서울시 강남구 ..."
            multiline
          />
          <TextField
            label="예식장 연락처"
            value={form.ceremonyContact}
            onChangeText={(value) => onUpdateField('ceremonyContact', value)}
            placeholder="예: 02-1234-5678"
            autoCapitalize="none"
          />
        </>
      );
    default:
      return (
        <>
          <TextField
            label="인사말"
            value={form.greetingMessage}
            onChangeText={(value) => onUpdateField('greetingMessage', value)}
            placeholder="전하고 싶은 인사말을 입력하세요."
            multiline
          />
          <ActionButton
            variant={form.published ? 'primary' : 'secondary'}
            onPress={() => onSetPublished(!form.published)}
            fullWidth
          >
            {form.published ? '저장 후 공개' : '저장 후 비공개 유지'}
          </ActionButton>
        </>
      );
  }
}
