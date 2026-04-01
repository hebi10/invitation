'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import type { PersonInfo } from '@/config/weddingPages';

interface GreetingExpandableThemedProps {
  message: string;
  author: string;
  groom?: PersonInfo;
  bride?: PersonInfo;
  styles: Record<string, string>;
  title: string;
  subtitle?: string;
  groomLabel: string;
  brideLabel: string;
  contactButtonLabel: string;
  phoneButtonLabel: string;
  topDecoration?: ReactNode;
  middleDecoration?: ReactNode;
  bottomDecoration?: ReactNode;
  formatAuthor?: (author: string) => string;
}

type ExpandTarget = 'groom' | 'bride' | 'both' | null;

export default function GreetingExpandableThemed({
  message,
  author,
  groom,
  bride,
  styles,
  title,
  subtitle,
  groomLabel,
  brideLabel,
  contactButtonLabel,
  phoneButtonLabel,
  topDecoration,
  middleDecoration,
  bottomDecoration,
  formatAuthor = (value) => value,
}: GreetingExpandableThemedProps) {
  const [expandedCard, setExpandedCard] = useState<ExpandTarget>('both');

  const handleCallClick = (phoneNumber: string | undefined, name: string) => {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
      return;
    }

    console.warn(`${name}의 연락처가 등록되지 않았습니다.`);
  };

  const toggleCard = (person: 'groom' | 'bride') => {
    if (expandedCard === 'both') {
      setExpandedCard(person === 'groom' ? 'bride' : 'groom');
      return;
    }

    if (expandedCard === person) {
      setExpandedCard(null);
      return;
    }

    setExpandedCard(person);
  };

  const isExpanded = (person: 'groom' | 'bride') =>
    expandedCard === 'both' || expandedCard === person;

  const renderFamilyCard = (
    person: PersonInfo,
    key: 'groom' | 'bride',
    label: string
  ) => (
    <div className={styles.familyCard}>
      <div className={styles.cardHeader}>
        <span className={styles.roleLabel}>{label}</span>
        <button
          className={styles.expandButton}
          onClick={() => toggleCard(key)}
          aria-expanded={isExpanded(key)}
          aria-label={`${person.name} 가족 정보 ${isExpanded(key) ? '접기' : '펼치기'}`}
          type="button"
        >
          {isExpanded(key) ? '−' : '+'}
        </button>
      </div>

      <div className={styles.personInfo}>
        <h4 className={styles.personName}>
          {person.name}
          {person.order ? <span className={styles.order}> · {person.order}</span> : null}
        </h4>
        {person.phone ? (
          <button
            className={styles.contactButton}
            onClick={() => handleCallClick(person.phone, person.name)}
            aria-label={`${person.name}에게 전화하기`}
            type="button"
          >
            {contactButtonLabel}
          </button>
        ) : null}
      </div>

      {isExpanded(key) ? (
        <div className={styles.parentsInfo}>
          {person.father ? (
            <div className={styles.parentItem}>
              <span className={styles.relation}>{person.father.relation}</span>
              <span className={styles.parentName}>{person.father.name}</span>
              {person.father.phone ? (
                <button
                  className={styles.phoneButton}
                  onClick={() =>
                    handleCallClick(person.father?.phone, person.father?.name || '')
                  }
                  aria-label={`${person.father.name}에게 전화하기`}
                  type="button"
                >
                  {phoneButtonLabel}
                </button>
              ) : null}
            </div>
          ) : null}

          {person.mother ? (
            <div className={styles.parentItem}>
              <span className={styles.relation}>{person.mother.relation}</span>
              <span className={styles.parentName}>{person.mother.name}</span>
              {person.mother.phone ? (
                <button
                  className={styles.phoneButton}
                  onClick={() =>
                    handleCallClick(person.mother?.phone, person.mother?.name || '')
                  }
                  aria-label={`${person.mother.name}에게 전화하기`}
                  type="button"
                >
                  {phoneButtonLabel}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <section className={styles.greeting} aria-label="인사말">
      <div className={styles.container}>
        {topDecoration}

        <div className={styles.messageSection}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          {'messageDivider' in styles ? <div className={styles.messageDivider}></div> : null}
          <p className={styles.message}>{message}</p>
          <p className={styles.author}>{formatAuthor(author)}</p>
        </div>

        {middleDecoration}

        {groom || bride ? (
          <div className={styles.familySection}>
            {'familyDivider' in styles ? <div className={styles.familyDivider}></div> : null}
            <div className={styles.familyCards}>
              {groom ? renderFamilyCard(groom, 'groom', groomLabel) : null}
              {bride ? renderFamilyCard(bride, 'bride', brideLabel) : null}
            </div>
          </div>
        ) : null}

        {bottomDecoration}
      </div>
    </section>
  );
}
