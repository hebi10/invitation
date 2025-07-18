export interface Post {
  id: string;
  title: string;
  content: string;
}

export async function fetchPosts(): Promise<Post[]> {
  const response = await fetch('/api/posts'); // 실제 API 엔드포인트로 변경
  if (!response.ok) throw new Error('데이터 불러오기 실패');
  return await response.json();
}
