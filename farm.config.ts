import { defineConfig } from '@farm.js/core';

const readOptionalValue = (value: string | undefined) => value ?? '';

export default defineConfig({
  env: {
    public: {
      CONVEX_URL: readOptionalValue,
      FARM_GA_MEASUREMENT_ID: readOptionalValue
    }
  }
});
