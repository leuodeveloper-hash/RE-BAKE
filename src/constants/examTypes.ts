export type ExamType = 'baking_practical' | 'baking_written' | 'pastry_practical' | 'pastry_written';

export const EXAM_TYPES: {id: ExamType; label: string}[] = [
  {id: 'baking_practical', label: '제빵기능사 실기'},
  {id: 'baking_written', label: '제빵기능사 필기'},
  {id: 'pastry_practical', label: '제과기능사 실기'},
  {id: 'pastry_written', label: '제과기능사 필기'},
];
