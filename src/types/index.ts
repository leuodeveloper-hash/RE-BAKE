/**
 * 공통 TypeScript 타입 정의
 */

// 예시: API 응답 타입
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// 예시: 사용자 타입
export interface User {
  id: string;
  name: string;
  email: string;
}
