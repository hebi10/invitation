import type { FamilyMember } from '@/types/invitationPage';

export type GardenFamilyMemberModel = {
  displayName: string;
  name: string;
  phone: string;
  relation: string;
  side: '신랑측' | '신부측';
};

export function resolveFirstBirthdayHeroTitle(visibleBabyName: string) {
  return visibleBabyName.trim() || '첫 번째 생일';
}

export function resolveGardenFamilyMember(
  member: FamilyMember | undefined,
  index: number
): GardenFamilyMemberModel | null {
  const phone = member?.phone?.trim() ?? '';

  if (!member || !phone) {
    return null;
  }

  const relation =
    member.relation.trim() || (index % 2 === 0 ? '아버지' : '어머니');
  const sourceName = member.name.trim();
  const name = sourceName || relation;

  return {
    displayName: sourceName ? `${relation} ${name}` : relation,
    name,
    phone,
    relation,
    side: index < 2 ? '신랑측' : '신부측',
  };
}
