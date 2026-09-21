import { useState, type ReactNode } from 'react';
import type { BankAccount, PersonInfo } from '@/types/invitationPage';

import styles from './pageWizardEditorPanels.module.css';

const MAX_REPEATABLE_ITEMS = 3;

function RepeatableEditor({ title, summary, initiallyOpen, children }: {
  title: string;
  summary: string;
  initiallyOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <details className={styles.repeatableCard} open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className={styles.repeatableSummary}>
        <span className={styles.repeatableTitle}>{title}</span>
        <span className={styles.repeatableDescription}>{summary}</span>
        <span className={styles.disclosureAction}>{open ? '접기' : '수정'}</span>
      </summary>
      <div className={styles.repeatableBody}>{children}</div>
    </details>
  );
}

type PersonRole = 'groom' | 'bride';
type ParentRole = 'father' | 'mother';
type GuideItem = {
  title: string;
  content: string;
};

interface PersonEditorCardProps {
  role: PersonRole;
  label: string;
  person: PersonInfo;
  disabled: boolean;
  nameReadOnly?: boolean;
  onPersonFieldChange: (
    role: PersonRole,
    field: 'name' | 'order' | 'phone',
    value: string
  ) => void;
  onParentFieldChange: (
    role: PersonRole,
    parentRole: ParentRole,
    field: 'relation' | 'name' | 'phone',
    value: string
  ) => void;
}

interface GuideSectionPanelProps {
  kind: 'venueGuide' | 'wreathGuide';
  title: string;
  description: string;
  items: GuideItem[];
  disabled: boolean;
  onAdd: (kind: 'venueGuide' | 'wreathGuide') => void;
  onRemove: (kind: 'venueGuide' | 'wreathGuide', index: number) => void;
  onChange: (
    kind: 'venueGuide' | 'wreathGuide',
    index: number,
    field: 'title' | 'content',
    value: string
  ) => void;
}

interface AccountSectionPanelProps {
  kind: 'groomAccounts' | 'brideAccounts';
  title: string;
  description: string;
  accounts: BankAccount[];
  disabled: boolean;
  onAdd: (kind: 'groomAccounts' | 'brideAccounts') => void;
  onRemove: (kind: 'groomAccounts' | 'brideAccounts', index: number) => void;
  onChange: (
    kind: 'groomAccounts' | 'brideAccounts',
    index: number,
    field: keyof BankAccount,
    value: string
  ) => void;
}

function renderFieldMeta(
  label: string,
  requirement: 'required' | 'optional',
  hint?: string
) {
  return (
    <>
      <span className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        <span
          className={
            requirement === 'required'
              ? styles.fieldBadgeRequired
              : styles.fieldBadgeOptional
          }
        >
          {requirement === 'required' ? '필수' : '선택'}
        </span>
      </span>
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </>
  );
}

