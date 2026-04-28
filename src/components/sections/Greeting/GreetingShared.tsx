'use client';

import { useEffect, useRef, useState } from 'react';

export interface FamilyMember {
  relation: string;
  name: string;
  phone?: string;
}

export interface PersonInfo {
  name: string;
  order?: string;
  father?: FamilyMember;
  mother?: FamilyMember;
  phone?: string;
}

export interface GreetingProps {
  message: string;
  author?: string;
  groom?: PersonInfo;
  bride?: PersonInfo;
}

interface GreetingSharedProps extends GreetingProps {
  styles: Record<string, string>;
  wrapInCard?: boolean;
}

interface ContactTarget {
  name: string;
  phone?: string;
}

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function hasFamilyMemberContent(member?: FamilyMember) {
  return Boolean(
    hasText(member?.relation) || hasText(member?.name) || hasText(member?.phone)
  );
}

function hasPersonContent(person?: PersonInfo) {
  return Boolean(
    hasText(person?.name) ||
      hasText(person?.order) ||
      hasText(person?.phone) ||
      hasFamilyMemberContent(person?.father) ||
      hasFamilyMemberContent(person?.mother)
  );
}

export default function GreetingShared({
  message,
  author,
  groom,
  bride,
  styles,
  wrapInCard = false,
}: GreetingSharedProps) {
  const [contactModal, setContactModal] = useState<ContactTarget | null>(null);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const modalCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalTriggerRef = useRef<HTMLElement | null>(null);
  const hasMessage = hasText(message);
  const hasAuthor = hasText(author);
  const hasGroomInfo = hasPersonContent(groom);
  const hasBrideInfo = hasPersonContent(bride);
  const showFamilySection = hasGroomInfo || hasBrideInfo;

  const formatMessage = (text: string) => {
    const normalizedText = text.replace(/<br\s*\/?>/gi, '\n');
    const lines = normalizedText.split('\n');

    return lines.map((line, index) => (
      <span key={`${line}-${index}`} className={styles.messageLine}>
        {line}
        {index < lines.length - 1 && <br />}
      </span>
    ));
  };

  const openContactModal = (person: ContactTarget, triggerElement?: HTMLElement | null) => {
    if (triggerElement) {
      modalTriggerRef.current = triggerElement;
    } else if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      modalTriggerRef.current = document.activeElement;
    }
    setContactModal(person);
  };

  const closeContactModal = () => {
    setContactModal(null);
  };

  useEffect(() => {
    if (!contactModal) {
      const trigger = modalTriggerRef.current;
      if (trigger && typeof trigger.focus === 'function') {
        trigger.focus();
      }
      modalTriggerRef.current = null;
      return;
    }

    modalCloseButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeContactModal();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const modal = modalContentRef.current;
      if (!modal) {
        return;
      }

      const focusableElements = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.tabIndex !== -1 && element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        modalCloseButtonRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const isInsideModal = activeElement ? modal.contains(activeElement) : false;

      if (event.shiftKey) {
        if (!isInsideModal || activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (!isInsideModal || activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contactModal]);

  if (!hasMessage && !showFamilySection) {
    return null;
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleSMS = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  const renderPhoneButton = (person: ContactTarget) => {
    if (!person.phone) {
      return null;
    }

    return (
      <button
        type="button"
        className={styles.iconBtn}
        onClick={(event) => openContactModal(person, event.currentTarget)}
        aria-label={`${person.name} 연락하기`}
        title="연락하기"
      >
        <span aria-hidden="true">✆</span>
      </button>
    );
  };

  const content = (
    <>
      {hasMessage && (
        <div className={styles.messageWrapper}>
          <p className={styles.message}>{formatMessage(message)}</p>
        </div>
      )}

      {hasAuthor && (
        <div className={styles.authorWrapper}>
          <p className={styles.author}>{author}</p>
        </div>
      )}

      {showFamilySection && (
        <div className={styles.familySection}>
          <div className={styles.familyGrid}>
            {hasGroomInfo && groom && (() => {
              const groomFather = groom.father;
              const groomMother = groom.mother;

              return (
                <div className={styles.familyColumn}>
                  <div className={styles.roleLabel}>신랑측</div>
                  {groomFather && hasFamilyMemberContent(groomFather) && (
                    <div className={styles.familyRow}>
                      <span className={styles.label}>{groomFather.relation}</span>
                      <span className={styles.personName}>{groomFather.name}</span>
                      {renderPhoneButton({ name: groomFather.name, phone: groomFather.phone })}
                    </div>
                  )}
                  {groomMother && hasFamilyMemberContent(groomMother) && (
                    <div className={styles.familyRow}>
                      <span className={styles.label}>{groomMother.relation}</span>
                      <span className={styles.personName}>{groomMother.name}</span>
                      {renderPhoneButton({ name: groomMother.name, phone: groomMother.phone })}
                    </div>
                  )}
                  {(hasText(groom.order) || hasText(groom.name) || hasText(groom.phone)) && (
                    <div className={`${styles.familyRow} ${styles.mainPerson}`}>
                      {groom.order && <span className={styles.orderBadge}>{groom.order}</span>}
                      <span className={styles.mainName}>{groom.name}</span>
                      {renderPhoneButton({ name: groom.name || '신랑', phone: groom.phone })}
                    </div>
                  )}
                </div>
              );
            })()}

            {hasBrideInfo && bride && (() => {
              const brideFather = bride.father;
              const brideMother = bride.mother;

              return (
                <div className={styles.familyColumn}>
                  <div className={styles.roleLabel}>신부측</div>
                  {brideFather && hasFamilyMemberContent(brideFather) && (
                    <div className={styles.familyRow}>
                      <span className={styles.label}>{brideFather.relation}</span>
                      <span className={styles.personName}>{brideFather.name}</span>
                      {renderPhoneButton({ name: brideFather.name, phone: brideFather.phone })}
                    </div>
                  )}
                  {brideMother && hasFamilyMemberContent(brideMother) && (
                    <div className={styles.familyRow}>
                      <span className={styles.label}>{brideMother.relation}</span>
                      <span className={styles.personName}>{brideMother.name}</span>
                      {renderPhoneButton({ name: brideMother.name, phone: brideMother.phone })}
                    </div>
                  )}
                  {(hasText(bride.order) || hasText(bride.name) || hasText(bride.phone)) && (
                    <div className={`${styles.familyRow} ${styles.mainPerson}`}>
                      {bride.order && <span className={styles.orderBadge}>{bride.order}</span>}
                      <span className={styles.mainName}>{bride.name}</span>
                      {renderPhoneButton({ name: bride.name || '신부', phone: bride.phone })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );

  return (
    <section className={styles.container}>
      {wrapInCard && 'card' in styles ? <div className={styles.card}>{content}</div> : content}

      {contactModal && (
        <div className={styles.modalOverlay} onClick={closeContactModal}>
          <div
            ref={modalContentRef}
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-label={`${contactModal.name} 연락처`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={modalCloseButtonRef}
              className={styles.modalClose}
              onClick={closeContactModal}
              aria-label="연락처 모달 닫기"
              type="button"
            >
              ×
            </button>
            <h3 className={styles.modalTitle}>{contactModal.name}</h3>
            <div className={styles.phoneNumber}>{contactModal.phone}</div>
            <div className={styles.contactButtons}>
              {contactModal.phone && (
                <>
                  <button className={styles.modalBtn} onClick={() => handleCall(contactModal.phone!)} type="button">
                    전화
                  </button>
                  <button className={styles.modalBtn} onClick={() => handleSMS(contactModal.phone!)} type="button">
                    문자
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
