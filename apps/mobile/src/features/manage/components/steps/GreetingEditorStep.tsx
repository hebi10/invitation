import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import type {
  ManageFormState,
  ManageStringFieldKey,
} from '../../shared';

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
          placeholder="소중한 분들을 예식에 초대하는 인사말을 입력해 주세요."
          multiline
        />
        <TextField
          label="인사말 서명"
          value={form.greetingAuthor}
          onChangeText={(value) => onUpdateField('greetingAuthor', value)}
          placeholder="예: 신랑 · 신부"
        />
      </SectionCard>

      <SectionCard
        title="축의금 및 방문 안내"
        description="축의금 계좌와 교통·화환 안내를 웹 page-wizard 구조처럼 함께 관리합니다."
      >
        <TextField
          label="축의금 안내 문구"
          value={form.giftMessage}
          onChangeText={(value) => onUpdateField('giftMessage', value)}
          placeholder="예: 계좌번호 안내가 필요하신 분들을 위해 준비했습니다."
          multiline
        />
        <TextField
          label="신랑측 계좌 (한 줄당 은행|계좌번호|예금주)"
          value={form.groomAccountsText}
          onChangeText={(value) => onUpdateField('groomAccountsText', value)}
          placeholder={'국민은행|123-456-789|홍길동\n신한은행|111-222-333|홍길동'}
          multiline
          autoCapitalize="none"
        />
        <TextField
          label="신부측 계좌 (한 줄당 은행|계좌번호|예금주)"
          value={form.brideAccountsText}
          onChangeText={(value) => onUpdateField('brideAccountsText', value)}
          placeholder={'우리은행|987-654-321|김수민\n하나은행|444-555-666|김수민'}
          multiline
          autoCapitalize="none"
        />
        <TextField
          label="교통 안내 (한 줄당 제목|내용)"
          value={form.venueGuideText}
          onChangeText={(value) => onUpdateField('venueGuideText', value)}
          placeholder={'주차 안내|건물 앞 주차장을 이용해 주세요.\n대중교통|2호선 강남역 4번 출구'}
          multiline
        />
        <TextField
          label="화환 안내 (한 줄당 제목|내용)"
          value={form.wreathGuideText}
          onChangeText={(value) => onUpdateField('wreathGuideText', value)}
          placeholder={'화환 접수|예식장 안내 데스크에 전달해 주세요.'}
          multiline
        />
      </SectionCard>
    </>
  );
}
