import 'server-only';

import { firestoreEventTicketRepository } from './repositories/eventTicketRepository';

export async function getServerPageTicketCount(pageSlug: string) {
  return firestoreEventTicketRepository.getTicketCountByPageSlug(pageSlug);
}

export async function adjustServerPageTicketCount(pageSlug: string, amount: number) {
  return firestoreEventTicketRepository.adjustTicketCountByPageSlug(pageSlug, amount);
}

export async function transferServerPageTicketCount(
  sourcePageSlug: string,
  targetPageSlug: string,
  amount: number
) {
  return firestoreEventTicketRepository.transferTicketCountByPageSlug(
    sourcePageSlug,
    targetPageSlug,
    amount
  );
}
