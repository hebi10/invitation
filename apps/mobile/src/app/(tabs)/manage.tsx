import { ProtectedTabRoute } from '../../components/ProtectedTabRoute';
import ManageScreenContent from '../../features/_protected/manage';

export default function ManageScreen() {
  return (
    <ProtectedTabRoute>
      <ManageScreenContent />
    </ProtectedTabRoute>
  );
}
