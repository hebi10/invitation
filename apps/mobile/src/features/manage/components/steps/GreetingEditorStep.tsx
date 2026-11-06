import { DelimitedRowsEditor } from '../DelimitedRowsEditor';
import { Disclosure } from '../../../../components/Disclosure';
import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import type { ManageFormState, ManageStringFieldKey } from '../../shared';

type GreetingEditorStepProps = {
  form: ManageFormState;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
};

export function GreetingEditorStep({ form, onUpdateField }: GreetingEditorStepProps) {
  return (
    <>
      <SectionCard
        title="하객에게 전할 인사말"
        description="초대받는 분들에게 전하고 싶은 마음을 자유롭게 적어 주세요."
      >
        <TextField
          label="인사말"
          value={form.greetingMessage}
          onChangeText={(value) => onUpdateField('greetingMessage', value)}
          placeholder="하객분들께 전하고 싶은 인사말을 입력해 주세요"
          helperText="여러 줄로 입력할 수 있습니다. 저장 후 미리보기에서 줄바꿈을 확인해 주세요."
          multiline
        />
        <TextField
          label="인사말 서명 (선택)"
          value={form.greetingAuthor}
          onChangeText={(value) => onUpdateField('greetingAuthor', value)}
          placeholder="예: 신랑 박준호 신부 김소민"
        />
      </SectionCard>

      <Disclosure
        title="축의금·계좌 정보 (선택)"
        description="계좌 안내가 필요한 경우에만 펼쳐 입력해 주세요."
        defaultExpanded={Boolean(form.giftMessage.trim() || form.groomAccountsText.trim() || form.brideAccountsText.trim())}
      >
        <SectionCard title="계좌 안내" description="필요한 경우 안내 문구와 계좌를 각각 입력합니다.">
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
        </SectionCard>
      </Disclosure>

      <Disclosure
        title="교통·화환 안내 (선택)"
        description="주차, 대중교통, 화환 안내가 필요하면 펼쳐 입력해 주세요."
        defaultExpanded={Boolean(form.venueGuideText.trim() || form.wreathGuideText.trim())}
      >
        <SectionCard title="방문 안내" description="교통·화환 내용을 항목별로 입력합니다.">
          <DelimitedRowsEditor label="교통 안내" fields={['제목', '내용']}
            value={form.venueGuideText} onChange={value => onUpdateField('venueGuideText', value)} />
          <DelimitedRowsEditor label="화환 안내" fields={['제목', '내용']}
            value={form.wreathGuideText} onChange={value => onUpdateField('wreathGuideText', value)} />
        </SectionCard>
      </Disclosure>
    </>
  );
}
