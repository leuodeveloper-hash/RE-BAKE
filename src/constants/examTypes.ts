export type ExamType = 'baking_practical' | 'baking_written' | 'pastry_practical' | 'pastry_written';

export const EXAM_TYPE_IDS: ExamType[] = [
  'baking_practical',
  'baking_written',
  'pastry_practical',
  'pastry_written',
];

export const getExamTypes = (
  t: (key: string) => string,
): {id: ExamType; label: string}[] => [
  {id: 'baking_practical', label: t('examTypes.bakingPractical')},
  {id: 'baking_written', label: t('examTypes.bakingWritten')},
  {id: 'pastry_practical', label: t('examTypes.pastryPractical')},
  {id: 'pastry_written', label: t('examTypes.pastryWritten')},
];
