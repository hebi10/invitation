'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { EventTypeKey } from '@/lib/eventTypes';
import {
  getInvitationIntroPreset,
  listAvailableInvitationIntroPresets,
  listAvailableInvitationIntroGroups,
  type InvitationIntroGroup,
  type InvitationIntroChoice,
  type InvitationIntroPresetId,
} from '@/lib/invitationIntroCatalog';
import styles from './InvitationIntroPicker.module.css';

type Props = {
  value: InvitationIntroChoice | null;
  eventType?: EventTypeKey;
  onChange: (value: InvitationIntroChoice) => void;
  savedValue?: InvitationIntroChoice | null;
  disabled?: boolean;
};

export default function InvitationIntroPicker({ value, onChange, savedValue, disabled = false, eventType = 'wedding' }: Props) {
  const groupId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [previewId, setPreviewId] = useState<InvitationIntroPresetId | null>(null);
  const [activeGroup, setActiveGroup] = useState<InvitationIntroGroup | 'all'>('all');
  const [replayKey, setReplayKey] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [allowMotion, setAllowMotion] = useState(false);
  const preview = getInvitationIntroPreset(previewId, eventType);
  const options = listAvailableInvitationIntroPresets(eventType);
  const groups = listAvailableInvitationIntroGroups(eventType);
  const visibleGroup = activeGroup === 'all' || groups.some((group) => group.id === activeGroup)
    ? activeGroup : 'all';
  const visiblePresets = options.filter((preset) => visibleGroup === 'all' || preset.group === visibleGroup);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAllowMotion(!media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (preview && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [preview]);

  const openPreview = (id: InvitationIntroPresetId, trigger: HTMLButtonElement) => {
    previewTriggerRef.current = trigger;
    setImageError(false);
    setReplayKey((current) => current + 1);
    setPreviewId(id);
  };

  const closePreview = () => {
    dialogRef.current?.close();
  };

  const onDialogClose = () => {
    setPreviewId(null);
    setImageError(false);
    previewTriggerRef.current?.focus();
  };

  return (
    <section className={styles.picker} aria-labelledby={groupId + '-title'}>
      <div className={styles.introduction}>
        <h3 id={groupId + '-title'}>인트로 선택</h3>
        <p>원하는 연출을 미리 보고 선택해 주세요. 선택만으로 저장되지는 않습니다.</p>
      </div>
      <div className={styles.groupFilter} role="group" aria-label="인트로 스타일 분류">
        <button type="button" className={styles.groupButton} aria-pressed={visibleGroup === 'all'}
          data-intro-group="all" disabled={disabled} onClick={() => setActiveGroup('all')}>
          전체 {options.length}
        </button>
        {groups.map((group) => (
          <button key={group.id} type="button" className={styles.groupButton}
            aria-pressed={visibleGroup === group.id} data-intro-group={group.id}
            disabled={disabled} onClick={() => setActiveGroup(group.id)}>
            {group.label} {options.filter((preset) => preset.group === group.id).length}
          </button>
        ))}
      </div>
      <fieldset className={styles.options} disabled={disabled}>
        <legend>인트로 디자인 선택</legend>
        <div className={styles.grid}>
          <label className={styles.option} data-selected={value === 'none'}>
            <span className={styles.posterNone} aria-hidden="true">인트로 없음</span>
            <span className={styles.optionContent}>
              <input type="radio" name={groupId} value="none" checked={value === 'none'}
                onChange={() => onChange('none')} />
              <span className={styles.optionText}>
                <strong>사용 안 함</strong>
                <span>초대장 본문을 바로 표시합니다.</span>
              </span>
            </span>
            {savedValue === 'none' ? <span className={styles.saved}>현재 적용 중</span> : null}
          </label>
          {visiblePresets.map((preset) => (
            <div className={styles.option} data-selected={value === preset.id} key={preset.id}
              data-intro-preset={preset.id}>
              <label className={styles.optionChoice}>
                <img className={styles.poster} src={preset.posterSrc} width={480} height={600}
                  alt="" loading="lazy" aria-hidden="true" />
                <span className={styles.optionContent}>
                  <input type="radio" name={groupId} value={preset.id} checked={value === preset.id}
                    onChange={() => onChange(preset.id)} />
                  <span className={styles.optionText}>
                    <strong>{preset.label}</strong>
                    <span>{preset.description}</span>
                    <span>{(preset.durationMs / 1000).toFixed(1)}초</span>
                  </span>
                </span>
              </label>
              {savedValue === preset.id ? <span className={styles.saved}>현재 적용 중</span> : null}
              <button type="button" className={styles.previewButton} disabled={disabled}
                onClick={(event) => openPreview(preset.id, event.currentTarget)}>
                GIF 미리보기
              </button>
            </div>
          ))}
        </div>
      </fieldset>
      <p className={styles.groupSummary} role="status">{visiblePresets.length}개의 디자인을 표시하고 있습니다.</p>
      {savedValue !== undefined && value !== savedValue ? (
        <p className={styles.pending} role="status">선택이 변경되었습니다. 저장하면 적용됩니다.</p>
      ) : null}
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={groupId + '-preview-title'}
        onClose={onDialogClose}>
        {preview ? (
          <div className={styles.preview}>
            <h3 id={groupId + '-preview-title'}>{preview.label} 미리보기</h3>
            <p>{(preview.durationMs / 1000).toFixed(1)}초 동안 재생되는 인트로입니다. 저장 상태는 변경되지 않습니다.</p>
            <div className={styles.previewSurface} data-motion={allowMotion && !imageError ? 'gif' : 'poster'}>
              {allowMotion && !imageError ? (
                <img key={preview.id + ':' + replayKey} src={preview.gifSrc} width={480} height={600}
                  alt="" onError={() => setImageError(true)} />
              ) : (
                <img src={preview.posterSrc} width={480} height={600} alt="" />
              )}
            </div>
            {!allowMotion ? <p role="status">동작 줄이기 설정에 따라 정지 이미지를 표시합니다.</p> : null}
            {imageError ? <p role="status">애니메이션을 불러오지 못해 정지 이미지를 표시합니다.</p> : null}
            <div className={styles.previewActions}>
              <button type="button" disabled={!allowMotion} onClick={() => {
                setImageError(false);
                setReplayKey((current) => current + 1);
              }}>다시 보기</button>
              <button type="button" onClick={closePreview}>닫기</button>
            </div>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
