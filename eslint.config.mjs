import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Ported 3D twin code. React Three Fiber animates by mutating three.js
  // objects in useFrame and reads latest props through refs; both are the
  // library's intended pattern, which these React Compiler rules don't model.
  // Kept in its original style, so style-only rules are relaxed too.
  {
    files: ["components/twin/soap-line/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "prefer-const": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
