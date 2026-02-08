// 샘플 이미지
const SAMPLE_IMAGES = {
  thumb1: require('../../assets/images/thumbnails/sample_thumb_1.png'),
  thumb2: require('../../assets/images/thumbnails/sample_thumb_2.png'),
  thumb3: require('../../assets/images/thumbnails/sample_thumb_3.png'),
  thumb4: require('../../assets/images/thumbnails/sample_thumb_4.png'),
  thumb5: require('../../assets/images/thumbnails/sample_thumb_5.png'),
  thumb6: require('../../assets/images/thumbnails/sample_thumb_6.png'),
  thumb7: require('../../assets/images/thumbnails/sample_thumb_7.png'),
  thumb8: require('../../assets/images/thumbnails/sample_thumb_8.png'),
  thumb9: require('../../assets/images/thumbnails/sample_thumb_9.png'),
  thumb10: require('../../assets/images/thumbnails/sample_thumb_10.png'),
  thumb11: require('../../assets/images/thumbnails/sample_thumb_11.png'),
  thumb12: require('../../assets/images/thumbnails/sample_thumb_12.png'),
  thumb13: require('../../assets/images/thumbnails/sample_thumb_13.png'),
  thumb14: require('../../assets/images/thumbnails/sample_thumb_14.png'),
  thumb15: require('../../assets/images/thumbnails/sample_thumb_15.png'),
  thumb16: require('../../assets/images/thumbnails/sample_thumb_16.png'),
  thumb17: require('../../assets/images/thumbnails/sample_thumb_17.png'),
  thumb18: require('../../assets/images/thumbnails/sample_thumb_18.png'),
  thumb19: require('../../assets/images/thumbnails/sample_thumb_19.png'),
  thumb20: require('../../assets/images/thumbnails/sample_thumb_20.png'),
};

export interface MockRecipe {
  id: string;
  title: string;
  category: string;
  method: string;
  reviewCount: number;
  imageSource?: any;
}

// 임시 데이터 - 20개 (피그마 기준)
export const MOCK_RECIPES: MockRecipe[] = [
  {id: '1', title: '버터스폰지케이크', category: '제과', method: '별립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb6},
  {id: '2', title: '버터스폰지케이크', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb5},
  {id: '3', title: '치즈케이크', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb16},
  {id: '4', title: '파운드케이크', category: '제과', method: '별립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb18}, // empty state
  {id: '5', title: '마들렌', category: '제과', method: '별립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb4},
  {id: '6', title: '다쿠와즈', category: '제과', method: '별립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb2},
  {id: '7', title: '슈', category: '제과', method: '익반죽법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb11},
  {id: '8', title: '쇼트브레드쿠키', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb10},
  {id: '9', title: '흑미롤케이크', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb20},
  {id: '10', title: '시폰케이크', category: '제과', method: '별립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb12},
  {id: '11', title: '타르트', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb17},
  {id: '12', title: '소프트롤케이크', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb9},
  {id: '13', title: '버터쿠키', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb7},
  {id: '14', title: '초코머핀', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb15},
  {id: '15', title: '초코롤케이크', category: '제과', method: '별립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb14},
  {id: '16', title: '젤리롤케이크', category: '제과', method: '별립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb13},
  {id: '17', title: '브라우니', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb8},
  {id: '18', title: '과일케이크', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb1},
  {id: '19', title: '마데라컵케이크', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb3},
  {id: '20', title: '호두파이', category: '제과', method: '공립법', reviewCount: 0, imageSource: SAMPLE_IMAGES.thumb19},
];
