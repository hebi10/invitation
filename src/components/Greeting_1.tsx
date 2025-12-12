'use client';

import { useState } from 'react';
import styles from './Greeting_1.module.css';

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

export default function Greeting_1({ message, author, groom, bride }: GreetingProps) {
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
    // <br> 태그를 먼저 \n으로 변환 (HTML 태그 지원)
    const normalizedText = text.replace(/<br\s*\/?>/gi, '\n');
    
    return normalizedText
      .split('\n')
      .map((line, index) => (
        <span key={index} className={styles.messageLine}>
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
      <div className={styles.card}>
        <div className={styles.messageWrapper}>
          <p className={styles.message}>
            {formatMessage(message)}
          </p>
        </div>

        {/* 가족 정보 - 심플 버전 */}
        {(groom || bride) && (
          <div className={styles.familySection}>
            <div className={styles.familyGrid}>
              {groom && (
                <div className={styles.familyColumn}>
                  <div className={styles.roleLabel}>신랑</div>
                  {groom.father && (
                    <div className={styles.familyRow}>
                      <span className={styles.label}>{groom.father.relation}</span>
                      <span className={styles.personName}>{groom.father.name}</span>
                      {groom.father.phone && (
                        <button
                          className={styles.iconBtn}
                          onClick={() => openContactModal({ name: groom.father!.name, phone: groom.father!.phone }, 'groom')}
                          aria-label={`${groom.father.name} 연락하기`}
                          title="연락하기"
                        >
                          ☎
                        </button>
                      )}
                    </div>
                  )}
                  {groom.mother && (
                    <div className={styles.familyRow}>
                      <span className={styles.label}>{groom.mother.relation}</span>
                      <span className={styles.personName}>{groom.mother.name}</span>
                      {groom.mother.phone && (
                        <button
                          className={styles.iconBtn}
                          onClick={() => openContactModal({ name: groom.mother!.name, phone: groom.mother!.phone }, 'groom')}
                          aria-label={`${groom.mother.name} 연락하기`}
                          title="연락하기"
                        >
                          ☎
                        </button>
                      )}
                    </div>
                  )}
                  <div className={`${styles.familyRow} ${styles.mainPerson}`}>
                    {groom.order && <span className={styles.orderBadge}>{groom.order}</span>}
                    <span className={styles.mainName}>{groom.name}</span>
                    {groom.phone && (
                      <button
                        className={styles.iconBtn}
                        onClick={() => openContactModal(groom, 'groom')}
                        aria-label={`${groom.name} 연락하기`}
                        title="연락하기"
                      >
                        ☎
                      </button>
                    )}
                  </div>
                </div>
              )}

              {bride && (
                <div className={styles.familyColumn}>
                  <div className={styles.roleLabel}>신부</div>
                  {bride.father && (
                    <div className={styles.familyRow}>
                      <span className={styles.label}>{bride.father.relation}</span>
                      <span className={styles.personName}>{bride.father.name}</span>
                      {bride.father.phone && (
                        <button
                          className={styles.iconBtn}
                          onClick={() => openContactModal({ name: bride.father!.name, phone: bride.father!.phone }, 'bride')}
                          aria-label={`${bride.father.name} 연락하기`}
                          title="연락하기"
                        >
                          ☎
                        </button>
                      )}
                    </div>
                  )}
                  {bride.mother && (
                    <div className={styles.familyRow}>
                      <span className={styles.label}>{bride.mother.relation}</span>
                      <span className={styles.personName}>{bride.mother.name}</span>
                      {bride.mother.phone && (
                        <button
                          className={styles.iconBtn}
                          onClick={() => openContactModal({ name: bride.mother!.name, phone: bride.mother!.phone }, 'bride')}
                          aria-label={`${bride.mother.name} 연락하기`}
                          title="연락하기"
                        >
                          ☎
                        </button>
                      )}
                    </div>
                  )}
                  <div className={`${styles.familyRow} ${styles.mainPerson}`}>
                    {bride.order && <span className={styles.orderBadge}>{bride.order}</span>}
                    <span className={styles.mainName}>{bride.name}</span>
                    {bride.phone && (
                      <button
                        className={styles.iconBtn}
                        onClick={() => openContactModal(bride, 'bride')}
                        aria-label={`${bride.name} 연락하기`}
                        title="연락하기"
                      >
                        ☎
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 연락하기 모달 */}
        {contactModal.isOpen && contactModal.person && (
          <div className={styles.modalOverlay} onClick={closeContactModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={closeContactModal} aria-label="닫기">
                ×
              </button>
              <h3 className={styles.modalTitle}>{contactModal.person.name}</h3>
              <div className={styles.phoneNumber}>{contactModal.person.phone}</div>
              <div className={styles.contactButtons}>
                {contactModal.person.phone && (
                  <>
                    <button
                      className={styles.modalBtn}
                      onClick={() => handleCall(contactModal.person!.phone!)}
                    >
                      전화
                    </button>
                    <button
                      className={styles.modalBtn}
                      onClick={() => handleSMS(contactModal.person!.phone!)}
                    >
                      문자
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
