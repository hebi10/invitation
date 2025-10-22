'use client';

import { useState } from 'react';
import type { PersonInfo } from '@/config/weddingPages';
import styles from './Greeting_4.module.css';

interface GreetingProps {
  message: string;
  author: string;
  groom?: PersonInfo;
  bride?: PersonInfo;
}

export default function Greeting_4({ message, author, groom, bride }: GreetingProps) {
  const [expandedCard, setExpandedCard] = useState<'groom' | 'bride' | 'both' | null>('both');

  const handleCallClick = (phoneNumber: string | undefined, name: string) => {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      alert(`${name}의 연락처가 등록되지 않았습니다.`);
    }
  };

  const toggleCard = (person: 'groom' | 'bride') => {
    if (expandedCard === 'both') {
      // both 상태일 때는 클릭한 것만 남기고 나머지 닫기
      setExpandedCard(person === 'groom' ? 'bride' : 'groom');
    } else if (expandedCard === person) {
      // 이미 열린 카드를 클릭하면 닫기
      setExpandedCard(null);
    } else {
      // 닫힌 카드를 클릭하면 열기
      setExpandedCard(person);
    }
  };
  
  const isExpanded = (person: 'groom' | 'bride') => {
    return expandedCard === 'both' || expandedCard === person;
  };

  return (
    <section className={styles.greeting} aria-label="인사말">
      <div className={styles.container}>
        {/* 레몬 악센트 */}
        <div className={styles.topDecoration} aria-hidden="true">
          <span className={styles.lemon}>🍋</span>
        </div>

        {/* 인사말 */}
        <div className={styles.messageSection}>
          <h2 className={styles.title}>Invitation</h2>
          <p className={styles.message}>{message}</p>
          <p className={styles.author}>— {author}</p>
        </div>

        {/* 구분 웨이브 */}
        <div className={styles.waveDivider} aria-hidden="true">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0,30 Q300,10 600,30 T1200,30 L1200,60 L0,60 Z" />
          </svg>
        </div>

        {/* 가족 정보 - 플랫 디자인 */}
        {(groom || bride) && (
          <div className={styles.familySection}>
            <h3 className={styles.familyTitle}>Family</h3>
            
            <div className={styles.familyCards}>
              {/* 신랑측 */}
              {groom && (
                <div className={styles.familyCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.roleLabel}>Groom</span>
                    <button
                      className={styles.expandButton}
                      onClick={() => toggleCard('groom')}
                      aria-expanded={isExpanded('groom')}
                      aria-label={`신랑 ${groom.name} 가족 정보 ${isExpanded('groom') ? '접기' : '펼치기'}`}
                    >
                      {isExpanded('groom') ? '−' : '+'}
                    </button>
                  </div>
                  
                  <div className={styles.personInfo}>
                    <h4 className={styles.personName}>
                      {groom.name}
                      {groom.order && <span className={styles.order}> · {groom.order}</span>}
                    </h4>
                    {groom.phone && (
                      <button
                        className={styles.contactButton}
                        onClick={() => handleCallClick(groom.phone, groom.name)}
                        aria-label={`${groom.name}에게 전화하기`}
                      >
                        📞 연락하기
                      </button>
                    )}
                  </div>

                  {isExpanded('groom') && (
                    <div className={styles.parentsInfo}>
                      {groom.father && (
                        <div className={styles.parentItem}>
                          <span className={styles.relation}>{groom.father.relation}</span>
                          <span className={styles.parentName}>{groom.father.name}</span>
                          {groom.father.phone && (
                            <button
                              className={styles.phoneButton}
                              onClick={() => handleCallClick(groom.father?.phone, groom.father?.name || '')}
                              aria-label={`${groom.father.name}에게 전화하기`}
                            >
                              📞
                            </button>
                          )}
                        </div>
                      )}
                      {groom.mother && (
                        <div className={styles.parentItem}>
                          <span className={styles.relation}>{groom.mother.relation}</span>
                          <span className={styles.parentName}>{groom.mother.name}</span>
                          {groom.mother.phone && (
                            <button
                              className={styles.phoneButton}
                              onClick={() => handleCallClick(groom.mother?.phone, groom.mother?.name || '')}
                              aria-label={`${groom.mother.name}에게 전화하기`}
                            >
                              📞
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 신부측 */}
              {bride && (
                <div className={styles.familyCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.roleLabel}>Bride</span>
                    <button
                      className={styles.expandButton}
                      onClick={() => toggleCard('bride')}
                      aria-expanded={isExpanded('bride')}
                      aria-label={`신부 ${bride.name} 가족 정보 ${isExpanded('bride') ? '접기' : '펼치기'}`}
                    >
                      {isExpanded('bride') ? '−' : '+'}
                    </button>
                  </div>
                  
                  <div className={styles.personInfo}>
                    <h4 className={styles.personName}>
                      {bride.name}
                      {bride.order && <span className={styles.order}> · {bride.order}</span>}
                    </h4>
                    {bride.phone && (
                      <button
                        className={styles.contactButton}
                        onClick={() => handleCallClick(bride.phone, bride.name)}
                        aria-label={`${bride.name}에게 전화하기`}
                      >
                        📞 연락하기
                      </button>
                    )}
                  </div>

                  {isExpanded('bride') && (
                    <div className={styles.parentsInfo}>
                      {bride.father && (
                        <div className={styles.parentItem}>
                          <span className={styles.relation}>{bride.father.relation}</span>
                          <span className={styles.parentName}>{bride.father.name}</span>
                          {bride.father.phone && (
                            <button
                              className={styles.phoneButton}
                              onClick={() => handleCallClick(bride.father?.phone, bride.father?.name || '')}
                              aria-label={`${bride.father.name}에게 전화하기`}
                            >
                              📞
                            </button>
                          )}
                        </div>
                      )}
                      {bride.mother && (
                        <div className={styles.parentItem}>
                          <span className={styles.relation}>{bride.mother.relation}</span>
                          <span className={styles.parentName}>{bride.mother.name}</span>
                          {bride.mother.phone && (
                            <button
                              className={styles.phoneButton}
                              onClick={() => handleCallClick(bride.mother?.phone, bride.mother?.name || '')}
                              aria-label={`${bride.mother.name}에게 전화하기`}
                            >
                              📞
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
    </section>
  );
}
