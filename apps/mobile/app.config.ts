import type { ExpoConfig } from 'expo/config';

const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE?.trim() || 'https://msgnote.kr';

const config: ExpoConfig = {
  name: '모바일 청첩장',
  slug: 'mobile-invitation-app',
  version: '1.0.0',
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
        cameraPermission:
          '청첩장에 사용할 사진을 촬영해 업로드하려면 카메라 접근 권한이 필요합니다.',
      },
    ],
  ],
  android: {
    package: 'kr.msgnote.mobileinvitation',
    versionCode: 1,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#f7efe7',
    },
  },
  ios: {
    bundleIdentifier: 'kr.msgnote.mobileinvitation',
    buildNumber: '1',
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        '청첩장 대표 이미지와 갤러리 이미지를 업로드하려면 사진 보관함 접근 권한이 필요합니다.',
      NSPhotoLibraryAddUsageDescription:
        '선택한 청첩장 이미지를 저장하거나 공유하려면 사진 보관함 접근 권한이 필요합니다.',
      NSCameraUsageDescription:
        '청첩장에 사용할 사진을 촬영해 업로드하려면 카메라 접근 권한이 필요합니다.',
    },
  },
  web: {
    favicon: './assets/favicon.ico',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: configuredApiBaseUrl,
  },
};

export default config;
