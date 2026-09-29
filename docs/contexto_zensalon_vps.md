# Contexto — ZenSalon: migração para VPS + ramo Pet Shop

Atualizado em 29/09/2026. Colar no início da próxima conversa.

## Onde paramos (resumo)
- **Migração em ~85%.** O ZenSalon já roda em teste na VPS: **https://vps.zensalon.com.br**, com os dados copiados do Supabase (banco, usuários com as mesmas senhas e arquivos).
- O site oficial (**zensalon.com.br**, Supabase + Railway + Vercel) **continua no ar e intocado**.
- Falta: **backup → testar → virada**.

## Decisão de rumo
- Adaptar o próprio ZenSalon (repo `jcnoga/beautytech-v2`, pasta `C:\projetos\beautytech-v2`), no **ramo git `vps`**. Nunca mexer no `main` até a virada. **Não clicar em "Criar PR".**
- Ordem: A) preparar ✅ → B) migrar ✅ (teste) → **C) virada** → D) ramos configuráveis + Pet Shop.
- Futuro: domínio por ramo (ex.: zenpet.com.br), domínio próprio do cliente e vertical Oficina.

## Feito no ramo vps (commits principais)
- Baseline das 22 tabelas que só existiam em produção; DTOs nas 19 rotas com `...req.body`.
- Isolamento entre salões: 23 rotas conferem que cliente/profissional/serviço/agendamento são do mesmo salão (24 testes).
- CPF/CNPJ passa a gravar em `tenants.cpf_cnpj` (commit `66a56c4`).
- Login no GoTrue próprio (HS256), `password_resets` via Drizzle, "esqueci a senha" via API + Resend.
- Uploads na VPS com `@fastify/multipart`, servidos pelo nginx.
- Domínio de teste vps.zensalon.com.br (`ad0f3f0`); cópia repetível `deploy/copiar-tudo.sh` (`1292f32`).
- Travas: `JOBS_ENABLED=false` e `WHATSAPP_SEND_ENABLED=false` (nenhum lembrete, WhatsApp ou desconexão sai da VPS).
- Lista de usuários: `deploy/listar-usuarios.sh` (`e193de3`). Rodar na VPS: `sh /opt/apps/zensalon/deploy/listar-usuarios.sh`.

## Resolvido em 29/09
- **Painel zerado (antiga pendência 1):** não era defeito da migração. `websitelogx@gmail.com` já estava sem perfil (user_profiles) no site atual, problema antigo. Sem perfil, a API responde 403 "Perfil não encontrado" e o painel mostra "ZenSalon" com tudo 0.
- **Contas sem uso (antigas pendências 2 e 3):** apagadas no Supabase 17 contas, incluindo `zensalon@zensalon.com` (senha exposta). Restam só as 5 donas. A VPS ainda tem a cópia antiga; a limpeza chega lá ao refazer `copiar-tudo.sh` na virada.
- **R1 no Supabase:** removidas as políticas públicas de `password_resets` e `configuracoes`.

## Estado da VPS (187.77.236.36)
- Pasta `/opt/apps/zensalon` (clone do ramo vps). Containers `zensalon-web`, `zensalon-api`, `zensalon-gotrue`. Bancos `zensalon` e `gotrue_zensalon`.
- Traefik existente (entrypoint `websecure`, certresolver `letsencrypt`). Nada fora do ZenSalon foi alterado.
- `.env.api` em **modo teste**: WhatsApp e Asaas desligados, `RESEND_API_KEY=re_desativado`.
- Arquivos: `/root/zensalon-supabase.env` (URL do banco Supabase, chmod 600, para refazer a cópia na virada); `/root/zensalon-superadmin.txt` (senha do super admin); backups da cópia em `/opt/backups/zensalon/` (apagar 1 semana após a virada).
- DNS: `vps.zensalon.com.br` → 187.77.236.36 (zona do zensalon.com.br no Registro.br).

## PENDÊNCIAS
1. **Backup do Postgres compartilhado da VPS:** verificar (só leitura) se existe backup automático e se ele cobre `zensalon` e `gotrue_zensalon`. Em andamento.
2. **Testes na VPS** com os dados: login, agenda, clientes, financeiro, logo/fotos, criar agendamento, "hoje" no fuso de Brasília. Não clicar em WhatsApp/cobrança.
3. Melhorias propostas (opcionais, ramo vps): painel mostrar "conta sem salão vinculado" em vez de zeros; exclusão de salão pelo super admin (`DELETE /super-admin/tenants/:id`) também apagar os logins, para não gerar contas sem perfil.

## Checklist da virada (etapa C, 1–2 h, horário tranquilo)
- Refazer a cópia com `sh deploy/copiar-tudo.sh` (dados mais recentes).
- Ligar no `.env.api`: WhatsApp, Asaas, Resend real, `JOBS_ENABLED=true`, `WHATSAPP_SEND_ENABLED=true`.
- Apontar `zensalon.com.br` e `www` para a VPS (Registro.br) e configurar no Traefik. **Não apagar MX/TXT (e-mail) nem `evolution`.**
- **n8n:** na credencial "Postgres account 3" do fluxo "💜 ZenSalon — Atendimento WhatsApp", trocar o Host para o banco da VPS (tabelas sessoes_salao, atendimentos_humanos).
- Webhook do Asaas apontar para a VPS. Rota de domínio próprio (hoje usa API da Vercel) fica para depois.
- Desligar Railway/Vercel após 1 semana estável; depois trocar a senha do banco no Supabase e desativá-lo.
- Só então juntar o ramo `vps` ao `main`.

## Problemas conhecidos (não urgentes)
- 32 erros antigos de TypeScript (já existiam).
- Emojis corrompidos em títulos ("? Aniversariantes") — conferir se também no site atual.

## Projeto PetShop (núcleo novo) — PAUSADO
- Repo `jcnoga/petshop`, pasta `C:\projetos\PetShop`, último commit `d65e7ba`. No ar em petshop.99labpro.com.br (petshop-web/api/gotrue). Decidir depois se desliga.

## Como trabalhar
- Claude Code pelo **Claude Desktop**, pasta `C:\projetos\beautytech-v2`, modo **Manual**.
- Rótulos: **win** = Git Bash; **vps** = Git Bash após `ssh root@187.77.236.36`; **claude** = caixa do Claude Desktop.
- Não tirar print entre copiar algo (ex.: senha/URL) e o Claude ler a área de transferência.
- "Sempre permitir" só para git commit/push no vps, testes e consultas; "Permitir uma vez" para o que altera a VPS.
