// Restaura uma conta excluída pelo Super Admin, a partir do backup em TENANT_BACKUPS_DIR. Sem confirmação, só CONFERE
// o backup (sha256sums, conta inexistente, mesma estrutura do banco) e LISTA o que seria restaurado.
// Uso (na VPS, num container descartável da imagem da API, com o .env da API e o volume dos backups montado):
//   conferir:  node --import tsx scripts/restaurar-conta.ts /data/backups-contas/<pasta>
//   aplicar:   ZS_CONFIRMAR_RESTAURACAO=sim node --import tsx scripts/restaurar-conta.ts /data/backups-contas/<pasta>
// Depois: cada usuário da conta entra com "Esqueci minha senha" (a senha não fica no backup).
import { restoreFromBackup } from "../src/modules/super-admin/tenant-restore";
import { closeDatabaseConnection } from "../src/db/connection";

(async () => {
  const dir = process.argv[2];
  if (!dir) { console.error("Informe a pasta do backup."); process.exit(1); }
  const apply = process.env.ZS_CONFIRMAR_RESTAURACAO === "sim";
  const r = await restoreFromBackup(dir, { apply });
  console.log(`Conta: ${r.tenant.name} (${r.tenant.id})`);
  console.log(`Linhas por tabela: ${JSON.stringify(r.rows)}`);
  console.log(`Logins: ${r.logins}`);
  console.log(r.applied ? "Restaurada. Avise os usuários para usar \"Esqueci minha senha\"." : "Nada foi aplicado (para aplicar: ZS_CONFIRMAR_RESTAURACAO=sim).");
  await closeDatabaseConnection();
})().catch(async (e) => { console.error("ERRO:", e.message); process.exit(1); });
