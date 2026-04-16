import type { BankAccount, PersonInfo } from '@/types/invitationPage';

import styles from './page.module.css';

const MAX_REPEATABLE_ITEMS = 3;

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
  onPersonFieldChange,
  onParentFieldChange,
}: PersonEditorCardProps) {
  return (
    <div className={styles.subCard}>
      <div className={styles.subCardHeader}>
        <div>
          <h3 className={styles.subCardTitle}>{label}</h3>
          <p className={styles.subCardDescription}>
            이름은 꼭 입력하고, 호칭과 연락처는 필요한 경우에만 추가해 주세요.
          </p>
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          {renderFieldMeta('이름', 'required', '청첩장에 직접 노출되는 이름입니다.')}
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

        <label className={styles.field}>
          {renderFieldMeta('호칭', 'optional', '장남, 차녀처럼 가족 호칭을 적을 때 사용합니다.')}
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

        <label className={`${styles.field} ${styles.fieldWide}`}>
          {renderFieldMeta(
            '연락처',
            'optional',
            '손님에게 직접 연락처를 공개할 때만 입력해 주세요.'
          )}
          <input
            className={styles.input}
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
        <summary className={styles.detailsSummary}>부모님 정보 추가 입력</summary>
        <div className={styles.detailsBody}>
          {(['father', 'mother'] as const).map((parentRole) => {
            const parent = person[parentRole];

            return (
              <div key={parentRole} className={styles.nestedCard}>
                <h4 className={styles.nestedCardTitle}>
                  {parentRole === 'father' ? '아버님 정보' : '어머님 정보'}
                </h4>

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    {renderFieldMeta(
                      '관계',
                      'optional',
                      '아버지, 어머니처럼 표기될 관계를 적어 주세요.'
                    )}
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

                  <label className={styles.field}>
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

                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    {renderFieldMeta('연락처', 'optional')}
                    <input
                      className={styles.input}
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
            <div key={`${kind}-${index}`} className={styles.subCard}>
              <div className={styles.subCardHeader}>
                <div>
                  <h3 className={styles.subCardTitle}>안내 항목 {index + 1}</h3>
                  <p className={styles.subCardDescription}>
                    짧은 제목과 손님이 바로 이해할 수 있는 설명 문장을 함께 적어 주세요.
                  </p>
                </div>
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
            </div>
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
            <div key={`${kind}-${index}`} className={styles.nestedCard}>
              <div className={styles.subCardHeader}>
                <div>
                  <h4 className={styles.nestedCardTitle}>계좌 {index + 1}</h4>
                  <p className={styles.subCardDescription}>
                    은행명, 계좌번호, 예금주를 한 세트로 입력해 주세요.
                  </p>
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
                    '하이픈을 포함해 적으면 손님이 읽기 더 편합니다.'
                  )}
                  <input
                    className={styles.input}
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
            </div>
          ))
        ) : (
          <div className={styles.emptyCard}>등록된 계좌가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
