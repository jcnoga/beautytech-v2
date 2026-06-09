content = open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', encoding='utf-8').read()

old = """
// ============================================================
// ASAAS MODULE - Pagamentos e Assinaturas
// ============================================================

export async function asaasModule(fastify: any) {"""

new = """
// ============================================================
// ASAAS MODULE - Pagamentos e Assinaturas
// ============================================================
import { eq } from "drizzle-orm";
import { db } from "@db/connection";
import { tenants } from "@db/schema/index";
import { authenticate } from "@middleware/auth";

export async function asaasModule(fastify: any) {"""

if old in content:
    open('C:/projetos/beautytech-v2/backend/src/modules/asaas.module.ts', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
