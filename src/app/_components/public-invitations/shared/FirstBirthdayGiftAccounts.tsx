'use client';

import { useState } from 'react';

import { copyTextToClipboard } from '@/utils';

import {
  buildFirstBirthdayGiftAccounts,
  type FirstBirthdayGiftAccountsInput,
} from './giftAccountsModel';
import accountStyles from './FirstBirthdayGiftAccounts.module.css';

type FirstBirthdayGiftAccountsProps = FirstBirthdayGiftAccountsInput & {
  className?: string;
  titleClassName?: string;
};

export function FirstBirthdayGiftAccounts({
  className,
  dadAccounts,
  giftMessage,
  momAccounts,
  titleClassName,
}: FirstBirthdayGiftAccountsProps) {
  const model = buildFirstBirthdayGiftAccounts({
    dadAccounts,
    giftMessage,
    momAccounts,
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!model) {
    return null;
  }

  const renderAccounts = (
    groupKey: 'dad' | 'mom',
    title: string,
    accounts: typeof model.dadAccounts
  ) => (
    <div className={accountStyles.group}>
      <h3 className={accountStyles.groupTitle}>{title}</h3>
      {accounts.map((account, index) => {
        const accountKey = `${groupKey}-${index}`;
        const actionName = account.accountHolder || title;
        const isCopied = copiedKey === accountKey;

        return (
          <div className={accountStyles.account} key={accountKey}>
            <div className={accountStyles.accountInfo}>
              <strong>{actionName}</strong>
              <span>
                {account.bank ? `${account.bank} ` : ''}
                <span className={accountStyles.accountNumber}>
                  {account.accountNumber}
                </span>
              </span>
            </div>
            <button
              className={accountStyles.copyButton}
              type="button"
              aria-label={`${actionName} 계좌번호 ${isCopied ? '복사 완료' : '복사'}`}
              onClick={async () => {
                const value = `${account.bank} ${account.accountNumber}`.trim();
                const copied = await copyTextToClipboard(value);
                if (!copied) {
                  return;
                }

                setCopiedKey(accountKey);
                window.setTimeout(() => {
                  setCopiedKey((current) =>
                    current === accountKey ? null : current
                  );
                }, 1800);
              }}
            >
              {isCopied ? '복사됨' : '복사'}
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <section
      className={className}
      data-first-birthday-feature="gift-accounts"
      aria-labelledby="first-birthday-gift-title"
    >
      <h2 id="first-birthday-gift-title" className={titleClassName}>
        마음 전하실 곳
      </h2>
      <div className={accountStyles.content}>
        {model.message ? (
          <p className={accountStyles.message}>{model.message}</p>
        ) : null}
        {model.dadAccounts.length > 0
          ? renderAccounts('dad', '아빠측 계좌', model.dadAccounts)
          : null}
        {model.momAccounts.length > 0
          ? renderAccounts('mom', '엄마측 계좌', model.momAccounts)
          : null}
      </div>
    </section>
  );
}
