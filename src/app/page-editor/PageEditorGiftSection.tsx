import type { InvitationPageSeed } from '@/types/invitationPage';

import { AccountSectionPanel } from './pageEditorPanels';
import { renderFieldMeta } from './pageEditorFieldMeta';
import type { AccountKind } from './pageEditorUtils';
import styles from './page.module.css';

interface PageEditorGiftSectionProps {
  formState: InvitationPageSeed;
  onUpdateForm: (updater: (draft: InvitationPageSeed) => void) => void;
  onAccountAdd: (kind: AccountKind) => void;
  onAccountRemove: (kind: AccountKind, index: number) => void;
  onAccountChange: (
    kind: AccountKind,
    index: number,
    field: 'bank' | 'accountNumber' | 'accountHolder',
    value: string
  ) => void;
}

export default function PageEditorGiftSection({
  formState,
  onUpdateForm,
  onAccountAdd,
  onAccountRemove,
  onAccountChange,
}: PageEditorGiftSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.sectionTitle}>축의금과 계좌 안내</h2>
            <span className={styles.fieldBadgeOptional}>선택</span>
          </div>
          <p className={styles.sectionDescription}>
            민감한 정보이므로 꼭 필요한 경우에만 입력하고, 은행명 · 계좌번호 · 예금주를 한 세트로 작성해 주세요.
          </p>
        </div>
      </div>

      <div className={styles.subCard}>
        <div className={styles.subCardHeader}>
          <div>
            <h3 className={styles.subCardTitle}>계좌 안내 문구</h3>
            <p className={styles.subCardDescription}>
              계좌 영역 상단에 노출할 설명 문구를 입력합니다.
            </p>
          </div>
        </div>

        <label className={styles.field}>
          {renderFieldMeta(
            '안내 문구',
            'optional',
            '예: 참석이 어려우신 분들을 위해 계좌번호를 함께 안내드립니다.'
          )}
          <textarea
            className={styles.textarea}
            value={formState.pageData?.giftInfo?.message ?? ''}
            placeholder="예: 참석이 어려우신 분들을 위해 계좌번호를 함께 안내드립니다."
            onChange={(event) =>
              onUpdateForm((draft) => {
                if (!draft.pageData?.giftInfo) {
                  return;
                }
                draft.pageData.giftInfo.message = event.target.value;
              })
            }
          />
        </label>
      </div>

      <div className={styles.dualGrid}>
        <AccountSectionPanel
          kind="groomAccounts"
          title="신랑측 계좌"
          description="신랑 본인과 가족 계좌를 순서대로 입력해 주세요."
          accounts={formState.pageData?.giftInfo?.groomAccounts ?? []}
          disabled={false}
          onAdd={onAccountAdd}
          onRemove={onAccountRemove}
          onChange={onAccountChange}
        />
        <AccountSectionPanel
          kind="brideAccounts"
          title="신부측 계좌"
          description="신부 본인과 가족 계좌를 순서대로 입력해 주세요."
          accounts={formState.pageData?.giftInfo?.brideAccounts ?? []}
          disabled={false}
          onAdd={onAccountAdd}
          onRemove={onAccountRemove}
          onChange={onAccountChange}
        />
      </div>
    </section>
  );
}
