import { ProtectedTabRoute } from '../../components/ProtectedTabRoute';
import SettingsScreenContent from '../../features/_protected/settings';

export default function SettingsScreen() {
  return (
    <ProtectedTabRoute>
      <SettingsScreenContent />
    </ProtectedTabRoute>
  );
}
