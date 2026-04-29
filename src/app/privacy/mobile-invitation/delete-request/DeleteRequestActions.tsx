'use client';

import { useEffect, useMemo, useState } from 'react';

import styles from '../page.module.css';

interface DeleteRequestActionsProps {
  serviceName: string;
  supportEmail: string;
  supportFormUrl: string;
}

export default function DeleteRequestActions({
  serviceName,
  supportEmail,
  supportFormUrl,
}: DeleteRequestActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const subject = `${serviceName} 계정 및 데이터 삭제 요청`;
  const requestTemplate = useMemo(
    () =>
      [
        `안녕하세요. ${serviceName} 계정 및 데이터 삭제를 요청합니다.`,
        '',
        '1. 계정 이메일:',
        '2. 삭제 요청 범위: 계정 전체 삭제 / 특정 청첩장 삭제 / 일부 데이터 삭제',
        '3. 청첩장 주소 또는 공개 URL:',
        '4. 추가 설명:',
        '',
        '본인 확인이 필요한 경우 이 이메일로 회신해 주세요.',
      ].join('\n'),
    [serviceName]
  );
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(requestTemplate);
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    supportEmail
  )}&su=${encodedSubject}&body=${encodedBody}`;

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} 복사했습니다.`);
    } catch {
      setCopyMessage('복사하지 못했습니다. 직접 선택해서 복사해 주세요.');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <div className={styles.ctaRow}>
        <button
          className={styles.primaryCta}
          type="button"
          onClick={() => {
            setCopyMessage('');
            setIsOpen(true);
          }}
        >
          이메일로 삭제 요청
        </button>
        <a
          className={styles.secondaryCta}
          href={supportFormUrl}
          target="_blank"
          rel="noreferrer"
        >
          문의 폼으로 요청
        </a>
      </div>

      {isOpen ? (
        <div
          className={styles.requestModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <section
            className={styles.requestModalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-request-dialog-title"
          >
            <div className={styles.requestModalHeader}>
              <div>
                <p className={styles.summaryLabel}>Deletion Request</p>
                <h3 className={styles.requestModalTitle} id="delete-request-dialog-title">
                  이메일 삭제 요청
                </h3>
              </div>
              <button
                className={styles.modalCloseButton}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="삭제 요청 팝업 닫기"
              >
                닫기
              </button>
            </div>

            <div className={styles.requestModalBody}>
              <p className={styles.requestModalText}>
                이메일 주소와 요청 양식을 복사하거나 사용하는 웹메일에서 바로 작성할 수 있습니다.
              </p>

              <div className={styles.requestInfoGrid}>
                <span className={styles.requestInfoLabel}>받는 사람</span>
                <strong className={styles.requestInfoValue}>{supportEmail}</strong>
                <span className={styles.requestInfoLabel}>제목</span>
                <strong className={styles.requestInfoValue}>{subject}</strong>
              </div>

              <pre className={styles.requestTemplate}>{requestTemplate}</pre>

              <div className={styles.requestModalActions}>
                <button
                  className={styles.primaryCta}
                  type="button"
                  onClick={() => void copyText(requestTemplate, '요청 양식을')}
                >
                  요청 양식 복사
                </button>
                <button
                  className={styles.secondaryCta}
                  type="button"
                  onClick={() => void copyText(supportEmail, '이메일 주소를')}
                >
                  이메일 주소 복사
                </button>
                <a
                  className={styles.secondaryCta}
                  href={gmailHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Gmail 열기
                </a>
                <a
                  className={styles.secondaryCta}
                  href="https://mail.naver.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  네이버메일 열기
                </a>
              </div>

              {copyMessage ? (
                <p className={styles.copyStatus} role="status" aria-live="polite">
                  {copyMessage}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
