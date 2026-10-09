# Dependency maintenance

Use the committed workspace lockfile and `npm ci`. Review weekly Dependabot patch/minor groups, run the complete verification workflow, and update lockfile and manifest together. Major upgrades require explicit compatibility testing.

`npm run audit:backend` queries npm advisories and compares them to the actual backend production dependency tree. This avoids reporting unrelated hoisted mobile/development packages as runtime API dependencies. It fails closed when audit output cannot be read, writes `artifacts/backend-audit.json`, and exits unsuccessfully for high/critical runtime findings. CI stores the full-workspace audit separately even when development/mobile findings exist.

The implementation pass applied compatible `npm audit fix` updates. The backend runtime audit then reported zero findings. The full workspace still reported 53 findings: 33 moderate, 18 high, and 2 critical, largely involving developer/mobile tooling and its transitive dependencies. These are not claimed fixed. The suggested forced fixes include incompatible downgrades/upgrades; they should be evaluated in a dedicated migration with mobile and build coverage.

Prioritize critical developer-tool execution vulnerabilities, then high tooling/React Native findings. Avoid exposing development servers or test runners to untrusted networks. Audit reports and advisories can change; inspect CI's latest artifact rather than treating these counts as permanent. Review the baseline by 2026-11-08.

Do not suppress backend runtime high/critical findings to make CI green. Do not automatically claim a package is exploitable solely from a workspace-level npm audit count. Record the dependency path, affected execution surface, upstream fix, migration cost, and verification for each remediation.

## Web/API release scope (2026-10-09)

Vite was upgraded to 8.3.4, Vitest to 5.0.3 and the React plugin to 6.1.2. Explicit current esbuild/yaml development dependencies satisfy Vite 8 optional peer ranges. Nodemon was replaced with Node watch mode. `npm run audit:release` validates the selected API runtime and web build dependency trees and intersects advisories with their actual installed locations; unrelated hoisted mobile advisories are retained in the full workspace report. The release audit fails if any selected dependency is invalid or missing and blocks high/critical findings. Mobile/Expo is not distributed by the Vercel/Docker release.

Use `npm ci --ignore-scripts`, then probe the bundled SQLite N-API binary and run the normal verification workflow. CI/Docker do this explicitly; installation scripts are not silently skipped without runtime/build verification.
