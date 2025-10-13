# 🎵 배경 음악 기능 사용 가이드

## 개요
모바일 청첩장에 저작권 걱정 없는 아름다운 클래식 음악을 배경음으로 추가할 수 있습니다.

## 사용 방법

### 기본 사용
```tsx
import { BackgroundMusic } from '@/components';

export default function WeddingPage() {
  return (
    <main>
      <BackgroundMusic autoPlay={true} volume={0.3} />
      {/* 나머지 컴포넌트들 */}
    </main>
  );
}
```

### Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `autoPlay` | boolean | `true` | 자동 재생 활성화 여부 |
| `volume` | number | `0.3` | 볼륨 크기 (0.0 ~ 1.0) |
| `musicIndex` | number | `0` | 음악 선택 인덱스 (0-4) |

### 음악 목록

현재 사용 가능한 저작권 없는 음악 목록:

0. **Canon in D - Pachelbel** (기본)
   - 가장 인기있는 웨딩 음악
   - 차분하고 우아한 분위기

1. **Air on the G String - Bach**
   - 감성적이고 서정적인 클래식
   - 감동적인 분위기 연출

2. **Wedding March - Wagner**
   - 전통적인 결혼 행진곡
   - 경쾌하고 축제 분위기

3. **Clair de Lune - Debussy**
   - 로맨틱하고 꿈같은 분위기
   - 은은하고 우아한 느낌

4. **Spring - Vivaldi**
   - 밝고 경쾌한 봄의 선율
   - 희망찬 시작을 상징

### 다른 음악 사용하기

```tsx
{/* Air on the G String 사용 */}
<BackgroundMusic autoPlay={true} volume={0.3} musicIndex={1} />

{/* Wedding March 사용 */}
<BackgroundMusic autoPlay={true} volume={0.3} musicIndex={2} />
```

## 기능 설명

### 자동 재생
- 사용자가 페이지와 첫 상호작용(클릭, 터치, 스크롤 등) 시 자동으로 재생됩니다
- 브라우저 정책상 완전 자동 재생은 제한될 수 있습니다

### 재생 컨트롤
- **재생/일시정지 버튼**: 큰 원형 버튼으로 음악을 제어
- **음소거 버튼**: 작은 원형 버튼으로 음소거 토글
- 재생 중에는 펄스 애니메이션 효과 표시

### 사용자 안내
- 자동 재생이 활성화되지 않았을 때 "화면을 터치하시면 음악이 재생됩니다" 안내 메시지 표시
- 5초 후 자동으로 사라짐

### 접근성
- ARIA 레이블로 스크린 리더 지원
- 키보드로 포커스 가능
- `prefers-reduced-motion` 설정 존중

## 모바일 최적화

### 반응형 디자인
- 모바일에서 버튼 크기와 위치 자동 조정
- 작은 화면에서는 힌트 메시지 숨김

### 성능 최적화
- 음악 파일 미리 로드 (`preload="auto"`)
- 무한 반복 재생 (`loop`)
- 최적화된 볼륨 (기본 30%)

## 주의사항

1. **자동 재생 정책**
   - 모바일 Safari 등 일부 브라우저는 자동 재생을 차단할 수 있습니다
   - 이 경우 사용자가 수동으로 재생 버튼을 눌러야 합니다

2. **데이터 사용량**
   - 스트리밍 음악이므로 데이터가 소비됩니다
   - Wi-Fi 환경에서 사용을 권장합니다

3. **볼륨 조절**
   - 기본 볼륨(0.3)은 배경음악으로 적절한 크기입니다
   - 필요에 따라 조절 가능합니다

## 커스터마이징

### 다른 음악 추가하기
`BackgroundMusic.tsx` 파일의 `musicList` 배열에 새로운 음악을 추가할 수 있습니다:

```tsx
const musicList = [
  // 기존 음악들...
  {
    name: '새로운 음악 제목',
    url: '음악 파일 URL'
  }
];
```

**주의**: 반드시 저작권이 없거나 사용 허가를 받은 음악만 사용하세요.

### 스타일 변경
`BackgroundMusic.module.css` 파일에서 버튼 색상, 크기, 위치 등을 자유롭게 변경할 수 있습니다.

## 저작권 정보

사용된 모든 음악은 Public Domain(퍼블릭 도메인) 클래식 음악으로, 저작권 걱정 없이 자유롭게 사용할 수 있습니다.

음원 제공: [mfiles.co.uk](https://www.mfiles.co.uk)