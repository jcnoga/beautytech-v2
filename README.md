# BeautyTech v2 — SaaS Enterprise
 
Sistema completo para Salão de Beleza, Barbearia, Estética e Spa.
 
## Estrutura
 
```
beautytech-v2/
├── backend/          # Node.js + Fastify + Drizzle ORM
├── frontend/         # React + Vite + TypeScript
├── docs/             # SQL, seeds, guias
└── .github/          # CI/CD GitHub Actions
```
 
## Setup rápido
 
```bash
# Backend
cd backend
cp .env.example .env
# Preencha o .env com suas credenciais Supabase
npm install
npm run dev
 
# Frontend (outro terminal)
cd frontend
cp .env.example .env
# Preencha VITE_API_URL e credenciais Supabase
npm install
npm run dev
```
 
## Deploy
 
Siga o DEPLOY_GUIDE.md na pasta docs/.
 
## Checklist crítico
 
- [ ] Senha Supabase SEM #$@%
- [ ] DATABASE_URL com Session Pooler (IPv4)
- [ ] jose e tsx em dependencies
- [ ] VITE_API_URL sem /api/v1 no final
- [ ] Middleware usando JWKS (não JWT Secret)
