export const EVENT_TYPE_KEYS = ['wedding', 'birthday', 'seventieth', 'etc'] as const;

export type EventTypeKey = (typeof EVENT_TYPE_KEYS)[number];

export interface EventTypeMeta {
  key: EventTypeKey;
  label: string;
  adminLabel: string;
  customerLabel: string;
  description: string;
  enabled: boolean;
  defaultRendererKey: string;
  defaultEditorKey: string;
  defaultWizardStepConfigKey: string;
}

export const DEFAULT_EVENT_TYPE: EventTypeKey = 'wedding';
export type EventTypeLabelAudience = 'default' | 'admin' | 'customer';

export const EVENT_TYPE_META = {
  wedding: {
    key: 'wedding',
    label: '모바일 청첩장',
    adminLabel: '청첩장',
    customerLabel: '내 청첩장',
    description: '모바일 청첩장 생성과 공개 페이지 렌더링에 사용하는 기본 이벤트 타입입니다.',
    enabled: true,
    defaultRendererKey: 'wedding-default',
    defaultEditorKey: 'wedding-page-editor',
    defaultWizardStepConfigKey: 'wedding-page-wizard',
  },
  birthday: {
    key: 'birthday',
    label: '생일/돌잔치',
    adminLabel: '생일/돌잔치',
    customerLabel: '내 생일/돌잔치 페이지',
    description:
      'birthday PoC용 이벤트 타입입니다. 현재는 wedding 본문 구조와 renderer를 재사용하면서 생성부터 공개까지 흐름을 검증합니다.',
    enabled: true,
    defaultRendererKey: 'birthday-default',
    defaultEditorKey: 'birthday-page-editor',
    defaultWizardStepConfigKey: 'birthday-page-wizard',
  },
  seventieth: {
    key: 'seventieth',
    label: '칠순 잔치',
    adminLabel: '칠순 잔치',
    customerLabel: '내 칠순 잔치 페이지',
    description: '칠순 잔치 이벤트 타입 준비용 레지스트리 항목입니다.',
    enabled: false,
    defaultRendererKey: 'seventieth-default',
    defaultEditorKey: 'seventieth-page-editor',
    defaultWizardStepConfigKey: 'seventieth-page-wizard',
  },
  etc: {
    key: 'etc',
    label: '기타 이벤트',
    adminLabel: '기타 이벤트',
    customerLabel: '내 이벤트 페이지',
    description: '아직 전용 renderer/editor가 없는 이벤트를 임시로 수용하는 타입입니다.',
    enabled: false,
    defaultRendererKey: 'generic-default',
    defaultEditorKey: 'generic-page-editor',
    defaultWizardStepConfigKey: 'generic-page-wizard',
  },
} satisfies Record<EventTypeKey, EventTypeMeta>;

export function isEventTypeKey(value: unknown): value is EventTypeKey {
  return typeof value === 'string' && EVENT_TYPE_KEYS.includes(value as EventTypeKey);
}

export function normalizeEventTypeKey(
  value: unknown,
  fallback: EventTypeKey = DEFAULT_EVENT_TYPE
): EventTypeKey {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();
  return isEventTypeKey(normalizedValue) ? normalizedValue : fallback;
}

export function getEventTypeMeta(value: unknown) {
  const eventType = normalizeEventTypeKey(value);
  return EVENT_TYPE_META[eventType];
}

export function getEventTypeDisplayLabel(
  value: unknown,
  audience: EventTypeLabelAudience = 'default'
) {
  const meta = getEventTypeMeta(value);

  switch (audience) {
    case 'admin':
      return meta.adminLabel;
    case 'customer':
      return meta.customerLabel;
    default:
      return meta.label;
  }
}

export function listEnabledEventTypes() {
  return EVENT_TYPE_KEYS.filter((key) => EVENT_TYPE_META[key].enabled);
}
