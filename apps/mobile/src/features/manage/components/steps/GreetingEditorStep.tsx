import { DelimitedRowsEditor } from '../DelimitedRowsEditor';
import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import type { ManageFormState, ManageStringFieldKey } from '../../shared';

type GreetingEditorStepProps = {
  form: ManageFormState;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
};

export function GreetingEditorStep({
  form,
  onUpdateField,
}: GreetingEditorStepProps) {
  return (
    <>
      <SectionCard
        title="인사말"
        description="페이지 본문에 노출되는 인사말과 작성자 문구를 정리합니다."
      >
        <TextField
          label="인사말"
          value={form.greetingMessage}
          onChangeText={(value) => onUpdateField('greetingMessage', value)}
          placeholder="하객분들께 전하고 싶은 인사말을 입력해 주세요"
          multiline
        />
        <TextField
          label="인사말 서명"
          value={form.greetingAuthor}
          onChangeText={(value) => onUpdateField('greetingAuthor', value)}
          placeholder="예: 신랑 박준호 신부 김소민"
        />
      </SectionCard>

      <SectionCard
        title="축의금 및 방문 안내"
        description="하객에게 필요한 계좌와 방문 안내를 항목별로 입력합니다."
      >
        <TextField
          label="축의금 안내 문구"
          value={form.giftMessage}
          onChangeText={(value) => onUpdateField('giftMessage', value)}
          placeholder="예: 계좌번호 안내가 필요하신 분들을 위해 준비했습니다"
          multiline
        />
        <DelimitedRowsEditor label="신랑측 계좌" fields={['은행', '계좌번호', '예금주']}
          value={form.groomAccountsText} onChange={value => onUpdateField('groomAccountsText', value)} />
        <DelimitedRowsEditor label="신부측 계좌" fields={['은행', '계좌번호', '예금주']}
          value={form.brideAccountsText} onChange={value => onUpdateField('brideAccountsText', value)} />
        <DelimitedRowsEditor label="교통 안내" fields={['제목', '내용']}
          value={form.venueGuideText} onChange={value => onUpdateField('venueGuideText', value)} />
        <DelimitedRowsEditor label="화환 안내" fields={['제목', '내용']}
          value={form.wreathGuideText} onChange={value => onUpdateField('wreathGuideText', value)} />
      </SectionCard>
    </>
  );
}
