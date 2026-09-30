// npm run check — roda antes de todo commit, junto com os testes do backend e o build.
// 1) Analisa todo .ts/.tsx de src com o @babel/parser, o mesmo do vite dev (@vitejs/plugin-react).
//    O vite build usa esbuild + Rollup, que aceitam nome repetido calados (ex.: import e função
//    com o mesmo nome: o Rollup descarta o import e a tela errada vai para o bundle).
// 2) tsc --noEmit (tsconfig.check.json): falha só se o número de erros passar da base
//    registrada em scripts/tsc-baseline.json. Se cair, avisa para baixar a base.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const root = fileURLToPath(new URL("..", import.meta.url));
const baselineFile = join(root, "scripts", "tsc-baseline.json");
// Fora da checagem (manter igual ao "exclude" do tsconfig.check.json):
// App_HEAD.tsx = cópia antiga do App.tsx em UTF-16, não importada por ninguém.
const IGNORE = ["src/App_HEAD.tsx"];
let failed = false;

// ── 1. Sintaxe e nomes repetidos ────────────────────────────────────────────
const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name) && !IGNORE.includes(relative(root, p).replaceAll("\\", "/"))) files.push(p);
  }
};
walk(join(root, "src"));
const syntaxErrors = [];
for (const f of files) {
  const plugins = f.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"];
  try { parse(readFileSync(f, "utf8"), { sourceType: "module", plugins }); }
  catch (e) { syntaxErrors.push(`${relative(root, f)}: ${e.message}`); }
}
if (syntaxErrors.length) {
  failed = true;
  console.log(`✗ babel: ${syntaxErrors.length} arquivo(s) com erro (o vite dev não abre):`);
  for (const s of syntaxErrors) console.log(`  ${s}`);
} else console.log(`✓ babel: ${files.length} arquivos de src sem erro de sintaxe nem nome repetido`);

// ── 2. TypeScript contra a base ─────────────────────────────────────────────
const tsc = spawnSync(process.execPath, [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.check.json"], { cwd: root, encoding: "utf8" });
const tsErrors = (tsc.stdout + tsc.stderr).split("\n").filter((l) => /error TS\d+/.test(l));
const baseline = JSON.parse(readFileSync(baselineFile, "utf8")).tscErrors;
if (process.argv.includes("--update-baseline")) {
  writeFileSync(baselineFile, JSON.stringify({ tscErrors: tsErrors.length }, null, 2) + "\n");
  console.log(`base do tsc atualizada: ${baseline} → ${tsErrors.length}`);
} else if (tsErrors.length > baseline) {
  failed = true;
  console.log(`✗ tsc: ${tsErrors.length} erros, acima da base de ${baseline}. Erros atuais:`);
  for (const l of tsErrors) console.log(`  ${l}`);
} else if (tsErrors.length < baseline) {
  console.log(`✓ tsc: ${tsErrors.length} erros, abaixo da base de ${baseline}. Baixe a base: npm run check -- --update-baseline`);
} else console.log(`✓ tsc: ${tsErrors.length} erros (igual à base; nenhum erro novo)`);

process.exit(failed ? 1 : 0);
