# 🗺️ 카카오맵 Config 기반 설정 구현 완료

## 📋 구현 내용

카카오맵을 페이지별로 다르게 설정할 수 있도록 `/config/pages` 디렉토리 내 설정 파일에서 관리하도록 개선했습니다.

## ✨ 주요 변경사항

### 1. **WeddingPageConfig 인터페이스 확장**

`src/config/weddingPages.ts`에 카카오맵 설정 추가:

```typescript
pageData?: {
  // ... 기존 필드들
  kakaoMap?: {
    latitude: number;   // 위도 (필수)
    longitude: number;  // 경도 (필수)
    level?: number;     // 지도 확대 레벨 (1~14, 기본값: 3)
    markerTitle?: string; // 마커 타이틀 (기본값: venue 이름)
  };
}
```

### 2. **개별 페이지 설정 파일에 카카오맵 좌표 추가**

각 페이지의 config 파일에 실제 좌표 설정:

#### 예시: `kim-minjun-park-sohee.ts`
```typescript
pageData: {
  // ... 기존 설정
  kakaoMap: {
    latitude: 37.5048,    // 강남구 테헤란로 123
    longitude: 127.0280,
    level: 3,
    markerTitle: '더케이웨딩홀'
  }
}
```

#### 페이지별 좌표 설정:
- **김민준♥박소희**: 강남구 (37.5048, 127.0280)
- **신민제♥김현지**: 강남구 (37.5048, 127.0280)
- **이준호♥박소민**: 서초구 (37.4900, 127.0100)
- **김태현♥최유나**: 마포구 (37.5663, 126.8997)
- **안도영♥윤지수**: 강원 고성 (38.2100918, 128.4978166) - level: 4

### 3. **LocationMap 컴포넌트 개선**

#### `LocationMap.tsx` & `LocationMap_1.tsx`

**Props 추가:**
```typescript
interface LocationMapProps {
  // ... 기존 props
  kakaoMapConfig?: {
    latitude: number;
    longitude: number;
    level?: number;
    markerTitle?: string;
  };
}
```

**로직 개선:**
```typescript
const initializeKakaoMap = () => {
  // config가 있으면 config 사용 (정확한 좌표)
  if (kakaoMapConfig) {
    const coords = new window.kakao.maps.LatLng(
      kakaoMapConfig.latitude, 
      kakaoMapConfig.longitude
    );
    // 직접 좌표로 지도 표시
  } else {
    // config 없으면 주소 검색 방식 (기존 방식)
    geocoder.addressSearch(address, ...);
  }
};
```

### 4. **페이지 컴포넌트에서 Config 전달**

모든 웨딩 페이지에서 kakaoMapConfig 전달:

```typescript
<LocationMap 
  venueName={pageConfig?.venue || ''}
  address={pageConfig?.pageData?.ceremonyAddress || ''}
  description={pageConfig?.pageData?.mapDescription || ''}
  mapUrl={pageConfig?.pageData?.mapUrl || ''}
  kakaoMapConfig={pageConfig?.pageData?.kakaoMap}  // ✅ 추가
/>
```

## 🎯 장점

### 1. **중앙 집중식 관리**
- 각 페이지의 지도 설정을 한 곳에서 관리
- `/config/pages/` 디렉토리만 수정하면 됨
- 코드 수정 없이 설정만 변경 가능

### 2. **정확한 위치 표시**
- 주소 검색의 오차 없이 정확한 좌표로 표시
- 특히 새 건물이나 정확한 주소 검색이 어려운 경우 유용

### 3. **페이지별 커스터마이징**
- 페이지마다 다른 확대 레벨 설정 가능
- 마커 타이틀 커스터마이징 가능
- 도심/외곽에 따라 level 조정 (도심: 3, 외곽: 4~5)

### 4. **하위 호환성 유지**
- `kakaoMapConfig`가 없으면 기존 주소 검색 방식 사용
- 기존 페이지에 영향 없음

