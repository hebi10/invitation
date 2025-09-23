#!/bin/bash

# 모든 웨딩 페이지에 ScrollAnimatedSection 추가하는 스크립트

# 기본 페이지들 (page)
pages=(
  "shin-minje-kim-hyunji"
  "lee-junho-park-somin" 
  "kim-taehyun-choi-yuna"
)

# 심플 페이지들 (page_edit01)
simple_pages=(
  "shin-minje-kim-hyunji-simple"
  "lee-junho-park-somin-simple"
  "kim-taehyun-choi-yuna-simple"
)

echo "웨딩 페이지들에 스크롤 애니메이션을 적용합니다..."

# 기본 페이지들 처리
for page in "${pages[@]}"; do
  file_path="c:/Users/gy554/Desktop/개인 포폴 관련/invitation/src/app/(page)/$page/page.tsx"
  if [ -f "$file_path" ]; then
    echo "처리 중: $file_path"
    # ScrollAnimatedSection import 추가 (이미 있는 경우 무시)
    sed -i '/ScrollAnimatedSection/!s/} from '\''@\/components'\'';/,\n  ScrollAnimatedSection\n} from '\''@\/components'\'';/' "$file_path"
    echo "✓ $page 페이지 처리 완료"
  else
    echo "⚠ 파일을 찾을 수 없음: $file_path"
  fi
done

# 심플 페이지들 처리  
for page in "${simple_pages[@]}"; do
  file_path="c:/Users/gy554/Desktop/개인 포폴 관련/invitation/src/app/(page_edit01)/$page/page.tsx"
  if [ -f "$file_path" ]; then
    echo "처리 중: $file_path"
    # ScrollAnimatedSection import 추가 (이미 있는 경우 무시)
    sed -i '/ScrollAnimatedSection/!s/} from '\''@\/components'\'';/,\n  ScrollAnimatedSection\n} from '\''@\/components'\'';/' "$file_path"
    echo "✓ $page 페이지 처리 완료"
  else
    echo "⚠ 파일을 찾을 수 없음: $file_path"
  fi
done

echo "모든 페이지 처리가 완료되었습니다!"
echo "수동으로 각 페이지의 컴포넌트들을 ScrollAnimatedSection으로 감싸주세요."