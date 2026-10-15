import { useId } from 'react';
import {
  normalizeWeddingCoverSettings,
  type WeddingCoverSettings as CoverSettings,
} from '@/lib/weddingCover';

import styles from './WeddingCoverSettings.module.css';

interface WeddingCoverSettingsProps {
  settings?: CoverSettings;
  hasImage: boolean;
  isImageBroken: boolean;
  onChange: (settings: CoverSettings) => void;
  onPreviewFocus: () => void;
}

export default function WeddingCoverSettings({
  settings,
  hasImage,
  isImageBroken,
  onChange,
  onPreviewFocus,
}: WeddingCoverSettingsProps) {
  const id = useId();
  const value = normalizeWeddingCoverSettings(settings);
  const canAdjustFocus = hasImage && !isImageBroken;
  const focusHint = !hasImage
    ? '대표 사진을 등록하면 초점을 조절할 수 있습니다.'
    : isImageBroken
      ? '대표 사진을 불러오지 못했습니다. 사진을 다시 등록해 주세요.'
      : '미리보기에서 얼굴이나 중요한 부분을 확인해 주세요. 사진이 잘리는 방향에만 초점 이동이 반영됩니다.';

  const changeFocus = (axis: 'focusX' | 'focusY', next: number) => {
    if (canAdjustFocus) onChange(normalizeWeddingCoverSettings({ ...value, [axis]: next }));
  };

  return <section className={styles.panel} aria-label="표지 배치"
    onFocusCapture={onPreviewFocus} onPointerDownCapture={onPreviewFocus}>
    <div className={styles.heading}>
      <div>
        <h3 className={styles.title}>표지 배치</h3>
        <p className={styles.description}>대표 사진의 초점과 이름의 위치를 조절합니다. 날짜와 장소는 사진 아래에 표시됩니다.</p>
      </div>
      <button className={styles.button} type="button" onClick={onPreviewFocus}>표지 미리보기</button>
    </div>

    <fieldset className={styles.focusFields} aria-describedby={`${id}-focus-hint`}>
      <legend>사진 초점</legend>
      <div className={styles.sliders}>
        <div className={styles.sliderField}>
          <label className={styles.label} htmlFor={`${id}-focus-x`}>
            <span>가로 초점</span><output htmlFor={`${id}-focus-x`}>{value.focusX}%</output>
          </label>
          <input id={`${id}-focus-x`} type="range" min="0" max="100" step="1"
            value={value.focusX} disabled={!canAdjustFocus}
            onChange={event => changeFocus('focusX', Number(event.currentTarget.value))} />
          <div className={styles.rangeEnds} aria-hidden="true"><span>왼쪽</span><span>오른쪽</span></div>
        </div>
        <div className={styles.sliderField}>
          <label className={styles.label} htmlFor={`${id}-focus-y`}>
            <span>세로 초점</span><output htmlFor={`${id}-focus-y`}>{value.focusY}%</output>
          </label>
          <input id={`${id}-focus-y`} type="range" min="0" max="100" step="1"
            value={value.focusY} disabled={!canAdjustFocus}
            onChange={event => changeFocus('focusY', Number(event.currentTarget.value))} />
          <div className={styles.rangeEnds} aria-hidden="true"><span>위쪽</span><span>아래쪽</span></div>
        </div>
      </div>
      <div className={styles.focusFooter}>
        <p id={`${id}-focus-hint`} className={styles.description}>{focusHint}</p>
        <button className={styles.button} type="button" disabled={!canAdjustFocus}
          onClick={() => {
            if (canAdjustFocus) onChange({ ...value, focusX: 50, focusY: 50 });
          }}>초점 중앙으로</button>
      </div>
    </fieldset>

    <div className={styles.positionField}>
      <label className={styles.label} htmlFor={`${id}-position`}>이름 위치</label>
      <select id={`${id}-position`} value={value.textPosition} aria-describedby={`${id}-position-hint`}
        onChange={event => onChange(normalizeWeddingCoverSettings({ ...value, textPosition: event.currentTarget.value }))}>
        <option value="theme">디자인 기본</option>
        <option value="below">사진 아래</option>
        <option value="top">사진 위쪽</option>
        <option value="bottom">사진 아래쪽</option>
      </select>
      <p id={`${id}-position-hint`} className={styles.description}>‘사진 위쪽’과 ‘사진 아래쪽’은 사진 위에 이름을 겹쳐 표시합니다. 사진을 바꾸어도 설정은 유지됩니다.</p>
    </div>
  </section>;
}