## 📝 사용 방법

### 새 페이지 추가 시:

1. **좌표 확인**
   - [Kakao 지도](https://map.kakao.com/)에서 장소 검색
   - URL 또는 개발자 도구에서 좌표 확인
   - 또는 [좌표 변환 도구](https://www.google.com/maps) 사용

2. **Config 파일에 추가**
```typescript
// src/config/pages/your-page.ts
pageData: {
  ceremonyAddress: '실제 주소',
  mapUrl: 'Google Maps Embed URL',
  kakaoMap: {
    latitude: 37.1234,   // 위도
    longitude: 127.5678, // 경도
    level: 3,            // 1~14 (숫자가 클수록 넓은 범위)
    markerTitle: '예식장 이름'
  }
}
```

3. **확인 및 조정**
   - 개발 서버 실행: `npm run dev`
   - 페이지에서 카카오맵 탭 선택
   - 위치와 확대 레벨 확인
   - 필요시 좌표나 level 조정

## 🔧 좌표 찾는 방법

### 방법 1: 카카오맵에서 찾기
1. https://map.kakao.com/ 접속
2. 장소 검색
3. URL에서 좌표 확인: `...?map_type=TYPE_MAP&lat=37.5048&lng=127.0280...`

### 방법 2: Google Maps에서 찾기
1. https://www.google.com/maps 접속
2. 장소 검색 후 우클릭
3. "이 위치에 대해" 클릭
4. 좌표 복사 (예: 37.5048, 127.0280)

### 방법 3: 주소를 좌표로 변환
```javascript
// Kakao 지도 API Geocoder 사용
geocoder.addressSearch('서울특별시 강남구 테헤란로 123', (result, status) => {
  console.log(result[0].y, result[0].x); // 위도, 경도
});
```

## 🗺️ Level 가이드

- **1-2**: 매우 가까운 거리 (건물 내부 수준)
- **3**: 추천 (일반적인 예식장 표시)
- **4-5**: 넓은 범위 (외곽 지역, 리조트)
- **6-8**: 동네 전체
- **9-14**: 시/도 수준

## ✅ 적용 페이지

| 페이지 | 일반 버전 | 심플 버전 | 좌표 설정 |
|--------|----------|----------|----------|
| 김민준♥박소희 | ✅ | ✅ | ✅ |
| 신민제♥김현지 | ⏳ | ⏳ | ✅ |
| 이준호♥박소민 | ⏳ | ⏳ | ✅ |
| 김태현♥최유나 | ⏳ | ⏳ | ✅ |
| 안도영♥윤지수 | ⏳ | ⏳ | ✅ |

## 📂 수정된 파일

1. **Config 파일들**
   - `src/config/weddingPages.ts` - 인터페이스 확장
   - `src/config/pages/kim-minjun-park-sohee.ts` - 카카오맵 설정 추가
   - `src/config/pages/shin-minje-kim-hyunji.ts`
   - `src/config/pages/lee-junho-park-somin.ts`
   - `src/config/pages/kim-taehyun-choi-yuna.ts`
   - `src/config/pages/an-doyoung-yoon-jisoo.ts`

2. **컴포넌트 파일들**
   - `src/components/LocationMap.tsx` - Props 및 로직 추가
   - `src/components/LocationMap_1.tsx` - Props 및 로직 추가

3. **페이지 파일들**
   - `src/app/(page)/kim-minjun-park-sohee/page.tsx` - Config 전달
   - `src/app/(page_simple)/kim-minjun-park-sohee-simple/page.tsx` - Config 전달

## 🚀 다음 단계

1. ⏳ 나머지 페이지들에 kakaoMapConfig 전달 적용
2. ⏳ 실제 좌표 정확도 검증
3. ⏳ 각 예식장별 최적의 level 값 조정

---

**구현 일자**: 2025년 10월 13일  
**개발자**: GitHub Copilot  
**버전**: 1.0.0