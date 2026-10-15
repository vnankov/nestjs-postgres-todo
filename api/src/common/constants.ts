export const APP_LIMITS = Symbol('APP_LIMITS');

export interface AppLimits {
  listLimit: number;
  sampleSize: number;
}

export const APP_LIMIT_VALUES: AppLimits = {
  listLimit: 100,
  sampleSize: 5000,
};
