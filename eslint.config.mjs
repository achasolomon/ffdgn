import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * ESLint 9 flat config.
 *
 * Next 16 removed `next lint`, so linting is driven by the ESLint CLI directly.
 * `eslint-config-next@16` ships flat configs natively — running them through
 * `FlatCompat` produces circular plugin references, so they are imported as-is.
 * The legacy `.eslintrc.json` opt-out for `<img>` (YouTube thumbnails, where
 * `next/image` cannot proxy the CDN) is reproduced here.
 */
const config = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "deploy/tools/**", "deploy/.npm-cache/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
