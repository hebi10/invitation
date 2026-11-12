'use client';

import { useEffect, useState } from 'react';
import IntroCatalogSettings from '../page-wizard/steps/IntroCatalogSettings';
import { normalizeFormConfig } from '../page-wizard/pageWizardEditorUtils';
import { prepareWizardConfigForSave } from '../page-wizard/pageWizardData';
import { getRequiredWeddingPageBySlug } from '@/config/weddingPages';
import { listEnabledEventTypes, getEventTypeMeta, type EventTypeKey } from '@/lib/eventTypes';
import { mergeInvitationPageSeed } from '@/lib/invitationPagePersistence';
import { parseInvitationIntroChoice } from '@/lib/invitationIntroCatalog';
import type { InvitationPageSeed } from '@/types/invitationPage';

const initialPage = getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna');

function fixture(eventType: EventTypeKey): InvitationPageSeed {
  return normalizeFormConfig({
    ...structuredClone(initialPage),
    eventType,
    introStyle: eventType === 'wedding' ? 'cinema' : 'none',
    displayName: initialPage.displayName || '초대장 테스트',
  });
}

export default function IntroCatalogEditorQaClient() {
  const [eventType, setEventType] = useState<EventTypeKey>('wedding');
  const [saved, setSaved] = useState<InvitationPageSeed>(() => fixture('wedding'));
  const [form, setForm] = useState<InvitationPageSeed>(() => fixture('wedding'));
  const [hydrated, setHydrated] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => { setHydrated(true); }, []);

  const updateForm = (updater: (draft: InvitationPageSeed) => void) => {
    setForm((current) => {
      const copy = structuredClone(current);
      updater(copy);
      return copy;
    });
  };

  const onSave = () => {
    const prepared = prepareWizardConfigForSave(form, saved.slug);
    const reloaded = mergeInvitationPageSeed(saved, prepared as unknown as Record<string, unknown>);
    if (!reloaded) {
      setError('저장/복원 검증에 실패했습니다.');
      return;
    }
    setSaved(reloaded);
    setForm(normalizeFormConfig(reloaded));
    setSaveCount((current) => current + 1);
    setError('');
  };

  const changeEventType = (value: EventTypeKey) => {
    const next = fixture(value);
    setEventType(value);
    setSaved(next);
    setForm(next);
    setSaveCount(0);
    setError('');
  };

  return (
    <main data-intro-editor-qa data-ready={hydrated ? 'true' : 'false'}
      style={{ maxWidth: 960, margin: 'auto', padding: 16, color: '#242424' }}>
      <h1>PC 고객 인트로 선택·저장 QA</h1>
      <p>개발용 가상 데이터입니다. 실제 계정·Firebase에 저장하지 않습니다.</p>
      <label style={{ display: 'grid', gap: 6 }}>
        이벤트 종류
        <select value={eventType} onChange={(event) => changeEventType(event.target.value as EventTypeKey)}
          data-qa-event-type style={{ padding: 12 }}>
          {listEnabledEventTypes().map((type) => (
            <option key={type} value={type}>{getEventTypeMeta(type).label}</option>
          ))}
        </select>
      </label>
      <IntroCatalogSettings formState={form} previewFormState={form}
        savedValue={parseInvitationIntroChoice(saved.introPresetId)} updateForm={updateForm} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
        <button type="button" onClick={onSave} data-qa-save style={{ minHeight: 48, padding: 12 }}>저장 검증</button>
        <button type="button" onClick={() => setForm(normalizeFormConfig(saved))} data-qa-reset
          style={{ minHeight: 48, padding: 12 }}>미저장 변경 취소</button>
      </div>
      <p role="status" data-qa-summary>
        이벤트: {eventType} · 미저장 선택: {parseInvitationIntroChoice(form.introPresetId) ?? '미선택'}
        {' · '}저장값: {parseInvitationIntroChoice(saved.introPresetId) ?? '기존 설정'} · 저장 성공 {saveCount}회
      </p>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
