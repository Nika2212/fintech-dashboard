export const VALIDATION_MESSAGES = {
  required: 'Enter a value',
  integer: 'Use a whole number',
  min: ({ min }: { min: number }): string => `Must be at least ${min}`,
  max: ({ max }: { max: number }): string => `Must be at most ${max}`,
};
