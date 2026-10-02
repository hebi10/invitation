import {
  AccountSectionPanel,
  GuideSectionPanel,
} from '@/app/page-wizard/pageWizardEditorPanels';

import TemplateChoiceGroup from '../TemplateChoiceGroup';
import styles from '../page.module.css';
import blockStyles from './WizardVenueBlocks.module.css';
import { renderFieldMeta, type ExtraStepProps } from '../pageWizardShared';

const GIFT_MESSAGE_TEMPLATES = [
  {
    label: '기본 안내',
    value:
      '참석이 어려우신 분들을 위해 계좌번호를 함께 안내드립니다.\n전해 주시는 마음에 깊이 감사드립니다.',
  },
  {
    label: '마음만으로도',
    value:
      '축하해 주시는 따뜻한 마음만으로도 큰 기쁨입니다.\n필요하신 분들을 위해 계좌번호를 함께 남깁니다.',
  },
  {
    label: '정중한 안내',
    value:
      '멀리서도 축복해 주시는 소중한 마음에 감사드립니다.\n전해 주시는 마음은 감사히 받겠습니다.',
  },
] as const;

export default function ExtraStep({
  mode = 'all',
  formState,
  updateForm,
  onAccountAdd,
  onAccountRemove,
  onAccountChange,
  onGuideAdd,
  onGuideRemove,
  onGuideChange,
}: ExtraStepProps & { mode?: 'all' | 'accounts' | 'guides' }) {
  const giftMessage = formState.pageData?.giftInfo?.message ?? '';
  const isFirstBirthday = formState.eventType === 'first-birthday';

  if (formState.eventType === 'opening') {
    return (
      <div className={styles.fieldGrid}>
        <section className={blockStyles.stack}>
          <details className={blockStyles.optional}>
          <summary className={blockStyles.summary}>
            브랜드 소개 <span className={blockStyles.badge}>선택</span>
            <span className={blockStyles.summaryText}>{(formState.pageData?.venueGuide ?? []).length ? `${(formState.pageData?.venueGuide ?? []).length}개 안내 · 열어서 확인 및 수정` : '필요한 안내만 추가해 주세요'}</span>
          </summary>
          <div className={blockStyles.body}>
          <GuideSectionPanel
            kind="venueGuide"
            title="브랜드 소개"
            description="대표 메뉴, 서비스, 공간 콘셉트처럼 매장을 소개할 내용을 적습니다."
            items={formState.pageData?.venueGuide ?? []}
            disabled={false}
            onAdd={onGuideAdd}
            onRemove={onGuideRemove}
            onChange={onGuideChange}
          />
          </div>
        </details>
          <details className={blockStyles.optional}>
          <summary className={blockStyles.summary}>
            오픈 기념 혜택 <span className={blockStyles.badge}>선택</span>
            <span className={blockStyles.summaryText}>{(formState.pageData?.wreathGuide ?? []).length ? `${(formState.pageData?.wreathGuide ?? []).length}개 안내 · 열어서 확인 및 수정` : '필요한 안내만 추가해 주세요'}</span>
          </summary>
          <div className={blockStyles.body}>
          <GuideSectionPanel
            kind="wreathGuide"
            title="오픈 기념 혜택"
            description="할인율, 선착순 혜택, 이벤트 안내를 입력합니다."
            items={formState.pageData?.wreathGuide ?? []}
            disabled={false}
            onAdd={onGuideAdd}
            onRemove={onGuideRemove}
            onChange={onGuideChange}
          />
          </div>
        </details>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.fieldGrid}>
      {mode !== 'guides' ? <>
      <p className={blockStyles.description}>
        계좌 등록은 선택입니다. 등록할 때는 은행명·계좌번호·예금주를 모두 입력해 주세요.
      </p>
      <div className={styles.twoColumnGrid}>
        <AccountSectionPanel
          kind="groomAccounts"
          title={isFirstBirthday ? '아빠 계좌' : '신랑측 계좌'}
          description="최대 3개까지 등록할 수 있습니다."
          accounts={formState.pageData?.giftInfo?.groomAccounts ?? []}
          disabled={false}
          onAdd={onAccountAdd}
          onRemove={onAccountRemove}
          onChange={onAccountChange}
        />
        <AccountSectionPanel
          kind="brideAccounts"
          title={isFirstBirthday ? '엄마 계좌' : '신부측 계좌'}
          description="최대 3개까지 등록할 수 있습니다."
          accounts={formState.pageData?.giftInfo?.brideAccounts ?? []}
          disabled={false}
          onAdd={onAccountAdd}
          onRemove={onAccountRemove}
          onChange={onAccountChange}
        />
      </div>

      <details className={blockStyles.optional}>
        <summary className={blockStyles.summary}>
          {isFirstBirthday ? '마음 전하기 안내 문구' : '축의금 안내 문구'}
          <span className={blockStyles.badge}>선택</span>
          <span className={blockStyles.summaryText}>{giftMessage.trim() || '계좌 앞에 보여줄 문구를 추가할 수 있습니다'}</span>
        </summary>
        <div className={blockStyles.body}>
        <label className={styles.field}>
          {renderFieldMeta(isFirstBirthday ? '마음 전하기 안내 문구' : '축의금 안내 문구', 'optional')}
          <textarea
            className={styles.textarea}
            value={giftMessage}
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
        <TemplateChoiceGroup
          labelId="gift-message-template-title"
          title={isFirstBirthday ? '마음 전하기 템플릿' : '축의금 안내 템플릿'}
          description="문구를 미리 확인한 뒤 적용해 주세요."
          templates={GIFT_MESSAGE_TEMPLATES}
          value={giftMessage}
          onSelect={(value) =>
            updateForm((draft) => {
              if (draft.pageData?.giftInfo) {
                draft.pageData.giftInfo.message = value;
              }
            })
          }
        />
        </div>
      </details>

      </> : null}
      {mode !== 'accounts' ? <section className={blockStyles.stack} aria-label="교통 및 추가 안내" data-preview-step="guide">
        <details className={blockStyles.optional}>
          <summary className={blockStyles.summary}>
            교통 · 방문 안내 <span className={blockStyles.badge}>선택</span>
            <span className={blockStyles.summaryText}>{(formState.pageData?.venueGuide ?? []).length ? `${(formState.pageData?.venueGuide ?? []).length}개 안내 · 열어서 확인 및 수정` : '필요한 안내만 추가해 주세요'}</span>
          </summary>
          <div className={blockStyles.body}>
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
          </div>
        </details>
        <details className={blockStyles.optional}>
          <summary className={blockStyles.summary}>
            {isFirstBirthday ? '추가 안내' : '화환 안내'} <span className={blockStyles.badge}>선택</span>
            <span className={blockStyles.summaryText}>{(formState.pageData?.wreathGuide ?? []).length ? `${(formState.pageData?.wreathGuide ?? []).length}개 안내 · 열어서 확인 및 수정` : '필요한 안내만 추가해 주세요'}</span>
          </summary>
          <div className={blockStyles.body}>
          <GuideSectionPanel
          kind="wreathGuide"
          title={isFirstBirthday ? '추가 안내' : '화환 안내'}
          description={
            isFirstBirthday
              ? '답례품, 포토테이블, 식사 안내처럼 손님에게 필요한 내용을 적습니다.'
              : '화환 전달 관련 안내를 선택적으로 입력합니다.'
          }
          items={formState.pageData?.wreathGuide ?? []}
          disabled={false}
          onAdd={onGuideAdd}
          onRemove={onGuideRemove}
          onChange={onGuideChange}
        />
          </div>
        </details>
      </section> : null}
    </div>
  );
}
