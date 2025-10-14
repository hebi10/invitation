# 배경음악(BGM) 설정 가이드

## 1. 음악 파일 준비

### 권장 형식
- **파일 형식**: MP3 (가장 호환성이 좋음)
- **파일 크기**: 3-5MB (너무 크면 로딩이 느려짐)
- **길이**: 2-4분 (루프 재생되므로 짧아도 괜찮음)

### 무료 음악 다운로드 사이트
1. **YouTube Audio Library** (추천)
   - https://studio.youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw/music
   - 저작권 걱정 없는 무료 음악
   
2. **Pixabay Music**
   - https://pixabay.com/music/
   - 상업적 이용 가능한 무료 음악

3. **Free Music Archive**
   - https://freemusicarchive.org/
   - 다양한 장르의 무료 음악

## 2. Firebase Storage에 업로드

### 업로드 방법

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/
   ```

2. **프로젝트 선택**
   - `invitation-35d60` 프로젝트 클릭

3. **Storage 메뉴로 이동**
   - 좌측 메뉴에서 "Storage" 클릭
   - "시작하기" 버튼 클릭 (처음인 경우)

4. **폴더 생성**
   - "music" 폴더 생성 (선택사항)

5. **파일 업로드**
   - "파일 업로드" 버튼 클릭
   - 준비한 MP3 파일 선택
   - 업로드 완료 대기

6. **URL 복사**
   - 업로드된 파일 클릭
   - 오른쪽 패널에서 "토큰이 포함된 다운로드 URL" 복사
   - 예시: `https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/music%2Fwedding-bgm.mp3?alt=media&token=...`

## 3. 코드에 적용

### 페이지 파일 수정
예시: `src/app/(page_edit01)/an-doyoung-yoon-jisoo-simple/page.tsx`

```tsx
// 주석 해제하고 musicUrl에 복사한 URL 붙여넣기
<BackgroundMusic 
  autoPlay={true}
  volume={0.3}
  musicUrl="여기에_Firebase_Storage_URL_붙여넣기"
/>
```

### Props 설명
- `autoPlay`: 자동 재생 여부 (기본값: true)
  - 브라우저 정책상 사용자가 페이지를 터치/클릭하면 재생됩니다
- `volume`: 음량 (0.0 ~ 1.0, 기본값: 0.3)
  - 0.3 = 30% 볼륨 (청첩장에 적절한 볼륨)
- `musicUrl`: Firebase Storage URL (필수)

## 4. 테스트

1. 개발 서버 실행
   ```bash
   npm run dev
   ```

2. 브라우저에서 페이지 열기
   ```
   http://localhost:3000/an-doyoung-yoon-jisoo-simple
   ```

3. 우측 상단의 ON/OFF 버튼 확인
   - 페이지 터치/클릭 시 자동 재생 시작
   - ON: 음악 재생 중 (검은 배경)
   - OFF: 음악 정지 (흰 배경)

## 5. 배포

```bash
npm run build
npm run deploy:firebase
```

## 문제 해결

### 음악이 재생되지 않을 때
1. **URL 확인**: Firebase Storage URL이 올바른지 확인
2. **브라우저 콘솔 확인**: F12 → Console 탭에서 오류 메시지 확인
3. **파일 형식 확인**: MP3 파일인지 확인
4. **CORS 오류**: Firebase Storage는 CORS를 자동으로 허용함

### 자동 재생이 안 될 때
- 브라우저 정책상 사용자 상호작용(클릭, 터치) 후에만 자동 재생 가능
- 페이지를 터치/클릭하면 자동으로 재생됩니다

### 볼륨이 너무 크거나 작을 때
```tsx
<BackgroundMusic 
  volume={0.2}  // 더 조용하게
  // 또는
  volume={0.5}  // 더 크게
  musicUrl="..."
/>
```

## 추천 웨딩 음악

1. **Canon in D** - Pachelbel (가장 클래식한 웨딩 음악)
2. **A Thousand Years** - Christina Perri (인기 웨딩송)
3. **All of Me** - John Legend (감성적인 웨딩송)
4. **Marry You** - Bruno Mars (경쾌한 웨딩송)
5. **Wedding March** - Wagner (전통적인 입장곡)

## 라이선스 주의사항

⚠️ **중요**: 반드시 저작권이 없거나 상업적 이용이 허용된 음악을 사용하세요.
- YouTube Audio Library
- Pixabay Music
- Creative Commons 라이선스 음악

유명 가수의 원곡을 무단으로 사용하면 저작권 문제가 발생할 수 있습니다.
