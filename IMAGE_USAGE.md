# 🎯 간편한 이미지 사용법

`usePageImages` 훅을 사용하여 Firebase Storage에서 업로드된 이미지를 간편하게 가져와 사용할 수 있습니다.

## 기본 사용법

```tsx
import { usePageImages } from '@/hooks/usePageImages';

function MyComponent() {
  const { images, imageUrls, firstImage, hasImages } = usePageImages('shin-minje-kim-hyunji');

  return (
    <div>
      {/* 첫 번째 이미지 표시 */}
      {firstImage && <img src={firstImage.url} alt={firstImage.name} />}
      
      {/* 모든 이미지 URL 배열로 사용 */}
      <Gallery images={imageUrls} />
      
      {/* 이미지가 있는지 확인 */}
      {hasImages && <p>업로드된 이미지가 있습니다!</p>}
    </div>
  );
}
```

## 반환되는 값들

- `images`: 모든 이미지 객체 배열 (name, url, path, uploadedAt 포함)
- `imageUrls`: 이미지 URL만 추출한 문자열 배열
- `firstImage`: 첫 번째 이미지 객체 (없으면 null)
- `hasImages`: 이미지가 있는지 여부 (boolean)
- `loading`: 로딩 상태
- `error`: 에러 메시지
- `getImageByName(name)`: 이름으로 특정 이미지 찾기

## 활용 예시

### 1. 배경 이미지로 사용
```tsx
const { firstImage } = usePageImages('my-page');

<div style={{ 
  backgroundImage: firstImage ? `url(${firstImage.url})` : 'none',
  backgroundSize: 'cover'
}}>
  내용
</div>
```

### 2. 갤러리에 기본 이미지와 함께 사용
```tsx
const { imageUrls, hasImages } = usePageImages('my-page');
const defaultImages = ['url1', 'url2', 'url3'];

<Gallery images={hasImages ? [...imageUrls, ...defaultImages] : defaultImages} />
```

### 3. 특정 이름의 이미지 찾기
```tsx
const { getImageByName } = usePageImages('my-page');
const profileImage = getImageByName('profile');

{profileImage && <img src={profileImage.url} alt="프로필" />}
```

### 4. 조건부 렌더링
```tsx
const { hasImages, loading, error } = usePageImages('my-page');

if (loading) return <div>이미지 로딩 중...</div>;
if (error) return <div>에러: {error}</div>;
if (!hasImages) return <div>업로드된 이미지가 없습니다.</div>;
```

## 페이지별 사용 가능한 슬러그

- `'shin-minje-kim-hyunji'` - 신민제 ♥ 김현지
- `'lee-junho-park-somin'` - 이준호 ♥ 박소민  
- `'kim-taehyun-choi-yuna'` - 김태현 ♥ 최유나

## 💡 팁

- 이미지는 자동으로 캐싱되므로 동일한 페이지에서 여러 번 호출해도 효율적입니다.
- 이미지가 없어도 에러가 발생하지 않으며, 빈 배열이 반환됩니다.
- `firstImage`는 업로드 시간 순으로 첫 번째 이미지를 반환합니다.
