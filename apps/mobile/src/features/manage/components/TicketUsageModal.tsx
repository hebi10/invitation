import { View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { BulletList } from '../../../components/BulletList';
import { ChoiceChip } from '../../../components/ChoiceChip';
import { InvitationEditorModalShell } from '../../../components/manage/InvitationEditorModalShell';
import { SectionCard } from '../../../components/SectionCard';
import type { getPalette } from '../../../constants/theme';
import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../../types/mobileInvitation';
import { manageStyles } from '../manageStyles';

const TICKET_USAGE_ITEMS = [
  '티켓 1장: 1개월 연장',
  '티켓 1장: 디자인 변경',
  '티켓 2장: 같은 청첩장에 다른 디자인 추가',
  '티켓 2장: 서비스 업그레이드',
] as const;

type TicketUsageModalProps = {
  visible: boolean;
  onClose: () => void;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  currentPlan: MobileInvitationProductTier;
  currentTheme: MobileInvitationThemeKey;
  selectedTheme: MobileInvitationThemeKey;
  upgradeTargetPlan: MobileInvitationProductTier | null;
  isApplyingThemeChange: boolean;
  onSelectTheme: (theme: MobileInvitationThemeKey) => void;
  onApplyThemeChange: () => void;
  onOpenAlternateThemePreview: () => void;
  onGoToExtend: () => void;
  onGoToExtraVariant: () => void;
  onGoToUpgrade: () => void;
};

function getPlanLabel(plan: MobileInvitationProductTier) {
  if (plan === 'standard') {
    return 'STANDARD';
  }

  if (plan === 'deluxe') {
    return 'DELUXE';
  }

  return 'PREMIUM';
}

function getThemeLabel(theme: MobileInvitationThemeKey) {
  return theme === 'emotional' ? '감성형' : '심플형';
}

export function TicketUsageModal({
  visible,
  onClose,
  palette,
  fontScale,
  currentPlan,
  currentTheme,
  selectedTheme,
  upgradeTargetPlan,
  isApplyingThemeChange,
  onSelectTheme,
  onApplyThemeChange,
  onOpenAlternateThemePreview,
  onGoToExtend,
  onGoToExtraVariant,
  onGoToUpgrade,
}: TicketUsageModalProps) {
  return (
    <InvitationEditorModalShell
      visible={visible}
      onClose={onClose}
      title="티켓 사용"
      description="현재 청첩장에 적용 가능한 티켓 기능만 모아 두었습니다."
      palette={palette}
      fontScale={fontScale}
      showActionDivider
    >
      <SectionCard
        title="티켓 정책"
        description="운영 탭에서도 현재 지원하는 티켓 사용 범위를 한 번에 확인할 수 있습니다."
      >
        <BulletList items={[...TICKET_USAGE_ITEMS]} />
      </SectionCard>

      <SectionCard title="기간 1개월 연장" description="티켓 1장 사용">
        <AppText variant="muted" style={manageStyles.helperText}>
          현재 청첩장의 노출 기간을 연장하는 흐름으로 이동합니다.
        </AppText>
        <ActionButton onPress={onGoToExtend} fullWidth>
          생성 탭으로 이동
        </ActionButton>
      </SectionCard>

      <SectionCard
        title="디자인 변경"
        description={`티켓 1장 사용 · 현재 기본 디자인 ${getThemeLabel(currentTheme)}`}
      >
        <View style={manageStyles.chipRow}>
          <ChoiceChip
            label="감성형"
            selected={selectedTheme === 'emotional'}
            onPress={() => onSelectTheme('emotional')}
          />
          <ChoiceChip
            label="심플형"
            selected={selectedTheme === 'simple'}
            onPress={() => onSelectTheme('simple')}
          />
        </View>
        <AppText variant="muted" style={manageStyles.helperText}>
          기본 디자인을 바꾸면 공개 링크의 기본 테마도 함께 변경됩니다.
        </AppText>
        <ActionButton
          variant="secondary"
          onPress={onApplyThemeChange}
          loading={isApplyingThemeChange}
          fullWidth
        >
          선택한 디자인으로 변경
        </ActionButton>
      </SectionCard>

      <SectionCard title="같은 청첩장에 다른 디자인 추가" description="티켓 2장 사용">
        <AppText variant="muted" style={manageStyles.helperText}>
          현재 청첩장에 다른 디자인을 추가하기 전에 미리보기로 먼저 확인할 수 있습니다.
        </AppText>
        <View style={manageStyles.actionRow}>
          <ActionButton
            variant="secondary"
            onPress={onOpenAlternateThemePreview}
            style={manageStyles.actionHalfButton}
          >
            미리보기
          </ActionButton>
          <ActionButton onPress={onGoToExtraVariant} style={manageStyles.actionHalfButton}>
            생성 탭으로 이동
          </ActionButton>
        </View>
      </SectionCard>

      <SectionCard
        title="서비스 업그레이드"
        description={`티켓 2장 사용 · 현재 ${getPlanLabel(currentPlan)}`}
      >
        <AppText variant="muted" style={manageStyles.helperText}>
          {upgradeTargetPlan
            ? `${getPlanLabel(upgradeTargetPlan)} 상품으로 업그레이드할 수 있습니다.`
            : '현재는 최고 등급 상품이라 추가 업그레이드가 필요하지 않습니다.'}
        </AppText>
        <ActionButton onPress={onGoToUpgrade} disabled={!upgradeTargetPlan} fullWidth>
          {upgradeTargetPlan
            ? `${getPlanLabel(upgradeTargetPlan)} 업그레이드 진행`
            : '업그레이드 가능한 상품이 없습니다'}
        </ActionButton>
      </SectionCard>
    </InvitationEditorModalShell>
  );
}
