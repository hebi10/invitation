import { ProtectedTabRoute } from '../../components/ProtectedTabRoute';
import ManageScreenContent from '../../features/screens/manage';

export default function ManageScreen() {
  return (
    <ProtectedTabRoute>
      <ManageScreenContent />
    </ProtectedTabRoute>
  );
}
