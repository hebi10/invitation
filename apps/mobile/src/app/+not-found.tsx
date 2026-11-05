import { router } from 'expo-router';

import { AppStatusScreen } from '../components/AppStatusScreen';
import { usePreferences } from '../contexts/PreferencesContext';

export default function NotFoundScreen() {
  const { palette, fontScale } = usePreferences();

  return (
    <AppStatusScreen
      palette={palette}
      fontScale={fontScale}
      statusLabel="페이지 없음"
      title="페이지를 찾을 수 없습니다"
      description="요청한 경로가 없거나 더 이상 제공되지 않습니다. 홈에서 필요한 메뉴를 다시 선택해 주세요."
      actions={[
        { label: '홈으로 돌아가기', onPress: () => router.replace('/'), variant: 'primary' },
      ]}
    />
  );
}
