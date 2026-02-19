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

// 과정 이미지
const STEP_IMAGES = {
  '1_sheet_1_1': require('../../assets/images/steps/1_sheet_1_1.png'),
};

export interface IngredientGroup {
  title: string;
  ingredients: {name: string; amount: string}[];
}

export interface Step {
  step: number;
  description: string;
  tip?: string;
  caution?: string;
  /** 번들 이미지 (최대 3장) */
  images?: any[];
}

export interface StepGroup {
  title: string;
  steps: Step[];
}

export interface MockRecipe {
  id: string;
  title: string;
  cookbook: string;
  method: string;
  specificGravity?: string;
  ratio?: string;
  reviewCount: number;
  imageSource?: any;
  /** 사용자가 선택한 이미지 URI */
  imageUri?: string;
  time?: string;
  servings?: string;
  session?: string;
  ingredientGroups?: IngredientGroup[];
  tools?: {name: string}[];
  steps?: Step[];
  stepGroups?: StepGroup[];
  activeFieldIds?: string[];
  reviews?: {evaluation: string; improvement: string}[];
  /** 둘러보기에서 가져온 경우 원본 레시피 ID */
  sourceId?: string;
  /** 다시 만들기 회차 그룹 식별자 */
  remakeGroupId?: string;
  /** 생성 시각 (ISO 문자열) */
  createdAt?: string;
}

