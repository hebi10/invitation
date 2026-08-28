import type { BankAccount } from '@/types/invitationPage';

export type FirstBirthdayGiftAccountsInput = {
  dadAccounts: BankAccount[];
  giftMessage: string;
  momAccounts: BankAccount[];
};

export type FirstBirthdayGiftAccountsModel = {
  dadAccounts: BankAccount[];
  message: string;
  momAccounts: BankAccount[];
};

function normalizeAccount(account: BankAccount): BankAccount | null {
  const accountNumber = account.accountNumber.trim();

  if (!accountNumber) {
    return null;
  }

  return {
    accountHolder: account.accountHolder.trim(),
    accountNumber,
    bank: account.bank.trim(),
  };
}

function normalizeAccounts(accounts: BankAccount[]) {
  return accounts.flatMap((account) => {
    const normalized = normalizeAccount(account);
    return normalized ? [normalized] : [];
  });
}

export function buildFirstBirthdayGiftAccounts(
  input: FirstBirthdayGiftAccountsInput
): FirstBirthdayGiftAccountsModel | null {
  const dadAccounts = normalizeAccounts(input.dadAccounts);
  const momAccounts = normalizeAccounts(input.momAccounts);

  if (dadAccounts.length === 0 && momAccounts.length === 0) {
    return null;
  }

  return {
    dadAccounts,
    message: input.giftMessage.trim(),
    momAccounts,
  };
}
