'use client';

import { useState } from 'react';
import styles from './Greeting_2.module.css';

interface FamilyMember {
  relation: string;
  name: string;
  phone?: string;
}

interface PersonInfo {
  name: string;
  order?: string;
  father?: FamilyMember;
  mother?: FamilyMember;
  phone?: string;
}

interface GreetingProps {
  message: string;
  author?: string;
  groom?: PersonInfo;
  bride?: PersonInfo;
}

export default function Greeting_2({ message, author, groom, bride }: GreetingProps) {
  const [contactModal, setContactModal] = useState<{
    isOpen: boolean;
    person: PersonInfo | null;
    type: 'groom' | 'bride' | null;
  }>({
    isOpen: false,
    person: null,
    type: null
  });

  const formatMessage = (text: string) => {
    const normalizedText = text.replace(/<br\s*\/?>/gi, '\n');
    return normalizedText
      .split('\n')
      .map((line, index) => (
        <span key={index}>
          {line}
          {index < normalizedText.split('\n').length - 1 && <br />}
        </span>
      ));
  };

  const openContactModal = (person: PersonInfo, type: 'groom' | 'bride') => {
    setContactModal({ isOpen: true, person, type });
  };

  const closeContactModal = () => {
    setContactModal({ isOpen: false, person: null, type: null });
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleSMS = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.messageSection}>
          <p className={styles.message}>
            {formatMessage(message)}
          </p>
          {author && <p className={styles.author}>{author}</p>}
        </div>

        {(groom || bride) && (
          <div className={styles.familySection}>
            <div className={styles.familyGrid}>
              {groom && (
                <div className={styles.familyColumn}>
                  <div className={styles.roleLabel}>신랑</div>
                  <div className={styles.personMain}>
                    <span className={styles.personName}>{groom.name}</span>
                    {groom.order && <span className={styles.personOrder}>{groom.order}</span>}
                    {groom.phone && (
                      <button
                        className={styles.contactBtn}
                        onClick={() => openContactModal(groom, 'groom')}
                        aria-label={`${groom.name} 연락하기`}
                      >
                        연락하기
                      </button>
                    )}
                  </div>
                  {(groom.father || groom.mother) && (
                    <div className={styles.parentsSection}>
                      {groom.father && (
                        <div className={styles.parentRow}>
                          <span className={styles.parentLabel}>{groom.father.relation}</span>
                          <span className={styles.parentName}>{groom.father.name}</span>
                          {groom.father.phone && (
                            <button
                              className={styles.parentContactBtn}
                              onClick={() => openContactModal({ name: groom.father!.name, phone: groom.father!.phone }, 'groom')}
                              aria-label={`${groom.father.name} 연락하기`}
                            >
                              ☎
                            </button>
                          )}
                        </div>
                      )}
                      {groom.mother && (
                        <div className={styles.parentRow}>
                          <span className={styles.parentLabel}>{groom.mother.relation}</span>
                          <span className={styles.parentName}>{groom.mother.name}</span>
                          {groom.mother.phone && (
                            <button
                              className={styles.parentContactBtn}
                              onClick={() => openContactModal({ name: groom.mother!.name, phone: groom.mother!.phone }, 'groom')}
                              aria-label={`${groom.mother.name} 연락하기`}
                            >
                              ☎
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {bride && (
                <div className={styles.familyColumn}>
                  <div className={styles.roleLabel}>신부</div>
                  <div className={styles.personMain}>
                    <span className={styles.personName}>{bride.name}</span>
                    {bride.order && <span className={styles.personOrder}>{bride.order}</span>}
                    {bride.phone && (
                      <button
                        className={styles.contactBtn}
                        onClick={() => openContactModal(bride, 'bride')}
                        aria-label={`${bride.name} 연락하기`}
                      >
                        연락하기
                      </button>
                    )}
                  </div>
                  {(bride.father || bride.mother) && (
                    <div className={styles.parentsSection}>
                      {bride.father && (
                        <div className={styles.parentRow}>
                          <span className={styles.parentLabel}>{bride.father.relation}</span>
                          <span className={styles.parentName}>{bride.father.name}</span>
                          {bride.father.phone && (
                            <button
                              className={styles.parentContactBtn}
                              onClick={() => openContactModal({ name: bride.father!.name, phone: bride.father!.phone }, 'bride')}
                              aria-label={`${bride.father.name} 연락하기`}
                            >
                              ☎
                            </button>
                          )}
                        </div>
                      )}
                      {bride.mother && (
                        <div className={styles.parentRow}>
                          <span className={styles.parentLabel}>{bride.mother.relation}</span>
                          <span className={styles.parentName}>{bride.mother.name}</span>
                          {bride.mother.phone && (
                            <button
                              className={styles.parentContactBtn}
                              onClick={() => openContactModal({ name: bride.mother!.name, phone: bride.mother!.phone }, 'bride')}
                              aria-label={`${bride.mother.name} 연락하기`}
                            >
                              ☎
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {contactModal.isOpen && contactModal.person && (
        <div className={styles.modalOverlay} onClick={closeContactModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{contactModal.person.name}</h3>
            <div className={styles.modalButtons}>
              {contactModal.person.phone && (
                <>
                  <button
                    className={styles.modalButton}
                    onClick={() => handleCall(contactModal.person!.phone!)}
                  >
                    전화 걸기
                  </button>
                  <button
                    className={styles.modalButton}
                    onClick={() => handleSMS(contactModal.person!.phone!)}
                  >
                    문자 보내기
                  </button>
                </>
              )}
            </div>
            <button className={styles.modalClose} onClick={closeContactModal}>
              닫기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
