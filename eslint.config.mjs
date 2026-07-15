import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next v16 ships native flat config, so it is spread in
// directly. Routing it through @eslint/eslintrc's FlatCompat instead throws
// "Converting circular structure to JSON" on this version.
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  { ignores: ["out/**", ".next/**", "node_modules/**", "public/**"] },
];

export default eslintConfig;
