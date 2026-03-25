'use client';

import styles from './LocationMap_4.module.css';

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

export default function LocationMap_4(props: LocationMapProps) {
  return (
    <LocationMapThemed
      {...props}
      styles={styles}
      mapId="kakao-map-4"
      title="Location"
      subtitle="오시는 길"
      markerColor="#1F5AFF"
      controlBorder="1px solid #1F5AFF"
      controlRadius="20px"
      controlActiveColor="#1F5AFF"
    />
  );
}