export function PersonEditorCard({
  role,
  label,
  person,
  disabled,
  nameReadOnly = false,
  onPersonFieldChange,
  onParentFieldChange,
}: PersonEditorCardProps) {
  return (
    <div className={`${styles.subCard} ${styles.personCard}`} data-preview-step="family">
      <div className={styles.subCardHeader}>
        <div>
          <h3 className={styles.subCardTitle}>
            {label}{nameReadOnly && person.name ? ` · ${person.name}` : ''}
          </h3>
          <p className={styles.subCardDescription}>
            {nameReadOnly
              ? '가족 정보는 선택입니다. 연락처는 공개할 때만 입력해 주세요.'
              : '이름을 입력해 주세요. 연락처는 공개할 때만 입력해 주세요.'}
          </p>
        </div>
      </div>

      <div className={styles.personFields}>
        {!nameReadOnly && (
        <label className={`${styles.field} ${styles.nameField}`}>
          {renderFieldMeta('이름', 'required')}
          <input
            className={styles.input}
            value={person.name ?? ''}
            placeholder="예: 김신랑"
            onChange={(event) =>
              onPersonFieldChange(role, 'name', event.target.value)
            }
            disabled={disabled}
          />
        </label>
        )}

        <label className={`${styles.field} ${styles.relationField}`}>
          {renderFieldMeta('호칭', 'optional')}
          <input
            className={styles.input}
            value={person.order ?? ''}
            placeholder="예: 장남"
            onChange={(event) =>
              onPersonFieldChange(role, 'order', event.target.value)
            }
            disabled={disabled}
          />
        </label>

        <label className={`${styles.field} ${styles.phoneField}`}>
          {renderFieldMeta('연락처', 'optional')}
          <input
            className={styles.input}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={person.phone ?? ''}
            placeholder="예: 010-1234-5678"
            onChange={(event) =>
              onPersonFieldChange(role, 'phone', event.target.value)
            }
            disabled={disabled}
          />
        </label>
      </div>

      <details className={styles.detailsGroup}>
        <summary className={styles.detailsSummary}>
          부모님 정보
          <span className={styles.familySummary}>
            {[person.father?.name, person.mother?.name].filter(Boolean).join(' · ') || '선택 입력'}
          </span>
        </summary>
        <div className={styles.detailsBody}>
          <p className={styles.familyHint}>입력하지 않아도 됩니다. 표시하지 않을 분의 관계·이름·연락처는 모두 비워 주세요.</p>
          <div className={styles.parentGrid}>
          {(['father', 'mother'] as const).map((parentRole) => {
            const parent = person[parentRole];

            return (
              <div key={parentRole} className={styles.nestedCard}>
                <h4 className={styles.nestedCardTitle}>
                  {parentRole === 'father' ? '아버님 정보' : '어머님 정보'}
                </h4>

                <div className={styles.personFields}>
                  <label className={`${styles.field} ${styles.relationField}`}>
                    {renderFieldMeta('관계', 'optional')}
                    <input
                      className={styles.input}
                      value={parent?.relation ?? ''}
                      placeholder={
                        parentRole === 'father' ? '예: 아버지' : '예: 어머니'
                      }
                      onChange={(event) =>
                        onParentFieldChange(
                          role,
                          parentRole,
                          'relation',
                          event.target.value
                        )
                      }
                      disabled={disabled}
                    />
                  </label>

                  <label className={`${styles.field} ${styles.nameField}`}>
                    {renderFieldMeta('이름', 'optional')}
                    <input
                      className={styles.input}
                      value={parent?.name ?? ''}
                      placeholder="예: 김민수"
                      onChange={(event) =>
                        onParentFieldChange(
                          role,
                          parentRole,
                          'name',
                          event.target.value
                        )
                      }
                      disabled={disabled}
                    />
                  </label>

                  <label className={`${styles.field} ${styles.phoneField}`}>
                    {renderFieldMeta('연락처', 'optional')}
                    <input
                      className={styles.input}
                      type="tel"
                      inputMode="tel"
                      value={parent?.phone ?? ''}
                      placeholder="예: 010-1234-5678"
                      onChange={(event) =>
                        onParentFieldChange(
                          role,
                          parentRole,
                          'phone',
                          event.target.value
                        )
                      }
                      disabled={disabled}
                    />
                  </label>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </details>
    </div>
  );
}

export function GuideSectionPanel({
  kind,
  title,
  description,
  items,
  disabled,
  onAdd,
  onRemove,
  onChange,
}: GuideSectionPanelProps) {
  const canAdd = !disabled && items.length < MAX_REPEATABLE_ITEMS;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <span className={styles.fieldBadgeOptional}>선택</span>
          </div>
          <p className={styles.sectionDescription}>{description}</p>
          <p className={styles.countText}>
            현재 {items.length} / {MAX_REPEATABLE_ITEMS}개
          </p>
        </div>
        <button
          type="button"
          className={`${styles.ghostButton} ${styles.panelHeaderButton}`}
          onClick={() => onAdd(kind)}
          disabled={!canAdd}
        >
          항목 추가
        </button>
      </div>

      <div className={styles.stackColumn}>
        {items.length > 0 ? (
          items.map((item, index) => (
            <RepeatableEditor key={`${kind}-${index}`}
              title={item.title.trim() || `안내 항목 ${index + 1}`}
              summary={item.content.trim() || '제목과 안내 내용을 입력해 주세요.'}
              initiallyOpen={!item.title.trim() && !item.content.trim()}>
              <div className={styles.subCardHeader}>
                <h3 className={styles.subCardTitle}>안내 항목 {index + 1}</h3>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => onRemove(kind, index)}
                  disabled={disabled}
                >
                  삭제
                </button>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  {renderFieldMeta('제목', 'optional', '예: 주차 안내, 식사 안내')}
                  <input
                    className={styles.input}
                    value={item.title}
                    placeholder="예: 주차 안내"
                    onChange={(event) =>
                      onChange(kind, index, 'title', event.target.value)
                    }
                    disabled={disabled}
                  />
                </label>

                <label className={`${styles.field} ${styles.fieldWide}`}>
                  {renderFieldMeta(
                    '내용',
                    'optional',
                    '예식장 방문 전에 꼭 알아야 할 핵심 정보만 간단히 적어 주세요.'
                  )}
                  <textarea
                    className={styles.textarea}
                    value={item.content}
                    placeholder="예: 예식장 지하 주차장을 2시간 무료로 이용하실 수 있습니다."
                    onChange={(event) =>
                      onChange(kind, index, 'content', event.target.value)
                    }
                    disabled={disabled}
                  />
                </label>
              </div>
            </RepeatableEditor>
          ))
        ) : (
          <div className={styles.emptyCard}>등록된 안내 항목이 없습니다.</div>
        )}
      </div>
    </section>
  );
}

export function AccountSectionPanel({
  kind,
  title,
  description,
  accounts,
  disabled,
  onAdd,
  onRemove,
  onChange,
}: AccountSectionPanelProps) {
  const canAdd = !disabled && accounts.length < MAX_REPEATABLE_ITEMS;

  return (
    <div className={styles.subCard}>
      <div className={styles.subCardHeader}>
        <div>
          <h3 className={styles.subCardTitle}>{title}</h3>
          <p className={styles.subCardDescription}>{description}</p>
          <p className={styles.countText}>
            현재 {accounts.length} / {MAX_REPEATABLE_ITEMS}개
          </p>
        </div>
        <button
          type="button"
          className={`${styles.ghostButton} ${styles.panelHeaderButton}`}
          onClick={() => onAdd(kind)}
          disabled={!canAdd}
        >
          {accounts.length > 0 ? '부모님 계좌 추가하기' : '계좌 추가하기'}
        </button>
      </div>

      <div className={styles.stackColumn}>
        {accounts.length > 0 ? (
          accounts.map((account, index) => (
            <RepeatableEditor key={`${kind}-${index}`}
              title={[account.accountHolder, account.bank].filter(Boolean).join(' · ') || `계좌 ${index + 1}`}
              summary={account.accountNumber || '은행명, 계좌번호, 예금주를 입력해 주세요.'}
              initiallyOpen={!account.bank.trim() || !account.accountNumber.trim() || !account.accountHolder.trim()}>
              <div className={styles.subCardHeader}>
                <div>
                  <h4 className={styles.nestedCardTitle}>계좌 {index + 1}</h4>
                </div>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => onRemove(kind, index)}
                  disabled={disabled}
                >
                  항목 삭제하기
                </button>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  {renderFieldMeta('은행명', 'optional')}
                  <input
                    className={styles.input}
                    value={account.bank}
                    placeholder="예: 국민은행"
                    onChange={(event) =>
                      onChange(kind, index, 'bank', event.target.value)
                    }
                    disabled={disabled}
                  />
                </label>

                <label className={styles.field}>
                  {renderFieldMeta(
                    '계좌번호',
                    'optional',
                    '숫자만 입력해도 됩니다. 앞자리 0을 포함해 정확히 적어 주세요.'
                  )}
                  <input
                    className={styles.input}
                    inputMode="numeric"
                    value={account.accountNumber}
                    placeholder="예: 123456-78-901234"
                    onChange={(event) =>
                      onChange(kind, index, 'accountNumber', event.target.value)
                    }
                    disabled={disabled}
                  />
                </label>

                <label className={`${styles.field} ${styles.fieldWide}`}>
                  {renderFieldMeta('예금주', 'optional')}
                  <input
                    className={styles.input}
                    value={account.accountHolder}
                    placeholder="예: 나신부"
                    onChange={(event) =>
                      onChange(kind, index, 'accountHolder', event.target.value)
                    }
                    disabled={disabled}
                  />
                </label>
              </div>
            </RepeatableEditor>
          ))
        ) : (
          <div className={styles.emptyCard}>등록된 계좌가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
