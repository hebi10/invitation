import { Redirect, useLocalSearchParams } from 'expo-router';

// Keep existing app links and purchase-return parameters on the main list route.
export default function ManageRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/', params }} />;
}
