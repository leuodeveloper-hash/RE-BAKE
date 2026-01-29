/**
 * Figma API 유틸리티
 * Figma MCP를 통해 디자인 토큰과 컴포넌트를 가져오는 헬퍼 함수들
 */

const FIGMA_TOKEN = process.env.FIGMA_PERSONAL_ACCESS_TOKEN || '';

export interface FigmaFileResponse {
  document: {
    id: string;
    name: string;
    type: string;
    children: FigmaNode[];
  };
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  fills?: Array<{type: string; color?: {r: number; g: number; b: number; a: number}}>;
  effects?: Array<{type: string; color?: {r: number; g: number; b: number; a: number}}>;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

/**
 * Figma 파일 정보 가져오기
 * @param fileKey Figma 파일 키 (URL에서 추출)
 */
export async function getFigmaFile(fileKey: string): Promise<FigmaFileResponse> {
  if (!FIGMA_TOKEN) {
    throw new Error('FIGMA_PERSONAL_ACCESS_TOKEN이 설정되지 않았습니다. .env 파일을 확인하세요.');
  }

  const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': FIGMA_TOKEN,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Figma API 오류: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Figma 파일의 특정 노드 가져오기
 * @param fileKey Figma 파일 키
 * @param nodeIds 가져올 노드 ID 배열
 */
export async function getFigmaNodes(
  fileKey: string,
  nodeIds: string[],
): Promise<any> {
  if (!FIGMA_TOKEN) {
    throw new Error('FIGMA_PERSONAL_ACCESS_TOKEN이 설정되지 않았습니다. .env 파일을 확인하세요.');
  }

  const ids = nodeIds.join(',');
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${ids}`,
    {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Figma API 오류: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Figma 파일에서 이미지 가져오기
 * @param fileKey Figma 파일 키
 * @param nodeIds 이미지를 가져올 노드 ID 배열
 * @param scale 이미지 스케일 (1, 2, 4)
 */
export async function getFigmaImages(
  fileKey: string,
  nodeIds: string[],
  scale: 1 | 2 | 4 = 2,
): Promise<Record<string, string>> {
  if (!FIGMA_TOKEN) {
    throw new Error('FIGMA_PERSONAL_ACCESS_TOKEN이 설정되지 않았습니다. .env 파일을 확인하세요.');
  }

  const ids = nodeIds.join(',');
  const response = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${ids}&format=png&scale=${scale}`,
    {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Figma API 오류: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.images;
}

/**
 * Figma 파일 키를 URL에서 추출
 * @param figmaUrl Figma 파일 URL
 * @returns 파일 키
 */
export function extractFileKeyFromUrl(figmaUrl: string): string {
  // https://www.figma.com/design/[FILE_KEY]/...
  const match = figmaUrl.match(/figma\.com\/design\/([^/?]+)/);
  if (!match) {
    throw new Error('유효하지 않은 Figma URL입니다.');
  }
  return match[1];
}

/**
 * Figma 노드 ID를 URL에서 추출
 * @param figmaUrl Figma URL (node-id 포함)
 * @returns 노드 ID
 */
export function extractNodeIdFromUrl(figmaUrl: string): string | null {
  // ...?node-id=49823-12141
  const match = figmaUrl.match(/node-id=([^&]+)/);
  return match ? match[1] : null;
}
