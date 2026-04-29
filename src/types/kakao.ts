export type KakaoLatLng = unknown;

export interface KakaoMapInstance {
  setCenter(position: KakaoLatLng): void;
  relayout(): void;
  setZoomable(enabled: boolean): void;
  setDraggable(enabled: boolean): void;
}

export interface KakaoMarkerInstance {
  setMap(map: KakaoMapInstance | null): void;
}

export interface KakaoAddressSearchResult {
  x: string | number;
  y: string | number;
  address_name?: string;
  road_address?: {
    address_name?: string;
  };
  address?: {
    address_name?: string;
  };
}

export interface KakaoMapsSdk {
  maps: {
    load?: (callback: () => void) => void;
    LatLng: new (
      latitude: number | string,
      longitude: number | string
    ) => KakaoLatLng;
    Map: new (
      container: HTMLElement,
      options: {
        center: KakaoLatLng;
        level: number;
      }
    ) => KakaoMapInstance;
    Marker: new (options: {
      map?: KakaoMapInstance;
      position: KakaoLatLng;
    }) => KakaoMarkerInstance;
    InfoWindow: new (options: {
      content: string;
    }) => {
      open(map: KakaoMapInstance, marker: KakaoMarkerInstance): void;
    };
    services: {
      Geocoder: new () => {
        addressSearch(
          address: string,
          callback: (result: KakaoAddressSearchResult[], status: string) => void
        ): void;
      };
      Status: {
        OK: string;
      };
    };
  };
}

export interface KakaoShareSdk {
  init(appKey: string): void;
  isInitialized(): boolean;
  Share?: {
    sendDefault(payload: Record<string, unknown>): void;
  };
}

declare global {
  interface Window {
    kakao?: KakaoMapsSdk;
    Kakao?: KakaoShareSdk;
    kakaoMapInstance?: KakaoMapInstance;
  }
}
