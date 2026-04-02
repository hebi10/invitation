import type { BankAccount, PersonInfo } from '@/types/invitationPage';

import styles from './page.module.css';

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
        <h3 className={styles.subCardTitle}>{label}</h3>
      </div>

      <div className={styles.fieldGrid}>
        {(['name', 'order', 'phone'] as const).map((field) => (
          <label key={field} className={styles.field}>
            <span className={styles.label}>
              {field === 'name' ? '이름' : field === 'order' ? '호칭' : '연락처'}
            </span>
            <input
              className={styles.input}
              value={person[field] ?? ''}
              onChange={(event) =>
                onPersonFieldChange(role, field, event.target.value)
              }
              disabled={disabled}
            />
          </label>
        ))}
      </div>

      {(['father', 'mother'] as const).map((parentRole) => {
        const parent = person[parentRole];

        return (
          <div key={parentRole} className={styles.nestedCard}>
            <h4 className={styles.nestedCardTitle}>
              {parentRole === 'father' ? '아버님 정보' : '어머님 정보'}
            </h4>

            <div className={styles.fieldGrid}>
              {(['relation', 'name', 'phone'] as const).map((field) => (
                <label key={field} className={styles.field}>
                  <span className={styles.label}>
                    {field === 'relation'
                      ? '관계'
                      : field === 'name'
                        ? '이름'
                        : '연락처'}
                  </span>
                  <input
                    className={styles.input}
                    value={parent?.[field] ?? ''}
                    onChange={(event) =>
                      onParentFieldChange(
                        role,
                        parentRole,
                        field,
                        event.target.value
                      )
                    }
                    disabled={disabled}
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}
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
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionDescription}>{description}</p>
        </div>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => onAdd(kind)}
          disabled={disabled}
        >
          항목 추가
        </button>
      </div>

      <div className={styles.stackColumn}>
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={`${kind}-${index}`} className={styles.subCard}>
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
                  <span className={styles.label}>제목</span>
                  <input
                    className={styles.input}
                    value={item.title}
                    onChange={(event) =>
                      onChange(kind, index, 'title', event.target.value)
                    }
                    disabled={disabled}
                  />
                </label>

                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>내용</span>
                  <textarea
                    className={styles.textarea}
                    value={item.content}
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
  return (
    <div className={styles.subCard}>
      <div className={styles.subCardHeader}>
        <div>
          <h3 className={styles.subCardTitle}>{title}</h3>
          <p className={styles.subCardDescription}>{description}</p>
        </div>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => onAdd(kind)}
          disabled={disabled}
        >
          계좌 추가
        </button>
      </div>

      <div className={styles.stackColumn}>
        {accounts.length > 0 ? (
          accounts.map((account, index) => (
            <div key={`${kind}-${index}`} className={styles.nestedCard}>
              <div className={styles.subCardHeader}>
                <h4 className={styles.nestedCardTitle}>계좌 {index + 1}</h4>
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
                {(['bank', 'accountNumber', 'accountHolder'] as const).map((field) => (
                  <label key={field} className={styles.field}>
                    <span className={styles.label}>
                      {field === 'bank'
                        ? '은행명'
                        : field === 'accountNumber'
                          ? '계좌번호'
                          : '예금주'}
                    </span>
                    <input
                      className={styles.input}
                      value={account[field]}
                      onChange={(event) =>
                        onChange(kind, index, field, event.target.value)
                      }
                      disabled={disabled}
                    />
                  </label>
                ))}
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
