import {
  formatWeddingTimeLabel,
  isValidWeddingDateTime,
} from '../../../../../src/contracts/weddingDateTime';
import type { MobileInvitationSeed } from '../../types/mobileInvitation';

export type WeddingDateTimeInputs = {
  weddingDateInput: string;
  weddingTimeInput: string;
};

type StoredWeddingSchedule = Pick<MobileInvitationSeed, 'date' | 'weddingDateTime' | 'pageData'>;

const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const twoDigits = (value: number) => String(value).padStart(2, '0');

function parseInput({ weddingDateInput, weddingTimeInput }: WeddingDateTimeInputs) {
  if (!/^\d{8}$/.test(weddingDateInput) || !/^\d{4}$/.test(weddingTimeInput)) return null;

  const dateTime = {
    year: Number(weddingDateInput.slice(0, 4)),
    month: Number(weddingDateInput.slice(4, 6)) - 1,
    day: Number(weddingDateInput.slice(6, 8)),
    hour: Number(weddingTimeInput.slice(0, 2)),
    minute: Number(weddingTimeInput.slice(2, 4)),
  };
  return isValidWeddingDateTime(dateTime) ? dateTime : null;
}

function parseLegacyTime(value: string) {
  const time = value.trim().match(/^(?:(오전|오후)\s*)?(\d{1,2})(?::(\d{2})|\s*시(?:\s*(\d{1,2})\s*분)?)$/);
  if (!time) return null;
  const [, period, hourText, colonMinute, koreanMinute] = time;
  const clockHour = Number(hourText);
  const minute = Number(colonMinute ?? koreanMinute ?? '0');
  if (minute > 59 || (period ? clockHour < 1 || clockHour > 12 : clockHour > 23)) return null;
  return {
    hour: period ? clockHour % 12 + (period === '오후' ? 12 : 0) : clockHour,
    minute,
  };
}

function readLegacySchedule(config: StoredWeddingSchedule) {
  const dateText = config.date?.trim() ?? '';
  const scheduleTime = config.pageData?.ceremony?.time?.trim() || config.pageData?.ceremonyTime?.trim() || '';
  const date = dateText.match(/^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*[일월화수목금토]요일)?/) ??
    dateText.match(/^(\d{4})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})(?:\s*\.)?/);
  const parts = date ? { year: Number(date[1]), month: Number(date[2]) - 1, day: Number(date[3]) } : null;
  const dateParts = parts && isValidWeddingDateTime({ ...parts, hour: 0, minute: 0 }) ? parts : null;
  const inlineText = date ? dateText.slice(date[0].length).trim().replace(/^[·,]\s*/, '') : '';
  const inlineTime = parseLegacyTime(inlineText);
  const separateTime = parseLegacyTime(scheduleTime);
  const time = inlineText ? inlineTime : separateTime;
  const conflictingTimes = inlineTime && separateTime &&
    (inlineTime.hour !== separateTime.hour || inlineTime.minute !== separateTime.minute);
  return {
    dateParts,
    inlineTime,
    separateTime,
    dateTime: dateParts && time && !conflictingTimes ? { ...dateParts, ...time } : null,
    label: [...new Set([dateText, scheduleTime].filter(Boolean))].join(' · '),
  };
}

export function readWeddingDateTimeInputs(config: StoredWeddingSchedule) {
  const legacy = readLegacySchedule(config);
  let dateTime = legacy.dateTime;
  let legacyLabel = '';
  if (isValidWeddingDateTime(config.weddingDateTime)) {
    const stored = config.weddingDateTime;
    const { year, month, day, hour, minute } = stored;
    const differentDate = legacy.dateParts &&
      (legacy.dateParts.year !== year || legacy.dateParts.month !== month || legacy.dateParts.day !== day);
    const differentTime = [legacy.inlineTime, legacy.separateTime].some(
      (time) => time && (time.hour !== hour || time.minute !== minute)
    );
    if (differentDate || differentTime) {
      dateTime = null;
      legacyLabel = `표지 ${legacy.label} / 달력 ${year}년 ${month + 1}월 ${day}일 ${formatWeddingTimeLabel(stored)}`;
    } else {
      dateTime = stored;
    }
  } else if (!dateTime) {
    legacyLabel = legacy.label;
  }
  return {
    weddingDateInput: dateTime ? `${dateTime.year}${twoDigits(dateTime.month + 1)}${twoDigits(dateTime.day)}` : '',
    weddingTimeInput: dateTime ? `${twoDigits(dateTime.hour)}${twoDigits(dateTime.minute)}` : '',
    legacyWeddingDateTimeLabel: legacyLabel,
  };
}

export function getWeddingDateTimeInputError(inputs: WeddingDateTimeInputs, required = false) {
  const { weddingDateInput, weddingTimeInput } = inputs;
  if (!required && !weddingDateInput && !weddingTimeInput) return null;
  if (!weddingDateInput || !weddingTimeInput) return '예식 날짜와 시간을 모두 입력해 주세요.';
  if (!parseInput({ weddingDateInput, weddingTimeInput: '0000' })) {
    return '실제 예식 날짜를 숫자 8자리로 입력해 주세요. 예: 20270506';
  }
  if (!parseInput(inputs)) return '예식 시간을 24시간제 숫자 4자리로 입력해 주세요. 예: 1430';
  return null;
}

export function resolveWeddingDateTimeForSave(config: StoredWeddingSchedule, inputs: WeddingDateTimeInputs) {
  const saved = readWeddingDateTimeInputs(config);
  const unchanged = inputs.weddingDateInput === saved.weddingDateInput && inputs.weddingTimeInput === saved.weddingTimeInput;
  if (unchanged && isValidWeddingDateTime(config.weddingDateTime)) return null;

  const dateTime = parseInput(inputs);
  if (!dateTime) return null;

  const { year, month, day } = dateTime;
  const weekday = weekdays[new Date(Date.UTC(year, month, day)).getUTCDay()];
  return {
    date: `${year}년 ${month + 1}월 ${day}일 ${weekday}`,
    time: formatWeddingTimeLabel(dateTime),
    weddingDateTime: dateTime,
  };
}
