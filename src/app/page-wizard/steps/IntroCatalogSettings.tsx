'use client';

import InvitationIntroPicker from '@/components/sections/InvitationIntro/InvitationIntroPicker';
import { parseInvitationIntroChoice, type InvitationIntroChoice } from '@/lib/invitationIntroCatalog';
import { normalizeEventTypeKey } from '@/lib/eventTypes';
import { normalizeWeddingIntroStyle, WEDDING_INTRO_OPTIONS } from '@/lib/weddingIntro';
import type { WizardStepProps } from '../pageWizardShared';
import styles from './IntroSettings.module.css';

type Props = WizardStepProps & {
  savedValue: InvitationIntroChoice | null;
};

export default function IntroCatalogSettings({ formState, updateForm, savedValue }: Props) {
  const eventType = normalizeEventTypeKey(formState.eventType);
  const selected = parseInvitationIntroChoice(formState.introPresetId, eventType);
  const storedChoice = parseInvitationIntroChoice(formState.introPresetId);
  const unavailableStoredChoice = storedChoice !== null && selected === null;
  const legacyStyle = normalizeWeddingIntroStyle(formState.introStyle);
  const legacyOption = WEDDING_INTRO_OPTIONS.find(option => option.value === legacyStyle);
  const retainsLegacy = selected === null && legacyStyle !== 'none';

  const selectIntro = (value: InvitationIntroChoice) => {
    if (selected === value) return;
    updateForm((draft) => {
      // Do not erase the legacy field: old customers and older Android clients still read it.
      draft.introPresetId = value;
    });
  };

  return (
    <div className={styles.section} data-intro-preset-editor>
      {retainsLegacy ? (
        <p className={styles.description} role="status" data-intro-legacy-status>
          기존 인트로 설정: {legacyOption?.label ?? '기존 연출'}. 새 GIF를 저장하기 전에는 기존 설정을 유지합니다.
        </p>
      ) : null}
      {unavailableStoredChoice ? (
        <p className={styles.description} role="status">
          기존에 저장된 GIF는 이 행사에서 사용할 수 없습니다. 다른 디자인을 선택해 저장하면 변경됩니다.
        </p>
      ) : null}
      <InvitationIntroPicker eventType={eventType} value={selected}
        savedValue={parseInvitationIntroChoice(savedValue, eventType)} onChange={selectIntro} />
      <p className={styles.description}>
        GIF 선택은 이 초대장의 별도 설정으로 저장됩니다. 저장 전 미리보기는 고객 데이터와 공개 상태를 변경하지 않습니다.
      </p>
      <p className={styles.description}>
        저장된 디자인은 초대장 공개 화면에서도 사용되며, 2초 뒤 자동으로 본문을 열지는 않습니다.
      </p>
    </div>
  );
}
