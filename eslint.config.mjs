import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Data fetching in effects (fetch-on-mount, polling, subscribing) is the
      // intended pattern for this app. Fresh react-hooks flags any setState
      // reachable from an effect even when it happens after `await`, which
      // would require an awkward rewrite of every list component.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
