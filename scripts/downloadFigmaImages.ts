#!/usr/bin/env ts-node

/**
 * Figma에서 이미지를 다운로드하는 스크립트
 *
 * 사용 방법:
 * npx ts-node scripts/downloadFigmaImages.ts [Figma URL with node-id]
 *
 * 예시:
 * npx ts-node scripts/downloadFigmaImages.ts "https://www.figma.com/design/ce9cxzvQSvJoPldTSZIiGG/RE-BAKE?node-id=73553-102328"
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  getFigmaNodes,
  getFigmaImages,
  extractFileKeyFromUrl,
  extractNodeIdFromUrl,
} from '../src/utils/figmaApi';

const ASSETS_DIR = path.join(__dirname, '../assets/images/recipes');

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

function findImageNodes(node: FigmaNode, images: FigmaNode[] = []): FigmaNode[] {
  // RECTANGLE, FRAME with image fills, or specific image types
  if (
    node.type === 'RECTANGLE' ||
    node.type === 'FRAME' ||
    node.type === 'INSTANCE' ||
    node.type === 'COMPONENT'
  ) {
    images.push(node);
  }

  if (node.children) {
    for (const child of node.children) {
      findImageNodes(child, images);
    }
  }

  return images;
}

async function downloadImage(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(filename, Buffer.from(buffer));
  console.log(`✅ 저장됨: ${filename}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(
      '사용 방법: npx ts-node scripts/downloadFigmaImages.ts [Figma URL with node-id]',
    );
    console.log('');
    console.log('예시:');
    console.log(
      '  npx ts-node scripts/downloadFigmaImages.ts "https://www.figma.com/design/ce9cxzvQSvJoPldTSZIiGG/RE-BAKE?node-id=73553-102328"',
    );
    process.exit(1);
  }

  const figmaUrl = args[0];

  try {
    const fileKey = extractFileKeyFromUrl(figmaUrl);
    const nodeId = extractNodeIdFromUrl(figmaUrl);

    if (!nodeId) {
      console.error('URL에 node-id가 없습니다. ?node-id=xxx 형식으로 제공하세요.');
      process.exit(1);
    }

    // node-id URL 형식 변환: 73553-102328 -> 73553:102328
    const apiNodeId = nodeId.replace('-', ':');

    console.log(`파일 키: ${fileKey}`);
    console.log(`노드 ID: ${apiNodeId}`);

    // 노드 정보 가져오기
    console.log('\n노드 정보 가져오는 중...');
    const nodesData = await getFigmaNodes(fileKey, [apiNodeId]);

    const nodeData = nodesData.nodes[apiNodeId];
    if (!nodeData) {
      console.error('노드를 찾을 수 없습니다.');
      process.exit(1);
    }

    // 이미지 노드 찾기
    const imageNodes = findImageNodes(nodeData.document);
    console.log(`\n이미지 노드 ${imageNodes.length}개 발견`);

    if (imageNodes.length === 0) {
      console.log('이미지 노드가 없습니다.');
      process.exit(0);
    }

    // 노드 이름 출력
    console.log('\n발견된 노드:');
    imageNodes.slice(0, 20).forEach((node, i) => {
      console.log(`  ${i + 1}. ${node.name} (${node.type}) - ${node.id}`);
    });

    // 이미지 URL 가져오기
    const nodeIds = imageNodes.slice(0, 20).map(n => n.id);
    console.log('\n이미지 URL 가져오는 중...');
    const imageUrls = await getFigmaImages(fileKey, nodeIds, 2);

    // 에셋 폴더 생성
    if (!fs.existsSync(ASSETS_DIR)) {
      fs.mkdirSync(ASSETS_DIR, {recursive: true});
    }

    // 이미지 다운로드
    console.log('\n이미지 다운로드 중...');
    for (const node of imageNodes.slice(0, 20)) {
      const imageUrl = imageUrls[node.id];
      if (imageUrl) {
        const safeName = node.name
          .replace(/[^a-zA-Z0-9가-힣]/g, '_')
          .toLowerCase();
        const filename = path.join(ASSETS_DIR, `${safeName}.png`);
        await downloadImage(imageUrl, filename);
      }
    }

    console.log('\n✅ 완료! 이미지가 assets/images/recipes/ 폴더에 저장되었습니다.');
  } catch (error) {
    console.error('오류 발생:', error);
    process.exit(1);
  }
}

main();
