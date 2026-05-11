import assert from 'node:assert/strict';

import {
  filterAssignableEvents,
  getAssignableEventTypeOptions,
} from '../src/app/admin/_components/adminCustomerAssignmentFilters.ts';
import type { AdminCustomerLinkedEventSummary } from '../src/services/adminCustomerService.ts';

const events: AdminCustomerLinkedEventSummary[] = [
  {
    eventId: 'wedding-1',
    slug: 'kim-taehyun-choi-yuna',
    eventType: 'wedding',
    displayName: '김태현 최유나',
    published: false,
    defaultTheme: 'emotional',
    updatedAt: null,
  },
  {
    eventId: 'birthday-1',
    slug: 'birthday-minseo-picnic',
    eventType: 'birthday',
    displayName: '민서의 피크닉 생일',
    published: false,
    defaultTheme: 'birthday-minimal',
    updatedAt: null,
  },
  {
    eventId: 'opening-1',
    slug: 'opening-green-table',
    eventType: 'opening',
    displayName: '그린테이블 오픈',
    published: false,
    defaultTheme: 'opening-natural',
    updatedAt: null,
  },
];

assert.deepEqual(
  getAssignableEventTypeOptions(events).map((option) => option.value),
  ['all', 'wedding', 'first-birthday', 'birthday', 'general-event', 'opening'],
  'assignment event type select should expose all enabled event types plus all'
);

assert.deepEqual(
  getAssignableEventTypeOptions(events).map((option) => option.label),
  [
    '전체 이벤트 (미연결 3개)',
    '모바일 청첩장 (미연결 1개)',
    '돌잔치 초대장 (미연결 0개)',
    '생일 초대장 (미연결 1개)',
    '일반 행사 초대장 (미연결 0개)',
    '개업 초대장 (미연결 1개)',
  ],
  'assignment event type options should show unassigned counts'
);

assert.deepEqual(
  filterAssignableEvents(events, 'birthday', '').map((event) => event.slug),
  ['birthday-minseo-picnic'],
  'event type select should limit invitation options'
);

assert.deepEqual(
  filterAssignableEvents(events, 'all', 'green').map((event) => event.slug),
  ['opening-green-table'],
  'search input should match display name and slug'
);

assert.deepEqual(
  filterAssignableEvents(events, 'wedding', '생일').map((event) => event.slug),
  [],
  'search should be applied inside the selected event type'
);

console.log('admin customer account assignment filter checks passed');