// 둘러보기 초기 데이터 - 20개 (피그마 기준)
export const EXPLORE_MOCK_RECIPES: MockRecipe[] = [
  {
    id: '1',
    title: '버터스폰지케이크',
    cookbook: '제과기능사',
    method: '별립법',
    specificGravity: '0.45~0.5',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb6,
    time: '1시간 50분',
    servings: '3호 4개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '600g'},
          {name: '베이킹파우더', amount: '6g'},
          {name: '바닐라향', amount: '3g (2)'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕A(노른자에 들어가는 설탕)', amount: '360g'},
          {name: '설탕B(흰자에 들어가는 설탕)', amount: '360g'},
          {name: '소금', amount: '9g (8)'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '달걀', amount: '900g (17개)'},
          {name: '용해 버터', amount: '150g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱볼'},
      {name: '거품기'},
      {name: '가스레인지'},
      {name: '물'},
      {name: '고무주걱'},
      {name: '채반'},
      {name: '케이크 틀(3호 4개)'},
      {name: '스크래퍼'},
      {name: '가위'},
      {name: '유산지'},
      {name: '오븐'},
    ],
    stepGroups: [
      {
        title: '유산지 재단',
        steps: [
          {step: 1, description: '밑면용 유산지 한 장을 반으로 2번 접으면 밑면 동그라미 4개가 나와요. 유산지 위에 케이크 틀을 올린 후 연필로 대고 동그라미를 그려서 잘라요.', tip: '틀 안에 들어가도록 본 뜬 틀보다 작게 잘라요.'},
          {step: 2, description: '옆면은 직사각형이라 유산지 긴 면을 반으로 2번 접어서 4개로 잘라요.', tip: '옆면은 가위보다 커터 칼로 자르는 게 편해요. 2~3센티 정도 접고 틀에 유산지를 넣었을 때 틀 높이에서 1센티 이상 올라오게 해요. 1개씩 자르면 오래 걸리니 자른 옆면 4장을 다 겹쳐서 밑에 접은 부분에 사선으로 1센티 정도 간격으로 잘라요. 가위질을 하는 이유는 동그라미 안에 잘 들어가도록 하기 위해서랍니다! 두꺼우면 동그랗게 잘 안되니까 1센티 정도로 얇게 넣는 것이 좋아요.'},
          {step: 3, description: '옆면에 1개를 넣으면 3호 팬은 중간이 모자라요. 옆면을 한 개 더 만들어서 4등분 해서 4개의 케이크 틀에 부족한 부분에 잘린 부분이 안쪽으로 들어가게 끼워 넣어요.'},
          {step: 4, description: '옆면용 유산지 먼저 케이크 틀 안에 넣은 후, 밑면용 유산지를 케이크 틀 안에 넣어요!', tip: '4개 분량의 반죽이라 4개의 케이크 틀에 넣을 유산지를 만들어서 넣었어요^^'},
          {step: 5, description: '이렇게 4개 만들어 놓고 위 온도 180도 / 아래 온도 160도로 오븐을 미리 예열해요!'},
        ],
      },
      {
        title: '시트',
        steps: [
          {step: 1, description: '달걀을 노른자와 흰자로 분리해요.', tip: '흰자에 노른자가 들어가면 머랭이 잘 안 올라와요! 분리할 때 믹싱볼을 나눠서 흰자를 따로 분리한 뒤 흰자 믹싱볼에 옮겨 놓는 것이 좋아요. 노른자에 비해 설탕이 많아서 잘 안 녹으니까 노른자에 흰자가 조금 들어가면 잘 녹는답니다.', images: [STEP_IMAGES['1_sheet_1_1']]},
          {step: 2, description: '버너에 버터를 중탕하고 가루재료를 체쳐요.', tip: '팔팔 끓이지 않고 약한 불로 용해해요. 60도 정도로 용해해요!'},
          {step: 3, description: '흰자에 설탕 B를 넣고 거품기로 섞은 후 기계로 섞어요.', tip: '1단계→2단계→3단계, 저속 → 중속 → 고속으로 섞어요!'},
          {step: 4, description: '기계 돌리는 동시에 수작업으로 노른자를 섞어요.', tip: '노른자를 잘 섞어야 해요. 잘 섞지 않으면 노른자와 설탕이 만나서 점처럼 생겨요. 노른자를 잘 풀고 소금 먼저 섞은 후 설탕A를 3번에 나눠서 넣고 아이보리색까지 섞어요! 머랭을 만들고 있는 기계로 가서 80~90 정도로 끝이 조금 내려오는 정도로 머랭을 만든 후 3단계로 30초→ 2단계 30초→ 1단계로 마무리'},
          {step: 5, description: '노른자 반죽에 머랭 3분의 1을 넣고 섞어요.', tip: '가루 재료랑 머랭을 넣고 섞기 때문에 노른자 반죽을 큰 곳에 하는 게 좋아요! 막 섞으면 머랭 꺼지니 머랭이 꺼지지 않게 위 표면에 발라서 펴주고 들어서 섞어요!'},
          {step: 6, description: '체 친 가루를 넣고 섞어요.', tip: '덧가루가 안 보일 정도로만 섞어요!'},
          {step: 7, description: '머랭의 3분의 1을 넣고 섞어요.'},
          {step: 8, description: '용해 버터를 넣고 섞어요.', tip: '한 번에 확 넣으면 섞이는 곳과 안 섞이는 곳이 있으니 녹인 버터에 주걱으로 반죽을 2스푼 정도 넣고 막 섞는 희생 반죽을 하고 난 후 희생 반죽을 믹싱볼에 다시 넣고 섞으면 잘 섞여요.'},
          {step: 9, description: '머랭의 3분의 1을 넣고 섞어요.', tip: '반죽이 끝난 후 온도 체크와 비중 체크를 해요!'},
          {step: 10, description: '반죽을 케이크 틀의 유산지 안에 채워 넣어요.', tip: '처음부터 계량기에 놓고 똑같이 g을 재는 것보다 50%씩 4개의 팬에 채운 후에 남은 반죽으로 나머지를 채워 넣는 게 더 쉬워요. 오븐에 넣기 전에 바닥에 탕탕탕 3회 쳐서 기포를 빼요!'},
          {step: 11, description: '위 온도 180도/아래 온도 160도에서 20~25분 구워요.', tip: '오븐에 지그재그로 넣어야 잘 구워진다고 해요. 색깔이 골고루 나오면 자리를 안 바꿔도 되지만 색깔이 골고루 나오지 않았으면 위치를 앞뒤, 양옆으로 바꿔줘요! 오븐에서 꺼낸 후 팬에서 빼고 유산지를 떼어내고 냉각시키면 된답니다!'},
        ],
      },
    ],
  },
  {
    id: '2',
    title: '버터스폰지케이크',
    cookbook: '제과기능사',
    method: '공립법',
    specificGravity: '0.45~0.55',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb5,
    time: '1시간 50분',
    servings: '3호 4개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '500g'},
          {name: '바닐라향', amount: '2.5g (2)'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕', amount: '600g'},
          {name: '소금', amount: '5g (4)'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '달걀', amount: '900g'},
          {name: '버터', amount: '100g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱볼'},
      {name: '거품기'},
      {name: '가스레인지'},
      {name: '물'},
      {name: '쇠 스크래퍼'},
      {name: '고무주걱'},
      {name: '채반'},
      {name: '케이크 틀(3호 4개)'},
      {name: '가위'},
      {name: '유산지'},
      {name: '오븐'},
    ],
    stepGroups: [
      {
        title: '유산지 재단',
        steps: [
          {step: 1, description: '밑면용 유산지 한 장을 반으로 2번 접으면 밑면 동그라미 4개가 나와요. 유산지 위에 케이크 틀을 올린 후 연필로 대고 동그라미를 그려서 잘라요.', tip: '틀 안에 들어가도록 본 뜬 틀보다 작게 잘라요.'},
          {step: 2, description: '옆면은 직사각형이라 유산지 긴 면을 반으로 2번 접어서 4개로 잘라요.', tip: '옆면은 가위보다 커터 칼로 자르는 게 편해요. 2~3센티 정도 접고 틀에 유산지를 넣었을 때 틀 높이에서 1센티 이상 올라오게 해요. 1개씩 자르면 오래 걸리니 자른 옆면 4장을 다 겹쳐서 밑에 접은 부분에 사선으로 1센티 정도 간격으로 잘라요. 가위질을 하는 이유는 동그라미 안에 잘 들어가도록 하기 위해서랍니다! 두꺼우면 동그랗게 잘 안되니까 1센티 정도로 얇게 넣는 것이 좋아요.'},
          {step: 3, description: '옆면에 1개를 넣으면 3호 팬은 중간이 모자라요. 옆면을 한 개 더 만들어서 4등분 해서 4개의 케이크 틀에 부족한 부분에 잘린 부분이 안쪽으로 들어가게 끼워 넣어요.'},
          {step: 4, description: '옆면용 유산지 먼저 케이크 틀 안에 넣은 후, 밑면용 유산지를 케이크 틀 안에 넣어요!', tip: '4개 분량의 반죽이라 4개의 케이크 틀에 넣을 유산지를 만들어서 넣었어요^^'},
          {step: 5, description: '이렇게 4개 만들어 놓고 위 온도 180도 / 아래 온도 160도로 오븐을 미리 예열해요!'},
        ],
      },
      {
        title: '시트',
        steps: [
          {step: 1, description: '달걀을 거품기로 쉬어요.', tip: '노른자랑 흰 자가 잘 쉬이게 하고 알끈이 풀리도록 들었다 놨다 하며 쉬어요.'},
          {step: 2, description: '설탕과 소금을 섞어서 넣고 중탕해요.', tip: '물을 넣은 믹싱볼 안에 쇠 스크래퍼를 넣고 그 위에 믹싱볼을 넣으면 물이 넘치거나 물이 제품에 들어가지 않도록 할 수 있어요! 약불에서 계란이 익지 않도록 저으면서 설탕을 잘 녹여요. 43도 이상이면 계란이 익어서 40~43도까지만 해요! 중탕은 살살 저으면서 설탕이 녹을 때까지 해요. 설탕이 녹았는지 확인하는 방법은 색깔이 진한 노란색으로 변해요!'},
          {step: 3, description: '중탕한 물을 버리지 말고 버터를 담은 볼을 넣어요.', tip: '반죽을 만드는 동안 버터가 녹아요.'},
          {step: 4, description: '휘퍼를 장착하고 거품을 올려요.', tip: '1단으로 30초, 2단으로 1분, 3단으로 아이보리색이 될 때까지 해요. (1단계 → 2단계 → 3단계 → 1단계로 마무리 / 저속 → 고속 → 저속) 아이보리색으로 변하고 반죽이 2.5배 정도 부풀어 오르고 반죽에 휘퍼 자국이 생기는 시점! 젓가락에 반죽을 찍었을 때 반죽이 흐르지 않고 매달려 있는 시점, 젓가락으로 떠서 리본을 그렸을 때 리본이 유지되었다가 사라지는 시점이라고 해요!'},
          {step: 5, description: '3단계로 돌릴 때 박력분과 바닐라향을 같이 체 쳐요.', tip: '3단계로 돌리는 시간이 오래 걸리니까 그 사이에 박력분과 바닐라향을 섞어서 같이 체 쳐놔요.'},
          {step: 6, description: '반죽에 체 친 가루 넣고 11자로 섞어요.', tip: '올라온 거품이 꺼지지 않게 옆면과 밑면을 11자로 섞어야 해요. 제품에 덩어리져 있으면 안 익고 나오기 때문에 가루가 덩어리지지 않게 잘 섞어야 해요.'},
          {step: 7, description: '녹은 버터를 넣고 섞어요.', tip: '한 번에 확 넣으면 섞이는 곳과 안 섞이는 곳이 있으니 녹인 버터에 주걱으로 반죽을 2스푼 정도 넣고 막 섞는 희생 반죽을 해요. 희생 반죽한 것을 큰 믹싱볼에 다시 넣고 섞으면 잘 섞여요. (골고루 들어가게 반죽을 원을 돌리면서 넣어요!)'},
          {step: 8, description: '반죽을 케이크 틀 안에 넣은 유산지에 안에 채워 넣어요.', tip: '처음부터 계량기에 놓고 똑같이 g을 재는 것보다 50프로씩 4개 채운 후에 남은 반죽으로 나머지를 채워 넣는 게 더 쉬워요.'},
          {step: 9, description: '위 온도 180도/아래 온도 160도에서 20~25분 구워요.', tip: '오븐에 넣기 전에 바닥에 탕탕탕 3회 쳐서 기포를 빼고 오븐에 지그재그로 넣어야 잘 구워진다고 해요. 색깔이 골고루 나오면 자리를 안 바꿔도 되지만 색깔이 골고루 나오지 않았으면 위치를 앞뒤, 양옆으로 바꿔줘요. *시험장에서는 오븐에 넣고 구워질 동안 설거지와 테이블 정리 정돈을 해요.'},
        ],
      },
    ],
  },
  {
    id: '3',
    title: '치즈케이크',
    cookbook: '제과기능사',
    method: '크림별립법',
    specificGravity: '0.7~0.8',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb16,
    time: '2시간 30분',
    servings: '20개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '중력분', amount: '80g'},
        ],
      },
      {
        title: '감미',
        ingredients: [
          {name: '설탕 A', amount: '80g'},
          {name: '설탕 B', amount: '80g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '버터', amount: '80g'},
          {name: '달걀', amount: '240g'},
          {name: '크림치즈', amount: '400g'},
          {name: '우유', amount: '130g'},
        ],
      },
      {
        title: '액체류',
        ingredients: [
          {name: '럼주', amount: '10g'},
          {name: '레몬주스', amount: '20g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '믹싱볼'},
      {name: '핸드믹서'},
      {name: '고무주걱'},
      {name: '원형 팬(1호)'},
      {name: '비닐백'},
      {name: '밀대'},
      {name: '오븐'},
      {name: '오븐 트레이'},
    ],
    stepGroups: [
      {
        title: '컵세팅',
        steps: [
          {step: 1, description: '계량 외에 별도의 버터와 설탕을 계량해서 컵에 골고루 손으로 버터 칠을 해서 설탕 옷을 입혀줄 거예요!'},
          {step: 2, description: '버터 칠한 컵에 설탕을 담고 돌려가며 설탕을 입힌 후 뒤집어서 탁탁 쳐요.', tip: '버터 칠을 꼼꼼히 해야 잘 떨어지고 설탕이 뭉치지 않게 잘 덜어줘야 해요. 그렇지 않으면 제품에 영향을 줍니다.'},
          {step: 3, description: '이렇게 20개를 미리 준비한 후 오븐을 200/140도로 예열해요.'},
        ],
      },
      {
        title: '반죽',
        steps: [
          {step: 1, description: '가루 재료를 체 쳐요.'},
          {step: 2, description: '흰자와 노른자를 분리해요.'},
          {step: 3, description: '크림치즈·버터를 믹싱기로 부드럽게 풀어요.'},
          {step: 4, description: '설탕 A를 넣고 노른자를 2~3회 나눠서 넣어요.'},
          {step: 5, description: '럼주와 레몬주스를 넣고 우유를 넣어요.', tip: '차가운 우유를 넣으면 크림치즈와 버터가 분리될 수 있으니 중탕한 물에 넣은 우유를 2~3회 나눠서 넣어요.'},
          {step: 6, description: '흰자에 설탕 B를 넣고 머랭을 손으로 올려요.', tip: '머랭을 많이 올리는 것이 아니라 물처럼 흐를 때까지 해요. 머랭 꼬리가 생기기 직전인 젖은 피크 상태까지 해요. 머랭을 너무 많이 올리면 시퐁케이크를 만들 때 사용하는 시퐁법이랍니다!'},
          {step: 7, description: '노른자 반죽에 머랭 반을 섞고 체 친 가루 넣고 섞은 후 남은 머랭 반을 넣고 섞어요.', tip: '반죽이 다 되면 반죽 온도, 반죽 비중을 체크해요.'},
        ],
      },
      {
        title: '팬닝',
        steps: [
          {step: 1, description: '준비해둔 팬에 반죽을 담아요.', tip: '믹싱볼이나 피쳐에 반죽을 담아서 따르거나 짤주머니에 담아서 짤 수도 있어요. 개수가 많으면 50~60% 정도만 채우고 남은 반죽으로 균일하게 더 채워요.'},
          {step: 2, description: '깊은 사각 팬에 미지근한 물을 3분의 2 정도를 넣고 중탕으로 200/140도로 25~30분 정도 구워요.', caution: '오븐에 팬을 넣고 뺄 때 물이 있으니 조심해야 해요!'},
          {step: 3, description: '마른행주로 물기를 닦으면서 살짝 통하고 타공팬에 유산지 깐 곳에 얹어놔요.', tip: '너무 세게 바닥에 탁 치면 주저앉으니 물기 제거하면서 살짝 충격을 줘서 빼요. 팬에 있는 중탕한 물이 엄청 뜨거워서 팬을 들고 물을 버리러 가다 다칠 수 있으니 물을 믹싱볼에 옮겨서 버려요.'},
        ],
      },
    ],
  },
  {
    id: '4',
    title: '파운드케이크',
    cookbook: '제과기능사',
    method: '크림법',
    specificGravity: '0.75~0.85',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb18,
    time: '2시간 30분',
    servings: '1개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '800g'},
          {name: '베이킹파우더', amount: '16g'},
          {name: '바닐라향', amount: '4g'},
          {name: '탈지분유', amount: '16g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕', amount: '640g'},
          {name: '소금', amount: '8g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '버터', amount: '640g'},
          {name: '달걀', amount: '640g'},
          {name: '유화제', amount: '16g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '계량컵'},
      {name: '온도계'},
      {name: '믹싱볼'},
      {name: '거품기'},
      {name: '스크래퍼'},
      {name: '고무주걱'},
      {name: '채반'},
      {name: '가스레인지'},
      {name: '물'},
      {name: '파운드케이크 틀'},
      {name: '가위'},
      {name: '유산지'},
      {name: '오븐'},
    ],
    stepGroups: [
      {
        title: '유산지 재단',
        steps: [
          {step: 1, description: '유산지 두 장을 반으로 접어서 잘라요. 유산지 위에 케이크 틀을 올린 후 연필로 밑면을 그려요.'},
          {step: 2, description: '본뜬 그림 4군데 위, 아랫부분을 접어요.', tip: '틀 안에 들어가도록 본 뜬 틀보다 작게 접어요. 너무 길게 올라오면 반죽을 넣을 때 불편할 수 있어서 저는 위아래를 조금씩 접어서 잘라줬어요.'},
          {step: 3, description: '분홍색 부분은 가위로 자르고 노란색 부분은 접어서 틀 안에 유산지를 겹쳐서 넣으면 완성♡', tip: '유산지 1장으로 2개를 만들 수 있어서 유산지 2장으로 4개를 한꺼번에 겹쳐서 만들면 시간을 단축할 수 있어요^^ 재료 계량과 유산지 재단을 한 후 오븐 예열을 해요!'},
        ],
      },
      {
        title: '반죽',
        steps: [
          {step: 1, description: '버터를 크림화해요.', tip: '크림법은 버터를 크림화하는 것으로 마요네즈처럼 부드럽게 만들어요! 버터를 믹싱볼에 넣고 휘퍼를 장착한 후 1단계(15초 정도)→ 2단계(2~3분 정도)→ 3단계로 버터가 마요네즈(포마드상태)될 때까지 휘핑해요. (초는 기계마다 달라서 각 기계에 따라 상태를 보시며 단계를 조정해 주세요.) (완전 녹이지 말고 전체 버터 양의 10% 미만 중탕하고 중탕할 때 사용한 물에 계란을 넣은 믹싱볼을 담가서 추운 날씨에 반죽 온도가 올라가도록 했어요.) ★스크래핑: 크림법은 중간에 스크래핑을 자주 해야 해요. 고무주걱으로 옆면에 묻은 버터를 긁어주는 것으로 잦은 스크래핑이 크림법의 단점이래요. 스크래핑할때는 항상 기계를 멈추고 고무주걱으로 옆면을 긁어준 후 휘퍼에 묻은 반죽을 문혀주세요. (자주 스크래핑을 해야하기때문에 고무주걱을 유산지 위에 올려놓고 사용하면 편해요!)'},
          {step: 2, description: '소금과 설탕을 섞어서 넣어요.', tip: '새로운 재료를 넣을 때마다 1단계로 시작! → 2단계(골고루 섞이게) → 3단계(버터가 아이보리색 될 때까지) 단계를 조정할 때마다 멈추면 스크래핑을 해서 믹싱볼 옆면에 붙은 버터를 정리해 주는 작업을 했어요!'},
          {step: 3, description: '달걀을 4회에 나눠서 넣어요.', tip: '1회 넣을 때 (노른자 4개)와 유화제를 넣어요. 버터는 유지(기름기 있는 것)이고 달걀이 물성이라 분리가 잘 일어나서 한 번에 넣지 않고 나눠서 넣어요! (달걀도 새로 넣을 때 1단계-2단계-3단계로 해요!) 1회, 2회는 흰자를 조금 덜 넣고 노른자 위주로 넣어요! 3회 4회는 흰 자랑 노른자를 골고루 넣어요.'},
          {step: 4, description: '가루 재료를 섞어서 체 치고 반죽과 섞어요.', tip: '파운드케이크는 비중이 높아서 팍팍 섞어도 돼요! 고무주걱으로 혼합하며 덩어리지지 않게 잘 섞어요.', caution: '제과는 팬닝 하기 전에 온도와 비중을 확인해야 해요!'},
          {step: 5, description: '반죽으로 양옆, 위아래의 팬과 유산지를 붙여요.', tip: '반죽을 넣기 전에 오븐에서 구울 때 유산지가 반죽에 닿으면 모양이 망가지기 때문이랍니다!'},
          {step: 6, description: '가운데가 조금 들어간 U자로 반죽을 넣어요.', tip: '팬 부피의 70% 정도 팬닝해요.'},
          {step: 7, description: '위 온도 185도/아래 온도 180도에서 15분 구워요.'},
          {step: 8, description: '칼에 식용유를 묻혀서 양 끝을 조금 남겨두고 윗면 가운데 길게 칼집을 넣어요.', tip: '제품이 차오르면서 윗면에 색과 껍질이 생기면 팬을 오븐에서 꺼내면 돼요!'},
          {step: 9, description: '칼집을 낸 후 다시 오븐에 넣고 위 온도 185도/아래 온도 185로 10분 후 위 온도 170도/아래 온도 160도로 10분 정도 더 구워요.', tip: '오븐에서 상태를 보시다가 이렇게 갈라진 틈으로 반죽이 부풀어 오르고 윗면 가운데를 손끝으로 눌렀을 때 탄력이 있거나 나무 꼬치로 찔렀을 때 반죽이 묻어나지 않으면 오븐에서 팬을 빼요!'},
        ],
      },
    ],
  },
  {
    id: '5',
    title: '마들렌',
    cookbook: '제과기능사',
    method: '1단계법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb4,
    time: '1시간 50분',
    servings: '12개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '400g'},
          {name: '베이킹파우더', amount: '8g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕', amount: '400g'},
          {name: '소금', amount: '2g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '달걀', amount: '400g'},
          {name: '버터', amount: '400g'},
        ],
      },
      {
        title: '부재료',
        ingredients: [
          {name: '레몬 껍질', amount: '4g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱볼'},
      {name: '거품기'},
      {name: '가스레인지'},
      {name: '고무주걱'},
      {name: '온도계'},
      {name: '조개 모양 마들렌 팬'},
      {name: '채반'},
      {name: '짤주머니'},
      {name: '둥근 깍지'},
      {name: '붓'},
      {name: '스크래퍼'},
      {name: '가위'},
      {name: '오븐'},
    ],
    steps: [
      {step: 1, description: '박력분과 베이킹파우더를 체 친 후 설탕과 소금을 넣고 섞어요.'},
      {step: 2, description: '중탕해서 따뜻하게 만든 달걀을 3회 나눠서 넣고 섞어요.'},
      {step: 3, description: '중탕해서 녹인 버터를 조금 식혔다가 넣고 섞어요.', tip: '중탕 후 바로 넣으면 온도가 높아서 달걀이 익을 수 있어요! 43도 이하로 조금 식힌 후에 넣어주세요. 대충 섞으면 버터가 윗면에 뜨기 때문에 잘 섞어야해요!'},
      {step: 4, description: '잘게 다진 레몬 껍질을 넣고 섞어요.'},
      {step: 5, description: '완성된 반죽을 비닐로 덮어서 30분~40분 정도 휴지시켜요.', tip: '밀가루 속에 들어있는 글루텐은 힘을 가할수록 불기때문에 느슨하게 해주기 위해서랍니다.'},
      {step: 6, description: '휴지시키는 동안 조개 모양 팬에 버터를 50g 정도 중탕해서 붓으로 버터 칠을 해요.', tip: '버터를 너무 많이 칠하면 마들렌이 튀겨져서 나오니까 붓이나 손가락으로 아주 얇게 코팅하듯 칠해요. 팬에 마들렌이 달라붙지 않고 잘 떨어지게 하기 위해서랍니다!'},
      {step: 7, description: '짤주머니에 둥근 깍지를 끼고 반죽을 담고 80% 정도만 차게 지그재그로 짜요.', tip: '오븐에 구우면 마들렌이 부풀어 오르기 때문에 꽉 채우지 않고 70~80프로만 채워요. 반죽을 다 넣은 후 팬을 바닥에 탁탁 4번 정도 쳐서 공기를 빼요.'},
      {step: 8, description: '180/160도로 20~30분 구워요.'},
    ],
  },
  {
    id: '6',
    title: '다쿠와즈',
    cookbook: '제과기능사',
    method: '머랭법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb2,
    time: '1시간 50분',
    servings: '10개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '아몬드 분말', amount: '198g'},
          {name: '분당', amount: '165(164)g'},
          {name: '박력분', amount: '54g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕', amount: '99(98)g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '흰자', amount: '330g (10개)'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱볼'},
      {name: '채망'},
      {name: '미니채망'},
      {name: '고무 주걱'},
      {name: '짤주머니'},
      {name: '원형깍지'},
      {name: '스크래퍼'},
      {name: '다쿠와즈 틀'},
      {name: '팬'},
      {name: '타공팬'},
      {name: '분무기'},
      {name: '유산지'},
      {name: '가위'},
      {name: '테프론 시트'},
      {name: '오븐'},
    ],
    steps: [
      {step: 1, description: '박력분, 분당, 아몬드 분말 가루 재료를 섞어서 2번 체 쳐요.', tip: '아몬드 분말이 섞인 재료는 2번 체쳐야해요. 아몬드 분말이 고르지 않기 때문이랍니다. 아몬드파우더는 기름기가 있어서 체에 주걱으로 굵은 가루를 풀어요! 시험장에서는 믹싱볼보다 유산지에 체 치는 것이 좋아요! 흰자 머랭이 금방 가라앉기때문에 머랭을 만들기 전에 체를 먼저 쳐야 해요!'},
      {step: 2, description: '흰자를 넣고 기계로 섞다가 설탕을 3회 나눠서 넣어서 단단한 머랭을 만들어요.', tip: '원래 다쿠와즈 머랭은 100%로 올려야 해요. 뾰족한 뿔처럼 머랭이 스는 정도가 100%인데 120% 정도로 만들어야 다쿠와즈가 2판 정도 나와요! 흰자를 1-2-3단 순서로 올리고 머랭이 100% 되면 3회 나눠서 설탕 투입해서 120% 머랭 만들었어요!'},
      {step: 3, description: '머랭에 가루를 3번 나눠서 넣고 살살 섞어요.', tip: '막 섞으면 머랭이 다 가라앉아요! 날가루만 안 보일 정도로만 섞어야 해요!'},
      {step: 4, description: '철판에 테프론 시트를 깔고 다쿠와즈 틀에 분무해요.', tip: '다쿠와즈 틀에 분무하기 해주는 이유는 물기가 있어서 다쿠와즈 틀을 떼어낼 때 잘 떨어지라고 뿌린답니다. 실기시험 볼 때 철판 2개에 다쿠와즈 틀 1개가 제공되니 다쿠와즈 틀을 대고 하나를 짜고 다쿠와즈 틀을 떼어서 옆에 철판에 또 짜야 해요! 유산지에 해도 괜찮은데 다쿠와즈를 굽고 떼어낼 때 분무기로 물을 뿌리고 떼어야 해서 더 오래 걸려요! 유산지에 하시려면 팬에 들어가게 가위로 양쪽 4군데를 잘라서 팬에 들어가게 넣어주면 된답니다! 테프론시트에 하면 잘 떨어져서 테프론시트에 했어요!'},
      {step: 5, description: '원형 깍지를 낀 짤주머니에 넣은 반죽을 S 모양으로 팬 높이보다 약간 높게 지그재그로 반죽을 짜요.', tip: '짤주머니에 반죽을 한 번에 다 넣어서 짜는 것보다 4번에 나눠 담아 짜는 것이 좋아요. 반죽을 너무 많이 넣으면 손의 온도로 녹아서 마지막에 반죽이 줄줄 새어 나오기 때문에 제품이 잘 안 나올 수 있기 때문이랍니다! 1번째는 첫 번째 철판에 반을 짜고 2번째는 첫 번째 철판에 남은 곳에 짜고 3번째는 두 번째 철판에 반을 짜고 4번째는 두 번째 철판에 남은 곳에 짜요!'},
      {step: 6, description: '다쿠와즈 틀에 모두 반죽을 짠 후 스크래퍼로 윗면이 평평하도록 정리해요.', tip: '스크래퍼로 많이 왔다 갔다 하면 안 좋아요. 위에서 아래로 쫙 밀고 다시 아래에서 위로 쫙 밀어서 평평하게 하는 것이 좋아요. 스크래퍼를 직각이 아니라 조금 기울이고 반죽을 밀어서 빈 공간을 채워줘요!'},
      {step: 7, description: '다쿠와즈 틀을 양쪽 위아래를 잡고 들어서 살살 빼내고 두 번째 철판도 같은 방법으로 해요.', tip: '이렇게 두 번째 철판에 한 번 더 해야 하니까 위 3,4,5번의 과정을 두 번째 철판에 같은 방법으로 해요!'},
      {step: 8, description: '별도의 슈가파우더를 미니채망에 담아 반죽 윗면에 2회 골고루 뿌려요.', tip: '첫 번째 철판과 두 번째 철판에 한번 쭉 뿌려주고 두 번째로 뿌릴 때도 첫 번째 철판부터 두 번째 철판까지 전체적으로 골고루 쭉 뿌려요.'},
      {step: 9, description: '윗 온도 195/아래 온도 145도로 15~20분 구워요.', tip: '15분에 색깔 확인하고 필요하면 위치를 바꾸고 온도 조절을 해요.'},
      {step: 10, description: '테프론시트를 타공 팬으로 옮겨서 살짝 식힌 후 다쿠와즈를 떼어요.', tip: '구운 후 철판에서 바로 떼면 부러질 수 있으니 살짝 식힌 후 떼어내세요!'},
      {step: 11, description: '샌드용 크림을 발라 비슷한 크기의 다쿠와즈를 2개씩 붙여요.'},
    ],
  },
  {
    id: '7',
    title: '슈',
    cookbook: '제과기능사',
    method: '익반죽법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb11,
    time: '2시간',
    servings: '15개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '중력분', amount: '200g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '소금', amount: '2g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '물', amount: '250g'},
          {name: '버터', amount: '200g'},
          {name: '달걀', amount: '400g (7개)'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱볼'},
      {name: '채망'},
      {name: '가스레인지'},
      {name: '거품기'},
      {name: '고무 주걱'},
      {name: '나무 주걱'},
      {name: '짤주머니'},
      {name: '원형 깍지'},
      {name: '작은 원형 깍지'},
      {name: '스크래퍼'},
      {name: '팬'},
      {name: '타공팬'},
      {name: '분무기'},
      {name: '유산지'},
      {name: '가위'},
      {name: '오븐'},
    ],
    steps: [
      {step: 1, description: '중력분을 먼저 체 쳐요.', tip: '중력분을 체 쳐서 유산지 위에 올려놔요.'},
      {step: 2, description: '물·버터·소금을 넣고 중약불로 버터가 녹을 때까지 팔팔 끓여요.'},
      {step: 3, description: '중력분을 넣어서 섞어요.', tip: '처음에는 거품기로 먼저 섞다 보면 점점 덩어리가 생겨요. 덩어리가 생기면 거품기로 섞기 힘드니 나무주걱으로 섞어요.'},
      {step: 4, description: '눌러 붙지 않게 중불로 하고 11자로 계속 섞으며 호화시켜요.', tip: '언제까지 호화시켜요? 1) 자글자글 소리가 날 때까지 2) 밑면에 얇은 막이 생길 때까지. 저는 자글자글 소리도 나고 밑면에 얇은 막이 생길 때까지 호화시킨 후 다음 순서는 달걀을 넣으며 섞어야 하는데 뜨거우니까 다른 믹싱볼에 옮겼어요.'},
      {step: 5, description: '반죽의 상태를 보며 달걀을 넣고 섞어요.', tip: '먼저 달걀 2개를 깨서 거품기로 잘 섞어요. 또 달걀 2개를 넣고 섞어요. 총 4개 들어간 후부터는 반죽의 상태를 봐야 해요! 고무주걱으로 떠서 내리쳤을 때 V자로 매달리면 돼요. 달걀 4개 넣은 후부터는 섞어보면서 확인해요. 호화 상태에 따라 달걀 넣는 양이 달라져요. 반죽이 너무 되면 더 넣고, 너무 질면 조금 넣어야 해요. 실기시험 때 달걀 7개 지급되는 거 다 넣지 않고 반죽의 상태보시면서 넣어야 해요! 재료 계량 시 달걀 7개를 모두 깨지 마시고 달걀을 넣으시면서 반죽 상태를 보시면서 하시는 것을 추천해요^^'},
      {step: 6, description: '원형 깍지 낀 짤주머니에 반죽을 담고 3cm 크기의 원형으로 부피감 있게 짜요.', tip: '바닥에서 1cm 정도 뗀 상태에서 3cm 크기 원형으로 쭈욱 짜요. 팬닝을 할 때 간격을 슈 하나 크기 이상으로 해야 해요! 슈가 오븐에서 구워질 때 많이 팽창되기 때문에 간격이 가까우면 슈끼리 서로 붙을 수 있답니다! 첫 줄 밑에 두 번째 줄에 반죽을 짤 때 일자가 아니라 지그재그로 간격을 두고 짜요. 이렇게 반죽의 위, 아래, 양옆의 간격을 둬요!'},
      {step: 7, description: '팬닝을 다 한 후 오븐에 넣기 전에 반죽 표면이 완전히 젖도록 충분히 분무를 해요.', tip: '슈는 속이 빈 양배추 모양의 껍질을 만들어야 해서 슈 껍질 형성을 지연시켜서 물을 분무시켜서 팽창과 터짐을 좋게 하기 위해서랍니다!'},
      {step: 8, description: '200/150 15분~20분 굽고 170/100으로 15분 정도 구워요.', tip: '굽는 중간에 오븐 문을 열면 제품이 부풀지 못하고 가라앉아요! 다른 제과와 다르게 15분이 지나더라도 제품의 골격이 형성되기 전에 절대로 오븐 문을 열어서는 안돼요. 오븐 초기에는 밑 불을 강하게 하고 윗 불을 약하게 해서 공기 집의 팽창이 좋아지게 해요. 색이 나오면 밑 불을 약하게 하고 윗 불로 구워요. 밑 불이 너무 강하면 슈 모양이 쏙 들어가서 낮아져요!'},
      {step: 9, description: '오븐에서 꺼낸 후 타공팬으로 옮겨서 살짝 식혀요.'},
      {step: 10, description: '작은 원형 깍지를 넣은 짤주머니에 커스터드 크림을 넣어요.'},
      {step: 11, description: '슈 껍질 밑바닥에 작은 구멍을 내서 커스터드 크림을 충전해요.', tip: '슈 껍질 밑바닥에 작은 원형 깍지가 들어갈 크기만큼의 작은 구멍을 내서 그 구멍 안으로 짤주머니를 짜서 커스터드 크림을 충전해요. 실기시험 때는 크림이 나오지 않도록 밑에 유산지를 작게 잘라 붙여서 제출해요.'},
    ],
  },
  {
    id: '8',
    title: '쇼트브레드쿠키',
    cookbook: '제과기능사',
    method: '크림법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb10,
    time: '2시간',
    servings: '20개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '600g'},
          {name: '바닐라향', amount: '3(2)g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕', amount: '210g'},
          {name: '소금', amount: '6g'},
          {name: '물엿', amount: '30g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '마가린', amount: '198g'},
          {name: '쇼트닝', amount: '198g'},
          {name: '달걀', amount: '60g'},
          {name: '노른자', amount: '60g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '계량컵'},
      {name: '온도계'},
      {name: '믹싱볼'},
      {name: '거품기'},
      {name: '스크래퍼'},
      {name: '고무주걱'},
      {name: '나무주걱'},
      {name: '채반'},
      {name: '정형기'},
      {name: '포크'},
      {name: '붓'},
      {name: '밀대'},
      {name: '큰 비닐'},
      {name: '가위'},
      {name: '유산지'},
      {name: '오븐'},
    ],
    steps: [
      {step: 1, description: '가루 재료를 체 쳐요.', tip: '체 쳐야 할 가루 재료는 박력분·바닐라 향이랍니다!'},
      {step: 2, description: '크림법으로 버터를 마요네즈처럼 부드럽게 해요.', tip: '버터가 너무 딱딱하면 중탕물에 10% 정도 녹인 후 섞으면 잘 섞여요.'},
      {step: 3, description: '설탕, 물엿과 소금을 넣고 섞어요.'},
      {step: 4, description: '노른자를 먼저 넣고 섞고 흰자와 노른자 섞인 달걀 풀어서 2~3회 나눠서 넣고 섞어요.'},
      {step: 5, description: '체 친 가루 재료를 넣고 섞어요.'},
      {step: 6, description: '비닐을 깔고 반죽을 살짝 치대고 4군데를 접어서 사각형 모양으로 만들고 밀대로 밀어요.'},
      {step: 7, description: '반죽을 비닐로 감싸서 20~30분 정도 냉장 휴지시켜요.'},
      {step: 8, description: '냉장 휴지를 할 때 별도의 노른자 2개를 준비해서 풀어주고 체에 내리고 비닐을 덮어놔요.', tip: '체에 내리는 이유? 체에 내리지 않으면 구웠을 때 노른자가 뭉쳐있을 수 있어요. 노른자 비닐로 덮는 이유? 노른자 비닐로 덮어놓지 않으면 굳을 수 있어요!'},
      {step: 9, description: '네모 모양 반죽을 3절 접기 해서 일정 부분을 자른 후 꼭꼭 눌러서 밀어 펴요.', tip: '0.7cm 정도 두께로 밀어 펴요. 밀 때 덧가루를 뿌리지 않으면 반죽이 작업대랑 밀대에 달라붙으니 반죽을 밀기 전과 반죽을 밀면서 충분히 덧가루를 뿌리고 작업해요!'},
      {step: 10, description: '정형기를 사용해서 반죽을 찍어내요.', tip: '정형기를 찍기 전에도 반죽의 아랫부분과 정형기 아랫부분에도 덧가루를 묻히고 찍어야 반죽이 잘 달라붙지 않아요! 한 팬에 4개씩 6줄로 팬닝해요. 24개씩 2판 총 48개에 팬닝해요.'},
      {step: 11, description: '붓으로 노른자 물칠을 해요.', tip: '전체적으로 1번 다 칠하고 나서 한 번 더 칠해서 2번 칠해요. 노른자가 너무 안 말라도 너무 굳어도 모양이 잘 안 생겨요!'},
      {step: 12, description: '노른자 물칠을 포크로 긁어서 무늬를 만들어요.', tip: '반죽까지 긁지 않고 노른자 물칠한 것만 살짝 긁도록 해요! 포크 밑 부분으로 위로 옆으로 움직이며 직선이나 물결 원하는 모양을 내요.'},
      {step: 13, description: '190/140도로 10~15분 구워요.'},
    ],
  },
  {
    id: '9',
    title: '흑미롤케이크',
    cookbook: '제과기능사',
    method: '공립법',
    specificGravity: '0.4~0.5',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb20,
    time: '1시간 50분',
    servings: '1개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력 쌀가루', amount: '250g'},
          {name: '흑미 쌀가루', amount: '50g'},
          {name: '베이킹파우더', amount: '3g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕', amount: '300g'},
          {name: '소금', amount: '3g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '계란', amount: '8개'},
          {name: '우유', amount: '180g'},
        ],
      },
    ],
    steps: [
      {step: 1, description: '계란을 흰자와 노른자의 구분 없이 휘핑기에 넣고 고속으로 돌려줍니다. 거품이 나면 설탕과 소금을 넣고 저속에서 휘핑을 해줍니다.', tip: '저속에서 돌리는 이유는 계란의 거품을 최대한 빼주기 위해서랍니다.'},
      {step: 2, description: '1의 반죽에 우유를 넣고 주걱을 이용해 5번 정도만 가볍게 섞어줍니다.'},
      {step: 3, description: '체 친 가루(박력 쌀가루, 흑미 쌀가루, 베이킹파우더)를 2에 넣고 빠르게 저어줍니다.'},
      {step: 4, description: '3의 반죽을 팬닝 합니다.', tip: '팬닝 할 때 주의할 점은 반죽이 팬에 고르게 퍼지도록 해야 한다는 거예요.'},
      {step: 5, description: '윗불 180도, 아랫 불 160도에서 20분 동안 구워줍니다.'},
      {step: 6, description: '롤케이크 시트가 식으면 생크림을 바르고 돌돌 말아줍니다.', tip: '먹고 남은 롤케이크는 잘 싸서 냉동실에 보관했다가 해동해서 먹으면 좋아요. 해동할 때는 전자레인지 등을 이용하지 않고 실온에서 자연해동시켜주세요.'},
    ],
  },
  {
    id: '10',
    title: '시폰케이크',
    cookbook: '제과기능사',
    method: '시폰법',
    specificGravity: '0.4~0.45',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb12,
    time: '1시간 40분',
    servings: '1호 1개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '400g'},
          {name: '베이킹파우더', amount: '10g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕(A)', amount: '260g'},
          {name: '설탕(B)', amount: '260g'},
          {name: '소금', amount: '6g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '달걀', amount: '600g'},
          {name: '식용유', amount: '160g'},
          {name: '물', amount: '120g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱볼'},
      {name: '거품기'},
      {name: '채망'},
      {name: '시폰케이크 틀 4개'},
      {name: '행주 4개'},
      {name: '분무기'},
      {name: '고무 주걱'},
      {name: '나무 주걱'},
      {name: '젓가락'},
      {name: '오븐'},
    ],
    steps: [
      {step: 1, description: '가루 재료를 체 쳐요.', tip: '체 쳐야 할 가루 재료는 박력분·베이킹파우더입니다.'},
      {step: 2, description: '노른자를 거품 안 나게 섞어요.', tip: '노른자를 깨주고 들었다 놨다 하며 잘 섞어요!'},
      {step: 3, description: '설탕(A)와 소금을 넣고 섞어요.', tip: '따뜻한 물을 넣은 믹싱볼에 중탕을 하면 설탕이 더 잘 녹아요!'},
      {step: 4, description: '노른자 반죽에 물을 넣고 섞은 후 식용유를 넣고 섞어요.'},
      {step: 5, description: '체 친 가루를 넣고 섞어요.'},
      {step: 6, description: '흰자에 설탕을 넣고 90~95% 머랭을 올려요.', tip: '치즈케이크는 젖은 피크까지 머랭을 올렸던 것과 차이랍니다.'},
      {step: 7, description: '머랭 반을 노른자 반죽에 넣고 섞은 후 남은 머랭 반을 넣고 섞어요.', tip: '반죽이 완성되면 반죽 온도와 비중을 체크해요. 온도는 23, 비중 0.45이랍니다.'},
      {step: 8, description: '작은 믹싱볼에 반죽을 담아서 팬 부피의 60~70% 정도 담아요.', tip: '앞에 쭈욱 붓고 뒤로 돌려서 쭈욱 부어요.'},
      {step: 9, description: '젓가락으로 지그재그나 원형 물결 모양으로 왔다 갔다 하며 기포를 정리해요.'},
      {step: 10, description: '180/150도로 20~30분 구워요.', tip: '오븐에 넣고 꺼내기 전에 미리 행주 4개를 찬물에 적셔놓고 찬물을 믹싱 볼에 담아놔요!'},
      {step: 11, description: '오븐에서 나온 후 팬을 탕 하고 치고 뒤집어놓고 젖은 행주를 덮어서 식혀요.', tip: '행주가 따뜻해지면 믹싱볼에 담아놓은 찬물에 한 번 넣어서 차가워진 행주를 다시 시폰케이크 팬에 올려서 식혀요.'},
      {step: 12, description: '식힌 후 팬을 뒤집은 후 돌려가면서 꼭꼭 눌러서 밑에 팬을 쏙 빼요.', tip: '충분히 식지 않은 상태에서 분리하면 케이크가 주저앉을 수 있답니다!'},
    ],
  },
  {
    id: '11',
    title: '타르트',
    cookbook: '제과기능사',
    method: '크림법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb17,
    time: '2시간 20분',
    servings: '1개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '재료',
        ingredients: [
          {name: '박력분', amount: '400g'},
          {name: '달걀', amount: '100g'},
          {name: '설탕', amount: '104g'},
          {name: '버터', amount: '160g'},
          {name: '소금', amount: '2g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '온도계'},
      {name: '믹싱볼'},
      {name: '큰 비닐'},
      {name: '채망'},
      {name: '거품기'},
      {name: '포크'},
      {name: '타르트 틀'},
      {name: '짤주머니'},
      {name: '둥근 깍지'},
      {name: '스크래퍼(둥근/각진)'},
      {name: '고무주걱'},
      {name: '밀대'},
      {name: '가스버너'},
      {name: '붓'},
      {name: '오븐'},
    ],
    stepGroups: [
      {
        title: '반죽만들기',
        steps: [
          {step: 1, description: '가루 재료를 체 쳐요.'},
          {step: 2, description: '크림법으로 버터를 마요네즈처럼 부드럽게 해요.'},
          {step: 3, description: '설탕과 소금을 넣고 섞어요.'},
          {step: 4, description: '달걀을 넣고 섞어요.'},
          {step: 5, description: '가루를 넣고 날가루가 살짝 보일 정도로 섞어요.'},
          {step: 6, description: '비닐을 깔고 반죽을 살짝 치대요.'},
          {step: 7, description: '동그란 반죽이 있는 비닐을 아래와 위에 놓고 4군데를 접어서 사각형 모양으로 만들고 밀대로 밀어요.'},
          {step: 8, description: '냉장 휴지를 20~30분 해요.'},
        ],
      },
      {
        title: '충전물',
        steps: [
          {step: 1, description: '아몬드분말을 2번 체 쳐요.'},
          {step: 2, description: '크림법으로 버터를 마요네즈처럼 부드럽게 해요.'},
          {step: 3, description: '버터에 설탕, 달걀 넣고 아몬드 분말 넣고 섞은 후 브랜디를 넣고 섞어요.'},
          {step: 4, description: '짤주머니에 원형 깍지를 끼우고 반죽을 담아놔요.'},
        ],
      },
      {
        title: '성형 및 굽기',
        steps: [
          {step: 1, description: '반죽을 꺼내서 등분하고 비닐 위에서 밀대로 팬 크기보다 크게 밀어요.', tip: '비닐 안 깔면 작업대에 다 묻고 덧가루가 없으면 잘 안 밀리니까 덧가루를 뿌려요. 8개를 만들어야 하면 7등분 한 후 남은 자투리 반죽으로 1개 만들어요.'},
          {step: 2, description: '틀 안에 넣어준 후 밀대로 쭉 밀어서 자투리 반죽을 떼어내요.'},
          {step: 3, description: '포크로 구멍을 내고 충전물을 짠 후 아몬드 슬라이스를 토핑해요.', tip: '호두파이는 구멍 살살 내야하는데 타르트는 구멍을 확실하게 내요. 충전물이 크림법으로 만들어서 호두파이보다 안 흘려요. 구멍을 뚫는 이유는 구멍을 뚫어야 밑면이 안 부풀어올라요. 테두리를 동그랗게 안으로 말아들어가게 짜고 남으면 위에 링 모양으로 한 개씩 더 짜요. 아몬드 슬라이스를 흰색이 위에 보이도록 하고 겹치지 않게 토핑을 올리는 것이 좋답니다.'},
          {step: 4, description: '200/190도로 25~35분 정도 구워요.'},
          {step: 5, description: '오븐에 굽는 동안 혼당과 물 넣고 끓여요.', tip: '미리 끓이면 광택제가 굳어서 오븐에서 타르트가 나온 후 광택제 바르려 하면 잘 안 발려요. 재료 준비만 해놓고 오븐에서 나오기 좀 전에 가스 불을 켜서 만들어요.'},
          {step: 6, description: '구워진 타르트를 틀에서 뺀 후 붓으로 혼당을 발라요.'},
        ],
      },
    ],
  },
  {
    id: '12',
    title: '소프트롤케이크',
    cookbook: '제과기능사',
    method: '별립법',
    specificGravity: '0.4~0.5',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb9,
    time: '1시간 50분',
    servings: '1개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '250g'},
          {name: '베이킹파우더', amount: '2.5g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕(A)', amount: '175g'},
          {name: '물엿', amount: '25g'},
          {name: '소금', amount: '2.5g'},
          {name: '설탕(B)', amount: '150g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '달걀', amount: '700g'},
          {name: '물', amount: '50g'},
          {name: '식용유', amount: '125g'},
        ],
      },
      {
        title: '부재료',
        ingredients: [
          {name: '잼', amount: '200g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱 볼'},
      {name: '거품기'},
      {name: '젖은 면보'},
      {name: '고무주걱'},
      {name: '실리콘 주걱'},
      {name: '스크래퍼'},
      {name: '긴 밀대'},
      {name: '온도계'},
      {name: '뾰족한 꼬치'},
      {name: '유산지'},
      {name: '채반'},
      {name: '스패출라'},
      {name: '짤주머니'},
      {name: '가위'},
      {name: '오븐'},
    ],
    stepGroups: [
      {
        title: '준비',
        steps: [
          {step: 1, description: '가루 재료를 체 쳐요.'},
          {step: 2, description: '흰자와 노른자를 분리해요.', tip: '노른자를 손으로 하고 흰자 머랭을 기계로 쳐요.'},
        ],
      },
      {
        title: '노른자',
        steps: [
          {step: 3, description: '노른자 잘 풀어주고 설탕 A+물엿+소금+물을 넣고 아이보리색이 될 때까지 손으로 저으며 거품이 잘 안 나게 섞어요.', tip: '설탕이 완전히 안 녹으면 제품이 나왔을 때 설탕이 반짝반짝 빛나요. 중탕해서 설탕을 잘 녹여요. 물엿은 설탕 A 가운데 퍼서 넣어서 손실이 없도록 해요.'},
        ],
      },
      {
        title: '흰자',
        steps: [
          {step: 4, description: '흰자에 설탕 B 넣고 섞어서 머랭을 90~95% 올려요.'},
        ],
      },
      {
        title: '반죽 합치기',
        steps: [
          {step: 5, description: '노른자 반죽에 머랭 반을 넣고 섞은 후 체 친 가루를 넣고 섞어요.'},
          {step: 6, description: '식용유에 희생 반죽을 만들어서 확실히 섞은 후 나머지 반죽에 넣고 남은 머랭 넣고 섞어요.', tip: '반죽 온도와 비중을 체크해요.'},
          {step: 7, description: '반죽의 일부를 덜어내서 카라멜 색소를 넣고 섞은 후 짤주머니에 담고 끝을 살짝 잘라요.', tip: '비중 컵에 담았던 반죽에 카라멜 색소를 넣어서 섞고 짤주머니에 담아요.'},
        ],
      },
      {
        title: '팬닝 및 굽기',
        steps: [
          {step: 8, description: '반죽을 팬에 넣고 스크래퍼로 반죽을 골고루 펴요.', tip: '골고루 안 피면 한쪽은 두껍고 한쪽은 얇고 일정하지 않아요. 유산지에 반죽을 묻혀 팬에 고정해서 오븐에서 구울 때 유산지가 내려오지 않게 해요. 기포가 없어지도록 팬을 탕 한 번 쳐요.'},
          {step: 9, description: '카라멜 색소를 넣은 반죽을 넣고 그림을 그려요.'},
          {step: 10, description: '뾰족한 것을 이용해서 반대로 그려요.', tip: '뾰족한 것을 바닥에 댄 후 살짝 들어서 쭉 그어요.'},
          {step: 11, description: '180/160도로 15~25분 구워요.', tip: '저는 15분 굽고 색깔이 골고루 나오게 위치를 바꿔준 후 20도 내리고 5분 더 구웠어요! 장갑을 끼고 통통통 쳐서 확인해요.'},
        ],
      },
      {
        title: '성형',
        steps: [
          {step: 12, description: '젖은 면보를 깔고 반죽을 엎고 붙어있는 유산지 옆면을 떼어낸 후 조금 식히고 다 떼어요.'},
          {step: 13, description: '반대쪽 1cm 정도를 남기고 전체적으로 스패출라를 이용해서 딸기잼을 발라요.', tip: '딸기잼을 바르기 전에 주걱으로 풀어주고 바르는 것이 잘 발려요.'},
          {step: 14, description: '1cm 정도 간격으로 스패출라로 칼집을 2개 그어요.', tip: '칼집을 안내면 안에 부분이 잘 안 말려요.'},
          {step: 15, description: '칼집 낸 부분을 꼭 눌러주고 긴 밀대로 천을 돌돌 말아요.', tip: '밀대가 빵보다 앞으로 먼저 가면서 돌돌 말아야 잘 말려요. 말고 1분 정도는 그대로 고정했다가 천을 빼고 냉각해요.'},
        ],
      },
    ],
  },
  {
    id: '13',
    title: '버터쿠키',
    cookbook: '제과기능사',
    method: '크림법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb7,
    time: '2시간',
    servings: '30개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '재료',
        ingredients: [
          {name: '박력분', amount: '200g'},
          {name: '버터', amount: '120g'},
          {name: '슈가파우더', amount: '80g'},
          {name: '달걀', amount: '50g'},
          {name: '소금', amount: '2g'},
          {name: '바닐라에센스', amount: '1g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '믹싱볼'},
      {name: '핸드믹서'},
      {name: '고무주걱'},
      {name: '채망'},
      {name: '짤주머니'},
      {name: '별 깍지'},
      {name: '오븐'},
    ],
    steps: [
      {step: 1, description: '버터를 실온에 두고 부드럽게 풀어요.'},
      {step: 2, description: '슈가파우더와 소금을 넣고 크림 상태로 만들어요.'},
      {step: 3, description: '달걀을 2회 나눠 넣으며 섞어요.'},
      {step: 4, description: '체 친 박력분을 넣고 자르듯 섞어요.'},
      {step: 5, description: '짤주머니에 별 깍지를 끼우고 반죽을 넣어요.'},
      {step: 6, description: '팬 위에 원하는 모양으로 짜요.'},
      {step: 7, description: '170도에서 12~15분 구워요.', tip: '가장자리가 살짝 갈색이 나면 완성!'},
    ],
  },
  {
    id: '14',
    title: '초코머핀',
    cookbook: '제과기능사',
    method: '크림법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb15,
    time: '1시간 50분',
    servings: '24개',
    session: '1/3 회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '500g'},
          {name: '베이킹소다', amount: '2g'},
          {name: '베이킹파우더', amount: '8g'},
          {name: '코코아파우더', amount: '60g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕', amount: '30g'},
          {name: '소금', amount: '5(4)g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '버터', amount: '300g'},
          {name: '달걀', amount: '300g'},
          {name: '물', amount: '175(174)g'},
          {name: '탈지분유', amount: '30g'},
        ],
      },
      {
        title: '부재료',
        ingredients: [
          {name: '초코칩', amount: '180g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱볼'},
      {name: '가스레인지'},
      {name: '거품기'},
      {name: '채망'},
      {name: '짤주머니'},
      {name: '고무주걱'},
      {name: '나무주걱'},
      {name: '나무꼬치'},
      {name: '머핀 팬'},
      {name: '머핀 유산지'},
      {name: '오븐'},
    ],
    stepGroups: [
      {
        title: '팬 세팅',
        steps: [
          {step: 1, description: '재료 계량 후 머핀 틀 팬에 머핀 유산지를 끼워 넣어요.'},
          {step: 2, description: '그리고 오븐 예열을 하고 반죽을 시작해요!'},
        ],
      },
      {
        title: '반죽',
        steps: [
          {step: 1, description: '가루 재료를 섞어서 체 쳐요.', tip: '박력분·베이킹소다·베이킹파우더·코코아파우더·탈지분유'},
          {step: 2, description: '버터를 중탕으로 10% 정도 녹여요.', tip: '버터를 중탕한 물에 재료인 물을 따뜻해지게 담아놔요.'},
          {step: 3, description: '버터를 믹싱볼에 넣고 부드럽게 풀어주고 설탕과 소금을 넣고 섞어요.', tip: '설탕이 60% 정도 용해되고 아이보리색 될 때까지, 스크래핑해주며 충분히 믹싱해요!'},
          {step: 4, description: '달걀 3회 나눠서 넣어요.', tip: '1,2회는 노른자 위주, 3회에 흰자를 넣어요. 저속~중속~고속으로 섞어서 부드러워질 때까지!'},
          {step: 5, description: '체 친 가루를 넣고 11자로 섞어요.', tip: '밑면, 옆면을 긁고 주걱으로 11자를 그리며 날가루 안 보일 때까지 섞어요.'},
          {step: 6, description: '중탕했던 물을 넣고 섞어요.', tip: '물이 없어질 때까지 섞어요. 섞을 때는 나무주걱, 옆면을 긁을 때는 고무주걱이 편해요!'},
          {step: 7, description: '3분의 1정도 남기고 초코칩을 넣어서 섞어요.', tip: '다 넣어도 괜찮지만 3분의 1정도는 반죽 위에 토핑처럼 올려줘도 좋아요!'},
          {step: 8, description: '짤주머니에 반죽을 넣고 깍지 안 끼고 짜요.', tip: '천 짤주머니 추천! 1cm 띄고 직각으로 가운데서 쭉 눌러서 50~60%로 24개 채운 후 나머지 반죽을 모자란 부분에 더 채워요.'},
          {step: 9, description: '남겨둔 초코칩을 위에 토핑으로 올려요.', tip: '반죽이 골고루 되도록 오븐에 넣기 전 팬을 한번 탕하고 쳐요.'},
          {step: 10, description: '180/160도에서 15분 굽고 부풀어 오르면 170/150도로 15분 정도 더 구워요.'},
          {step: 11, description: '다 구워진 후 팬에서 빼서 평철판 위에서 냉각시켜요.', tip: '나무꼬치로 꽂아서 반죽이 안 묻어 나오면 다 익은 것!'},
        ],
      },
    ],
  },
  {
    id: '15',
    title: '초코롤케이크',
    cookbook: '제과기능사',
    method: '공립법',
    specificGravity: '0.4~0.5',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb14,
    time: '1시간 50분',
    servings: '1개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '시트',
        ingredients: [
          {name: '박력분', amount: '50g'},
          {name: '코코아파우더', amount: '15g'},
          {name: '달걀', amount: '90g'},
          {name: '설탕', amount: '60g'},
          {name: '버터', amount: '10g'},
        ],
      },
      {
        title: '초코 크림',
        ingredients: [
          {name: '생크림', amount: '200g'},
          {name: '다크초콜릿', amount: '50g'},
          {name: '설탕', amount: '15g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '믹싱볼 2개'},
      {name: '핸드믹서'},
      {name: '고무주걱'},
      {name: '채망'},
      {name: '사각 팬'},
      {name: '유산지'},
      {name: '오븐'},
    ],
    steps: [
      {step: 1, description: '달걀을 노른자와 흰자로 분리해요.'},
      {step: 2, description: '흰자에 설탕을 3회 나눠 넣으며 머랭을 올려요.'},
      {step: 3, description: '노른자를 넣고 가볍게 섞어요.'},
      {step: 4, description: '체 친 박력분과 코코아파우더를 넣고 자르듯 섞어요.'},
      {step: 5, description: '녹인 버터를 넣고 빠르게 섞어요.'},
      {step: 6, description: '사각 팬에 붓고 180도에서 12~14분 구워요.'},
      {step: 7, description: '시트를 식히는 동안 초콜릿 생크림을 만들어요.', tip: '초콜릿 중탕 · 생크림 휘핑 후 합치기'},
      {step: 8, description: '시트 위에 크림을 바르고 돌돌 말아요.'},
      {step: 9, description: '랩으로 싸서 냉장고에서 1시간 이상 굳혀요.'},
    ],
  },
  {
    id: '16',
    title: '젤리롤케이크',
    cookbook: '제과기능사',
    method: '공립법',
    specificGravity: '0.4~0.5',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb13,
    time: '1시간 30분',
    servings: '1개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '400g'},
          {name: '베이킹파우더', amount: '2g'},
          {name: '바닐라향', amount: '4g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕', amount: '520g'},
          {name: '소금', amount: '8g'},
          {name: '물엿', amount: '32g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '달걀', amount: '680g'},
          {name: '우유', amount: '80g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱볼'},
      {name: '거품기'},
      {name: '젖은 면보'},
      {name: '고무주걱'},
      {name: '실리콘 주걱'},
      {name: '스크래퍼'},
      {name: '긴 밀대'},
      {name: '분무기'},
      {name: '온도계'},
      {name: '뾰족한 꼬치'},
      {name: '유산지'},
      {name: '채반'},
      {name: '스패출라'},
      {name: '짤주머니'},
      {name: '가위'},
      {name: '오븐'},
    ],
    stepGroups: [
      {
        title: '반죽',
        steps: [
          {step: 1, description: '가루 재료를 체 쳐요.'},
          {step: 2, description: '달걀을 잘 풀어주고 설탕+소금을 넣고 저으며 거품이 잘 안 나게 섞어요.', tip: '설탕이 완전히 안 녹으면 제품이 나왔을 때 설탕이 반짝반짝 빛나요.'},
          {step: 3, description: '중탕으로 설탕을 잘 녹여요.', tip: '중탕한 물은 버리지 않고 우유를 넣어놔서 반죽 온도를 높여요. 온도는 43도 정도가 좋아요. 너무 뜨거우면 달걀이 익어요!'},
          {step: 4, description: '기계에서 아이보리색이 될 때까지 거품 올려요.', tip: '젓가락으로 떴을 때 반죽이 떨어지지 않고 매달려있을 때까지 해요.'},
          {step: 5, description: '체 친 가루를 넣고 섞고 우유를 넣고 섞은 후 온도 체크와 비중 체크를 해요.'},
          {step: 6, description: '반죽의 일부를 덜어내서 카라멜 색소를 넣고 섞은 후 짤주머니에 담고 끝을 살짝 잘라요.'},
        ],
      },
      {
        title: '팬닝 및 굽기',
        steps: [
          {step: 7, description: '반죽을 팬에 넣고 스크래퍼로 반죽을 골고루 펴요.', tip: '골고루 안 피면 한쪽은 두껍고 한쪽은 얇고 일정하지 않아요. 유산지에 반죽을 묻혀 팬에 고정해서 오븐에서 구울 때 유산지가 내려오지 않게 해요.'},
          {step: 8, description: '카라멜 색소를 넣은 반죽을 넣고 그림을 그려요.'},
          {step: 9, description: '뾰족한 것을 이용해서 반대로 그려요.', tip: '뾰족한 것을 바닥에 댄 후 살짝 들어서 쭉 그어요.'},
          {step: 10, description: '180/160도로 15~25분 구워요.', tip: '저는 15분 굽고 색깔이 골고루 나오게 위치를 바꿔준 후 20도 내리고 5분 더 구웠어요! 장갑을 끼고 통통통 쳐서 확인해요.'},
        ],
      },
      {
        title: '성형',
        steps: [
          {step: 11, description: '젖은 면보를 깔고 반죽을 엎고 붙어있는 유산지에 분무를 확실히 하고 떼어요.', tip: '분무를 확실히 하지 않으면 빵이 뜯겨나갈 수 있어요.'},
          {step: 12, description: '반대쪽 1cm 정도를 남기고 전체적으로 스패출라를 이용해서 딸기잼을 발라요.', tip: '딸기잼을 바르기 전에 주걱으로 풀어주고 바르는 것이 잘 발려요.'},
          {step: 13, description: '1cm 정도 간격으로 스패출라로 칼집을 2개 그어요.', tip: '칼집을 안내면 안에 부분이 잘 안 말려요.'},
          {step: 14, description: '칼집 낸 부분을 꼭 눌러주고 긴 밀대로 천을 돌돌 말아요.', tip: '밀대가 빵보다 앞으로 먼저 가면서 돌돌 말아야 잘 말려요. 말고 1분 정도는 그대로 고정했다가 천을 빼고 냉각해요.'},
        ],
      },
    ],
  },
  {
    id: '17',
    title: '브라우니',
    cookbook: '제과기능사',
    method: '1단계법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb8,
    time: '1시간 50분',
    servings: '9조각',
    session: '1회차',
    ingredientGroups: [
      {
        title: '재료',
        ingredients: [
          {name: '중력분', amount: '300g'},
          {name: '달걀', amount: '360g'},
          {name: '설탕', amount: '390g'},
          {name: '소금', amount: '6g'},
          {name: '버터', amount: '150g'},
          {name: '다크초콜릿', amount: '450g'},
          {name: '코코아파우더', amount: '30g'},
          {name: '바닐라향', amount: '6g'},
          {name: '호두', amount: '150g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱볼'},
      {name: '거품기'},
      {name: '채망'},
      {name: '가스레인지'},
      {name: '물'},
      {name: '원형 3호 팬'},
      {name: '고무주걱'},
      {name: '나무주걱'},
      {name: '유산지'},
      {name: '가위'},
      {name: '오븐'},
    ],
    stepGroups: [
      {
        title: '유산지 재단',
        steps: [
          {step: 1, description: '유산지를 틀과 거의 비슷하게 재단해요.', tip: '버터 스펀지케이크는 많이 부풀어서 윗면이 위로 1cm 정도 올라오게 재단했었는데 브라우니는 많이 부풀지 않으니까 틀과 거의 비슷하게 재단해요.'},
        ],
      },
      {
        title: '조리',
        steps: [
          {step: 1, description: '호두 전처리를 150/150도로 해요.', tip: '유산지를 깐 팬에 호두를 올리고 오븐에 150/150도로 구워요. 호두를 뺀 후 다시 브라우니 오븐 온도인 180/160도로 예열해놔요.'},
          {step: 2, description: '가루 재료를 체 쳐요.', tip: '체 쳐야 할 가루 재료는 박력분·코코아파우더·베이킹파우더입니다. 코코아 파우더가 들어갔기 때문에 주걱으로 눌러가면서 2번 체를 쳐요!'},
          {step: 3, description: '버터와 초콜릿을 중탕으로 녹여요.', tip: '온도는 40~43도 정도로 해요. 중탕하다가 물이 들어가면 초콜릿이 굳기 때문에 절대 안 돼요!'},
          {step: 4, description: '달걀을 거품이 생기지 않게 풀어요.', tip: '바닥에 대지 않고 동그랗게 섞으면 거품이 생겨요. 믹싱볼에 거품기로 동그랗게 섞는 것이 아니라 믹싱볼 바닥에 대고 지그재그로 섞으며 알끈 때문에 한 번씩 들었다 놨다 해요.'},
          {step: 5, description: '설탕과 소금을 달걀에 넣고 설탕이 녹을 때까지 중탕해요.', tip: '계란이 익지 않게 계속 지그재그로 섞어요.'},
          {step: 6, description: '버터와 초콜릿 중탕한 것에 달걀 섞은 물을 반 넣고 섞고 남은 반을 넣고 더 섞어요.', tip: '작업이 신속하지 않으면 초콜릿이 굳어요. 열기에 계란이 익지 않도록 조금 식혀요. 너무 많이 식히면 초콜릿이 굳으니까 계란이 익지 않을 정도로만 식혀요.'},
          {step: 7, description: '체 친 가루를 넣고 섞어요.', tip: '처음 섞을 때는 휘퍼로 가운데부터 섞어야 가루가 잘 안 튀어요. 어느 정도 섞인 후부터는 꾸덕꾸덕해서 휘퍼로 섞기 힘들어지니까 고무주걱으로 전체적으로 섞어요.'},
          {step: 8, description: '호두 반을 넣고 섞은 후 패닝을 하고 남은 호두 반을 토핑해요.', tip: '호두를 토핑하기 전에 탕치고 고무주걱으로 꼭 눌러서 공기를 뺀 후 호두를 토핑해요.'},
          {step: 9, description: '180/160도로 30분 정도 구워요.', tip: '브라우니는 색깔이 갈색이라서 색으로다 구워졌는지 확인하기 힘들면 나무꼬치 꽂아서 확인해요. 꼬치로 찔러서 반죽이 묻어나면 조금 더 구워요. 구운 후 팬에서 뺄 때 그냥 뒤집으면 토핑 한 호두가 떨어질 수 있으니 팬을 위에 놓고 뒤집어서 빼요!'},
        ],
      },
    ],
  },
  {
    id: '18',
    title: '과일케이크',
    cookbook: '제과기능사',
    method: '크림별립법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb1,
    time: '2시간 30분',
    servings: '1개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '500g'},
          {name: '베이킹파우더', amount: '5(4)g'},
          {name: '바닐라향', amount: '2g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕', amount: '450g'},
          {name: '소금', amount: '7.5(8)g'},
        ],
      },
      {
        title: '유지',
        ingredients: [
          {name: '마가린', amount: '275(276)g'},
          {name: '달걀', amount: '500g'},
          {name: '우유', amount: '90g'},
        ],
      },
      {
        title: '부재료',
        ingredients: [
          {name: '건포도', amount: '75(76)g'},
          {name: '체리', amount: '150g'},
          {name: '호두', amount: '100g'},
          {name: '오렌지필', amount: '65(66)g'},
          {name: '럼주', amount: '80g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '계량컵'},
      {name: '온도계'},
      {name: '믹싱볼'},
      {name: '거품기'},
      {name: '스크래퍼'},
      {name: '고무주걱'},
      {name: '채반'},
      {name: '과일 케이크 틀'},
      {name: '가위'},
      {name: '유산지'},
      {name: '오븐'},
    ],
    stepGroups: [
      {
        title: '유산지 재단',
        steps: [
          {step: 1, description: '유산지 두 장을 반으로 접어서 잘라요. 유산지 위에 케이크 틀을 올린 후 연필로 밑면을 그려요.'},
          {step: 2, description: '본뜬 그림 4군데 위, 아랫부분을 접어요.', tip: '틀 안에 들어가도록 본 뜬 틀보다 작게 접어요.'},
          {step: 3, description: '분홍색 부분은 가위로 자르고 노란색 부분은 접어요! 그리고 팬 높이에 맞게 위아래를 조금씩 접어서 자른 후 틀 안에 유산지를 겹쳐서 넣으면 완성', tip: '유산지 1장으로 2개를 만들 수 있어서 유산지 2장으로 4개를 한꺼번에 겹쳐서 만들면 시간을 단축할 수 있어요^^ 과일 케이크는 팬 크기에 딱 맞게 재단해요. 파운드케이크만큼 부풀지 않기 때문입니다! 재료 계량과 유산지 재단을 한 후 오븐 예열을 해요!'},
        ],
      },
      {
        title: '조리',
        steps: [
          {step: 1, description: '가루 재료를 체 쳐요.'},
          {step: 2, description: '전처리를 해요.', tip: '1) 건포도: 알알이 다 떼어놔요. 떼어놓지 않으면 무거워서 반죽 아래로 내려앉아요. 2) 호두: 잘게 자른 후 로스팅 해요. 150/150도로 3~5분 정도 유산지에 살짝 기름이 묻어나는 정도까지 구워요. 3) 체리: 키친타올이나 마른행주에 놓고 물기를 제거하고 잘라요. 물기를 제거하지 않으면 체리에서 빨간색이 많이 나와요. 키친타올을 밑에 놓고 체리 올려서 키친타월을 위에 한 장 올리고 살살 눌러요. 꼭지를 떼고 반 자르고 작은 체리는 3번, 큰 체리는 4번 정도 잘라요. 4) 럼주의 반 정도에 건포도, 오렌지 필, 체리, 호두를 담아놔요. 딱딱한 건포도를 부드럽게 불려요!'},
          {step: 3, description: '흰자, 노른자를 분리하고 설탕을 반씩 나눠요.', tip: '별립법이니까 흰자, 노른자를 분리하고 노른자에 넣을 설탕 반과 흰자에 넣을 설탕 반을 나눠요.'},
          {step: 4, description: '기계로 흰자 머랭을 올려요.', tip: '설탕의 반을 2~3회 나눠서 머랭을 90% 정도로 올려요. 살짝 끝이 꼬부라지는 정도랍니다! 100%는 완전 똑바로 서는 것이에요!'},
          {step: 5, description: '기계로 돌리는 동안 수작업으로 크림법을 해요.', tip: '1) 따뜻한 물에 마가린을 올리고 10% 정도 녹이고 버터를 마요네즈처럼 부드럽게 해요! 3) 노른자를 나눠서 넣고 섞어요. 손으로 만져서 설탕이 서그락 거리지 않고 2~3개 정도 만져질 때까지 해요.'},
          {step: 6, description: '반죽에 머랭 3분의 1을 넣고 섞어요.'},
          {step: 7, description: '전처리한 것을 반죽을 넣고 섞어요.'},
          {step: 8, description: '럼주 우유를 넣고 섞어요.'},
          {step: 9, description: '나머지 머랭 3분의 1을 넣고 섞고, 3분의 1을 또한번 넣고 섞고, 반죽이 다되면 온도 체크를 해요.'},
          {step: 10, description: '유산지를 깐 팬 4개에 팬닝해요. 고무 주걱으로 평평하게 만들고 유산지가 반죽이 붙지 않도록 팬 양 옆에 유산지를 붙입니다.'},
          {step: 11, description: '180/170도로 25~35분 구워요.', tip: '반죽이 묵직해서 통통퉁만으로 확인하기 힘드니 나무 꼬치를 꽂아서 익었는지 확인해요.'},
        ],
      },
    ],
  },
  {
    id: '19',
    title: '마데라컵케이크',
    cookbook: '제과기능사',
    method: '크림법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb3,
    time: '2시간',
    servings: '12개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '가루',
        ingredients: [
          {name: '박력분', amount: '400g'},
          {name: '베이킹파우더', amount: '10g'},
        ],
      },
      {
        title: '조미 · 감미',
        ingredients: [
          {name: '설탕', amount: '320g'},
          {name: '소금', amount: '4g'},
        ],
      },
      {
        title: '유지 · 란',
        ingredients: [
          {name: '버터', amount: '340g'},
          {name: '달걀', amount: '340g'},
        ],
      },
      {
        title: '부재료',
        ingredients: [
          {name: '건포도', amount: '100g'},
          {name: '호두', amount: '40g'},
          {name: '적포도주', amount: '120g'},
        ],
      },
      {
        title: '퐁당',
        ingredients: [
          {name: '슈가파우더', amount: '80g'},
          {name: '적포도주', amount: '20g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '믹싱볼'},
      {name: '가스레인지'},
      {name: '거품기'},
      {name: '채망'},
      {name: '짤주머니'},
      {name: '고무주걱'},
      {name: '나무주걱'},
      {name: '나무 꼬치'},
      {name: '머핀 팬'},
      {name: '머핀 유산지'},
      {name: '붓'},
      {name: '오븐'},
    ],
    steps: [
      {step: 1, description: '건포도를 적포도주에 담가서 불려요.', tip: '건포도가 붙어있는 것은 손으로 떼어서 딱딱한 건포도가 말랑말랑해지도록 적포도주에 담아놔요. 물에 담으면 수분을 많이 먹어서 컵케이크를 만들었을 때 건포도가 밑으로 다 가라앉을 수 있으니 적포도주에 담아놓은 것이 더 좋아요.'},
      {step: 2, description: '가루 재료를 섞어서 체 쳐요.', tip: '체 쳐야 할 가루 재료는 박력분·베이킹파우더입니다!'},
      {step: 3, description: '크림법으로 유지(버터)를 부드럽게 해요.'},
      {step: 4, description: '설탕과 소금을 3회 나눠서 넣고 섞어요.', tip: '3회 정도 나눠서 넣는 게 분리가 덜 돼요. 크림법은 잦은 스크래핑이 단점이랍니다~ 믹싱볼 옆에 묻은 반죽을 고무주걱으로 스크래핑해주며 충분히 믹싱해요! 설탕이 60% 정도 용해되고 아이보리색 될 때까지 해요!!'},
      {step: 5, description: '달걀 3회 나눠서 넣고 섞어요.', tip: '1,2회는 노른자 위주로 넣어요! 노른자에 레시틴이 있어서 유화제 역할을 해서 먼저 넣어 분리가 잘되지 않게 한 다음에 흰자를 넣어서 섞어요! 달걀을 3회 나눠서 넣을 때 저속~중속~고속으로 섞어요! 덩어리진 게 풀어지고 충분히 섞여서 부드러워질 때까지 해요!!'},
      {step: 6, description: '체 친 가루를 넣고 11자로 섞어요.', tip: '밑면, 옆면을 긁고 주걱으로 11자를 그리며 섞어요! 날가루 안 보일 때까지 섞어요.'},
      {step: 7, description: '적포도주에 담가놓은 건포도를 채망에 담아 약간의 덧가루를 뿌려서 버무려요.', tip: '밑에 가라앉지 않도록 하기 위해서랍니다.'},
      {step: 8, description: '호두와 건포도를 넣고 섞은 후 적포도주를 넣고 섞어요.', tip: '물기가 없어질 때까지 섞어요.'},
      {step: 9, description: '짤주머니에 반죽을 넣고 깍지 안 끼고 짜요.', tip: '짜기 힘들어서 비닐 짤주머니는 터질 수도 있으니 천 짤주머니를 쓰는 것이 좋아요! 건포도와 호두가 있어서 깍지 끼면 걸려서 잘 안 나와서 깍지 없이 반죽을 넣고 짜요. 1cm 정도 띄고 직각으로 가운데에서 쭉 눌러서 50~60%로 24개 개수를 다 채운 후 나머지 반죽을 모자란 부분에 더 채워요! 짤주머니를 가운데 속에 쏙 넣어서 짜요.'},
      {step: 10, description: '185/160으로 15~20분 정도 구워요.', tip: '반죽이 골고루 되도록 오븐에 넣기 전 팬을 한번 탕하고 쳐요.'},
      {step: 11, description: '오븐에 넣고 나서 퐁당 재료를 계량하고 분당(슈가파우더)80g, 적포도주 20g를 섞어서 제조해요.', tip: '오븐에서 머핀이 95% 정도 구워진 상태에서 통통통해보고 나무 꼬치로 꽂아보고 거의 다 구워졌으면 꺼낸 후 붓으로 퐁당을 윗면에 쓱쓱 발라요. 다 익었는지 보려면 오븐에서 빼기 전에 장갑을 끼고 통통 쳐보거나 나무 꼬치로 꽂아서 반죽이 안 묻어 나오는 것을 확인하고 오븐에서 빼시면 된답니다^^'},
      {step: 12, description: '붓을 이용하여 적포도주 퐁당을 바른 후 오븐에 넣고 다시 3~5분 정도 구워요.', tip: '퐁당이 젖어있지 않고 수분을 건조해서 시럽이 하얗게 변할 때까지 구워요.'},
      {step: 13, description: '다 구워진 후 팬에서 뺀 마데라 컵케이크를 냉각팬에서 냉각시켜요.'},
    ],
  },
  {
    id: '20',
    title: '호두파이',
    cookbook: '제과기능사',
    method: '블렌딩법',
    reviewCount: 0,
    imageSource: SAMPLE_IMAGES.thumb19,
    time: '2시간 30분',
    servings: '1개',
    session: '1회차',
    ingredientGroups: [
      {
        title: '반죽(껍질) 만들기',
        ingredients: [
          {name: '중력분', amount: '400g'},
          {name: '노른자', amount: '40g'},
          {name: '소금', amount: '6g'},
          {name: '설탕', amount: '12g'},
          {name: '생크림', amount: '48g'},
          {name: '버터', amount: '160g'},
          {name: '물', amount: '100g'},
        ],
      },
      {
        title: '충전물 재료',
        ingredients: [
          {name: '호두', amount: '250g'},
          {name: '설탕', amount: '250g'},
          {name: '물엿', amount: '250g'},
          {name: '계피가루', amount: '2.5g'},
          {name: '물', amount: '100g'},
          {name: '달걀', amount: '600g'},
        ],
      },
    ],
    tools: [
      {name: '계량기'},
      {name: '계량스푼'},
      {name: '온도계'},
      {name: '믹싱볼'},
      {name: '큰 비닐'},
      {name: '채망'},
      {name: '거품기'},
      {name: '포크'},
      {name: '호두파이 틀'},
      {name: '피처'},
      {name: '유산지'},
      {name: '스크래퍼(둥근/각진)'},
      {name: '고무주걱'},
      {name: '밀대'},
      {name: '가스버너'},
      {name: '붓'},
      {name: '오븐'},
    ],
    stepGroups: [
      {
        title: '반죽만들기',
        steps: [
          {step: 1, description: '중력분을 체 쳐요.', tip: '유산지에 고무주걱으로 덩어리진 가루를 눌러가며 체를 치고 체 친 가루를 믹싱볼에 옮겨놓고 유산지와 체는 작업대 밑에 내려놔요!'},
          {step: 2, description: '생크림에 물·노른자·설탕·소금을 넣고 섞어요.'},
          {step: 3, description: '작업대에 체 친 가루와 버터를 놓고 스크래퍼 2개로 버터를 콩알만한 크기로 자르며 가루 재료에 입혀요.'},
          {step: 4, description: '가운데 홈을 파고 2개의 구멍을 만들어요.'},
          {step: 5, description: '섞어놓은 액체 재료를 가운데 구멍에 붓고 스크래퍼로 섞어요.', tip: '1겹으로 하면 액체가 흘러갈 수 있으니까 2겹으로 구멍을 파서 1겹 가운데에 넣어서 1겹 먼저 섞고 나머지 두 겹도 같이 섞어요! 한 덩어리가 안 돼도 되니 어느 정도 섞이면 반죽을 뭉쳐요!'},
          {step: 6, description: '비닐에 담아 밀대로 밀어 펴서 네모 모양으로 만들고 냉장고에 30분 휴지시켜요.', tip: '휴지하는 이유? 파이 반죽의 뭉쳐져있는 반죽의 글루텐을 느슨하게 해주는 것으로 반죽을 쉬게 해요!'},
        ],
      },
      {
        title: '충전물만들기',
        steps: [
          {step: 1, description: '호두 전처리하기', tip: '팬에 유산지 깔고 호두를 넓게 펼쳐서 150/150도로 2~5분 정도 구워요.'},
          {step: 2, description: '물·설탕·물엿 넣고 휘퍼로 잘 저어서 쉬어요.'},
          {step: 3, description: '달걀 거품이 생기지 않도록 풀어줘요.', tip: '거품기로 노른자를 깨고 지그재그로 섞으면서 거품기를 위로 올렸다 놨다 하면 거품이 잘 생기지 않아요. 거품이 생기면 제품 표면에 볼록볼록 올라니까 거품이 생기지 않도록 풀어요!'},
          {step: 4, description: '2+3을 섞어요.', tip: '막 섞지 말고 지그재그로 들었다 놨다 섞고 노른자가 익지 않게 낮은 온도로 중탕해서 설탕을 녹여요!'},
          {step: 5, description: '체에 걸러요.', tip: '체에 거르는 이유? 거품과 알끈을 제거하기 위해서랍니다!'},
          {step: 6, description: '계피가루를 섞고 유산지를 덮었다 떼고 피처에 담아요.', tip: '거품이 많을 때 유산지를 덮었다가 떼어내면 거품이 사라져요! 충전물을 붓기 쉽도록 피처에 담아놔요.'},
          {step: 7, description: '쇼트닝을 팬 7개의 바닥면과 옆면에 골고루 발라요.'},
        ],
      },
      {
        title: '성형 및 굽기',
        steps: [
          {step: 1, description: '냉장 휴지가 끝난 반죽을 꺼내서 밀어 펴요.', tip: '밀어 펴기 쉽게 덧가루를 준비해서 작업대에 뿌리고 밀대로 밀어요! 반죽으로 호두파이 7개를 만들어야 해요! 전체 양을 계량해서 7등분으로 나눠요! 비닐에 덧가루를 뿌리고 반죽을 비닐에 싸서 0.3cm 정도 두께로 팬 윗면보다 살짝 크게 밀어 펴요.'},
          {step: 2, description: '팬에 반죽을 넣고 공기가 차지 않도록 밀착시킨 후 스크래퍼로 옆면의 반죽을 잘라내요.'},
          {step: 3, description: '포크로 구멍을 살살 내고 모양을 내서 꼬집어요.', tip: '포크로 구멍을 너무 세게 내면 충전물이 다 흐를 수 있으니까 살살내요! 두 손가락으로 반죽을 쥐고 엄지를 밀어 넣으며 돌려가면서 모양을 내요.'},
          {step: 4, description: '반죽 위에 호두를 7등분 해서 담고 충전물 부어요.', tip: '너무 많이 넣으면 끓어서 넘칠 수 있으니 충전물은 70~80퍼센트만 넣어요.'},
          {step: 5, description: '팬에 만든 호두파이 7개를 올려서 180/170도로 30분 구워요.', tip: '중간중간에 호두파이 상태를 보고 파이지 색깔이 나면 아래 색도 나오는 거니까 온도를 조금 내려서 구워요.'},
        ],
      },
    ],
  },
];
