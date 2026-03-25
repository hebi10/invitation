'use client';

import { useState } from 'react';

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

export default function GreetingShared({
  message,
  groom,
  bride,
  styles,
  wrapInCard = false,
}: GreetingSharedProps) {
  const [contactModal, setContactModal] = useState<ContactTarget | null>(null);

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

  const openContactModal = (person: ContactTarget) => {
    setContactModal(person);
  };

  const closeContactModal = () => {
    setContactModal(null);
  };

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
        onClick={() => openContactModal(person)}
        aria-label={`${person.name} 연락하기`}
        title="연락하기"
      >
        ✆
      </button>
    );
  };

  const content = (
    <>
      <div className={styles.messageWrapper}>
        <p className={styles.message}>{formatMessage(message)}</p>
      </div>

      {(groom || bride) && (
        <div className={styles.familySection}>
          <div className={styles.familyGrid}>
            {groom && (
              <div className={styles.familyColumn}>
                <div className={styles.roleLabel}>신랑측</div>
                {groom.father && (
                  <div className={styles.familyRow}>
                    <span className={styles.label}>{groom.father.relation}</span>
                    <span className={styles.personName}>{groom.father.name}</span>
                    {renderPhoneButton({ name: groom.father.name, phone: groom.father.phone })}
                  </div>
                )}
                {groom.mother && (
                  <div className={styles.familyRow}>
                    <span className={styles.label}>{groom.mother.relation}</span>
                    <span className={styles.personName}>{groom.mother.name}</span>
                    {renderPhoneButton({ name: groom.mother.name, phone: groom.mother.phone })}
                  </div>
                )}
                <div className={`${styles.familyRow} ${styles.mainPerson}`}>
                  {groom.order && <span className={styles.orderBadge}>{groom.order}</span>}
                  <span className={styles.mainName}>{groom.name}</span>
                  {renderPhoneButton(groom)}
                </div>
              </div>
            )}

            {bride && (
              <div className={styles.familyColumn}>
                <div className={styles.roleLabel}>신부측</div>
                {bride.father && (
                  <div className={styles.familyRow}>
                    <span className={styles.label}>{bride.father.relation}</span>
                    <span className={styles.personName}>{bride.father.name}</span>
                    {renderPhoneButton({ name: bride.father.name, phone: bride.father.phone })}
                  </div>
                )}
                {bride.mother && (
                  <div className={styles.familyRow}>
                    <span className={styles.label}>{bride.mother.relation}</span>
                    <span className={styles.personName}>{bride.mother.name}</span>
                    {renderPhoneButton({ name: bride.mother.name, phone: bride.mother.phone })}
                  </div>
                )}
                <div className={`${styles.familyRow} ${styles.mainPerson}`}>
                  {bride.order && <span className={styles.orderBadge}>{bride.order}</span>}
                  <span className={styles.mainName}>{bride.name}</span>
                  {renderPhoneButton(bride)}
                </div>
              </div>
            )}
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
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeContactModal} aria-label="닫기" type="button">
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
