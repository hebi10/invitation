import {
  AccountSectionPanel,
  GuideSectionPanel,
} from '@/app/page-editor/pageEditorPanels';

import styles from '../page.module.css';
import { GUIDE_TEMPLATES } from '../pageWizardData';
import { renderFieldMeta, type ExtraStepProps } from '../pageWizardShared';

export default function ExtraStep({
  formState,
  updateForm,
  onAccountAdd,
  onAccountRemove,
  onAccountChange,
  onGuideAdd,
  onGuideRemove,
  onGuideChange,
  onGuideTemplateApply,
}: ExtraStepProps) {
  return (
    <div className={styles.fieldGrid}>
      <section className={styles.formCard}>
        <label className={styles.field}>
          {renderFieldMeta('축의금 안내 문구', 'optional')}
          <textarea
            className={styles.textarea}
            value={formState.pageData?.giftInfo?.message ?? ''}
            placeholder="계좌 안내 앞에 보여줄 문구를 입력해 주세요."
            onChange={(event) =>
              updateForm((draft) => {
                if (draft.pageData?.giftInfo) {
                  draft.pageData.giftInfo.message = event.target.value;
                }
              })
            }
          />
        </label>
      </section>

      <div className={styles.twoColumnGrid}>
        <AccountSectionPanel
          kind="groomAccounts"
          title="신랑측 계좌"
          description="최대 3개까지 등록할 수 있습니다."
          accounts={formState.pageData?.giftInfo?.groomAccounts ?? []}
          disabled={false}
          onAdd={onAccountAdd}
          onRemove={onAccountRemove}
          onChange={onAccountChange}
        />
        <AccountSectionPanel
          kind="brideAccounts"
          title="신부측 계좌"
          description="최대 3개까지 등록할 수 있습니다."
          accounts={formState.pageData?.giftInfo?.brideAccounts ?? []}
          disabled={false}
          onAdd={onAccountAdd}
          onRemove={onAccountRemove}
          onChange={onAccountChange}
        />
      </div>

      <section className={styles.formCard}>
        <div className={styles.templateRow}>
          {GUIDE_TEMPLATES.map((template) => (
            <button
              key={template.label}
              type="button"
              className={styles.templateButton}
              onClick={() =>
                onGuideTemplateApply('venueGuide', template.label, template.value)
              }
            >
              {template.label} 붙이기
            </button>
          ))}
        </div>
        <GuideSectionPanel
          kind="venueGuide"
          title="교통 · 방문 안내"
          description="주차, 대중교통, 건물 위치처럼 손님 안내에 필요한 내용을 적습니다."
          items={formState.pageData?.venueGuide ?? []}
          disabled={false}
          onAdd={onGuideAdd}
          onRemove={onGuideRemove}
          onChange={onGuideChange}
        />
        <GuideSectionPanel
          kind="wreathGuide"
          title="화환 안내"
          description="화환 전달 관련 안내를 선택적으로 입력합니다."
          items={formState.pageData?.wreathGuide ?? []}
          disabled={false}
          onAdd={onGuideAdd}
          onRemove={onGuideRemove}
          onChange={onGuideChange}
        />
      </section>
    </div>
  );
}
