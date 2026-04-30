import type { ExpoConfig } from 'expo/config';

declare const process: {
  env: Record<string, string | undefined>;
};

const PRODUCTION_API_BASE_URL = 'https://msgnote.kr';
const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE?.trim().replace(/\/+$/g, '') ||
  PRODUCTION_API_BASE_URL;

const config: ExpoConfig = {
  name: '모바일 청첩장',
  slug: 'mobile-invitation-app',
  version: '1.0.3',
  orientation: 'portrait',
  scheme: 'mobileinvitation',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.jpg',
    resizeMode: 'contain',
    backgroundColor: '#f7efe7',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-image-picker',
      {
        photosPermission:
          '청첩장 대표 이미지와 갤러리 이미지를 업로드하려면 사진 보관함 접근 권한이 필요합니다.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  android: {
    package: 'kr.msgnote.mobileinvitation',
    versionCode: 1,
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'msgnote.kr',
            pathPrefix: '/app',
          },
          {
            scheme: 'https',
            host: 'msgnote.kr',
            pathPrefix: '/mobile',
          },
          {
            scheme: 'https',
            host: 'www.msgnote.kr',
            pathPrefix: '/app',
          },
          {
            scheme: 'https',
            host: 'www.msgnote.kr',
            pathPrefix: '/mobile',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    blockedPermissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
    ],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#f7efe7',
    },
  },
  ios: {
    bundleIdentifier: 'kr.msgnote.mobileinvitation',
    buildNumber: '1',
    associatedDomains: [
      'applinks:msgnote.kr',
      'applinks:www.msgnote.kr',
    ],
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        '청첩장 대표 이미지와 갤러리 이미지를 업로드하려면 사진 보관함 접근 권한이 필요합니다.',
      NSPhotoLibraryAddUsageDescription:
        '선택한 청첩장 이미지를 저장하거나 공유하려면 사진 보관함 접근 권한이 필요합니다.',
    },
  },
  web: {
    favicon: './assets/icon.png',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: configuredApiBaseUrl,
    eas: {
      projectId: '6bc60acb-c565-4be9-99f2-56ba7ae40a7c',
    },
  },
};

export default config;
