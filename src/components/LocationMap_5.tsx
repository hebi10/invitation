'use client';

import styles from './LocationMap_5.module.css';

import LocationMapThemed from './LocationMapThemed';

interface LocationMapProps {
  venueName: string;
  address: string;
  description?: string;
  contact?: string;
  kakaoMapConfig?: {
    latitude: number;
    longitude: number;
    level?: number;
    markerTitle?: string;
  };
}

export default function LocationMap_5(props: LocationMapProps) {
  return (
    <LocationMapThemed
      {...props}
      styles={styles}
      mapId="kakao-map-5"
      title="오시는 길"
      subtitle="Location"
      markerColor="#C9A14A"
      controlBorder="1px solid var(--accent)"
      controlRadius="2px"
      controlFontFamily="'Noto Sans KR', sans-serif"
      controlActiveColor="var(--accent)"
    />
  );
}
