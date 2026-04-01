const firebasePublicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
} as const;

const firebasePublicEnvLabels = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
} satisfies Record<
  Exclude<keyof typeof firebasePublicConfig, 'measurementId'>,
  string
>;

export function getPublicFirebaseConfig() {
  const missingKeys = Object.entries(firebasePublicConfig)
    .filter(([key]) => key !== 'measurementId')
    .filter(([, value]) => !value)
    .map(
      ([key]) =>
        firebasePublicEnvLabels[
          key as Exclude<keyof typeof firebasePublicConfig, 'measurementId'>
        ]
    );

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required Firebase public env vars: ${missingKeys.join(', ')}`
    );
  }

  return firebasePublicConfig;
}

export function getPublicKakaoJavaScriptKey() {
  return (
    process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY?.trim() ||
    ''
  );
}
