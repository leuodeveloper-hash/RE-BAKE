#!/usr/bin/env ts-node

/**
 * Figma에서 디자인 토큰을 가져와서 코드로 변환하는 스크립트
 * 
 * 사용 방법:
 * 1. .env 파일에 FIGMA_PERSONAL_ACCESS_TOKEN 설정
 * 2. Figma 파일 URL 또는 파일 키 제공
 * 3. 실행: npx ts-node scripts/fetchFigmaTokens.ts [Figma URL 또는 File Key]
 */

import 'dotenv/config';
import {getFigmaFile, extractFileKeyFromUrl} from '../src/utils/figmaApi';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('사용 방법: npx ts-node scripts/fetchFigmaTokens.ts [Figma URL 또는 File Key]');
    console.log('');
    console.log('예시:');
    console.log('  npx ts-node scripts/fetchFigmaTokens.ts https://www.figma.com/design/ce9cxzvQSvJoPldTSZIiGG/RE-BAKE');
    console.log('  npx ts-node scripts/fetchFigmaTokens.ts ce9cxzvQSvJoPldTSZIiGG');
    process.exit(1);
  }

  const input = args[0];
  let fileKey: string;

  try {
    // URL인지 파일 키인지 확인
    if (input.includes('figma.com')) {
      fileKey = extractFileKeyFromUrl(input);
      console.log(`파일 키 추출: ${fileKey}`);
    } else {
      fileKey = input;
    }

    console.log(`Figma 파일 정보 가져오는 중...`);
    const fileData = await getFigmaFile(fileKey);

    console.log('\n=== 파일 정보 ===');
    console.log(`이름: ${fileData.document.name}`);
    console.log(`타입: ${fileData.document.type}`);
    console.log(`컴포넌트 수: ${Object.keys(fileData.components || {}).length}`);
    console.log(`스타일 수: ${Object.keys(fileData.styles || {}).length}`);

    // 스타일 정보 출력
    if (fileData.styles && Object.keys(fileData.styles).length > 0) {
      console.log('\n=== 디자인 토큰 (스타일) ===');
      Object.values(fileData.styles).forEach(style => {
        console.log(`- ${style.name} (${style.styleType})`);
      });
    }

    // 컴포넌트 정보 출력
    if (fileData.components && Object.keys(fileData.components).length > 0) {
      console.log('\n=== 컴포넌트 ===');
      Object.values(fileData.components).slice(0, 10).forEach(component => {
        console.log(`- ${component.name}`);
      });
      if (Object.keys(fileData.components).length > 10) {
        console.log(`... 외 ${Object.keys(fileData.components).length - 10}개`);
      }
    }

    // JSON 파일로 저장 (선택사항)
    if (args.includes('--save')) {
      const fs = require('fs');
      const outputPath = 'figma-data.json';
      fs.writeFileSync(outputPath, JSON.stringify(fileData, null, 2));
      console.log(`\n데이터가 ${outputPath}에 저장되었습니다.`);
    }

  } catch (error) {
    console.error('오류 발생:', error);
    process.exit(1);
  }
}

main();
