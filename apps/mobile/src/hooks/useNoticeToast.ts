import { useEffect, useRef } from 'react';

import {
  type AppToastTone,
  useAppFeedback,
} from '../contexts/AppFeedbackContext';

const SUCCESS_KEYWORDS = [
  '저장했습니다.',
  '생성했습니다.',
  '업로드했습니다.',
  '삭제했습니다.',
  '전환했습니다.',
  '추가했습니다.',
  '연장했습니다.',
  '새로고침했습니다.',
  '이동했습니다.',
  '복구했습니다.',
];

const ERROR_KEYWORDS = [
  '실패',
  '못했습니다.',
  '오류',
  '만료',
];

function inferToastTone(message: string): AppToastTone {
  if (ERROR_KEYWORDS.some((keyword) => message.includes(keyword))) {
    return 'error';
  }

  if (SUCCESS_KEYWORDS.some((keyword) => message.includes(keyword))) {
    return 'success';
  }

  return 'notice';
}

export function useNoticeToast(
  message: string | null | undefined,
  options: {
    tone?: AppToastTone;
  } = {}
) {
  const { showToast } = useAppFeedback();
  const lastMessageRef = useRef('');

  useEffect(() => {
    const nextMessage = typeof message === 'string' ? message.trim() : '';

    if (!nextMessage) {
      lastMessageRef.current = '';
      return;
    }

    if (lastMessageRef.current === nextMessage) {
      return;
    }

    lastMessageRef.current = nextMessage;
    showToast(nextMessage, {
      tone: options.tone ?? inferToastTone(nextMessage),
    });
  }, [message, options.tone, showToast]);
}
