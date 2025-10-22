'use client';

import { useState } from 'react';
import type { PersonInfo } from '@/config/weddingPages';
import styles from './Greeting_5.module.css';

interface GreetingProps {
  message: string;
  author: string;
  groom?: PersonInfo;
  bride?: PersonInfo;
}

export default function Greeting_5({ message, author, groom, bride }: GreetingProps) {
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
      setExpandedCard(person === 'groom' ? 'bride' : 'groom');
    } else if (expandedCard === person) {
      setExpandedCard(null);
    } else {
      setExpandedCard(person);
    }
  };
  
  const isExpanded = (person: 'groom' | 'bride') => {
    return expandedCard === 'both' || expandedCard === person;
  };

  return (
    <section className={styles.greeting}>
      <div className={styles.container}>
        {/* 금박 장식 */}
        <svg className={styles.topDecoration} viewBox="0 0 100 10" preserveAspectRatio="none">
          <path d="M 0 5 Q 25 2, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>

        {/* 인사말 */}
        <div className={styles.messageSection}>
          <h2 className={styles.title}>初請狀</h2>
          <p className={styles.subtitle}>인사말</p>
          <div className={styles.messageDivider}></div>
          <p className={styles.message}>{message}</p>
          <p className={styles.author}>{author}</p>
        </div>

        {/* 가족 정보 */}
        {(groom || bride) && (
          <div className={styles.familySection}>
            <div className={styles.familyDivider}></div>
            
            <div className={styles.familyCards}>
              {/* 신랑측 */}
              {groom && (
                <div className={styles.familyCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.roleLabel}>新郞</span>
                    <button
                      className={styles.expandButton}
                      onClick={() => toggleCard('groom')}
                      aria-expanded={isExpanded('groom')}
                    >
                      {isExpanded('groom') ? '−' : '+'}
                    </button>
                  </div>
                  
                  <div className={styles.personInfo}>
                    <h4 className={styles.personName}>
                      {groom.name}
                      {groom.order && <span className={styles.order}> {groom.order}</span>}
                    </h4>
                    {groom.phone && (
                      <button
                        className={styles.contactButton}
                        onClick={() => handleCallClick(groom.phone, groom.name)}
                      >
                        聯絡
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
                            >
                              ☎
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

              {/* 신부측 */}
              {bride && (
                <div className={styles.familyCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.roleLabel}>新婦</span>
                    <button
                      className={styles.expandButton}
                      onClick={() => toggleCard('bride')}
                      aria-expanded={isExpanded('bride')}
                    >
                      {isExpanded('bride') ? '−' : '+'}
                    </button>
                  </div>
                  
                  <div className={styles.personInfo}>
                    <h4 className={styles.personName}>
                      {bride.name}
                      {bride.order && <span className={styles.order}> {bride.order}</span>}
                    </h4>
                    {bride.phone && (
                      <button
                        className={styles.contactButton}
                        onClick={() => handleCallClick(bride.phone, bride.name)}
                      >
                        聯絡
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
                            >
                              ☎
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

        {/* 하단 금박 장식 */}
        <svg className={styles.bottomDecoration} viewBox="0 0 100 10" preserveAspectRatio="none">
          <path d="M 0 5 Q 25 8, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>
      </div>
    </section>
  );
}
