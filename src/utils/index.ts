// === Utils Barrel Exports ===

// 웨딩 페이지 정보 (클라이언트용)
export { 
  getWeddingPagesClient, 
  getWeddingPageBySlug,
  getWeddingPageConfig,
  type WeddingPageInfo 
} from './getWeddingPagesClient';

// 페이지 접근 제어
export { checkPageAccess, AccessDeniedPage } from './pageAccess';
// 주의: getWeddingPages는 fs를 사용하므로 서버 사이드에서만 직접 import 하세요
