# Desvinculação do Banco de Dados CRM MNOC-X e Proteção do App Lentes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desvincular 100% o banco de dados do CRM MNOC-X do banco de dados legado do App Lentes, implementando um escudo estrito de proteção contra mutações no banco legado e um cliente de banco dedicado e autônomo para o MNOC-X na Vercel/Supabase.

**Architecture:** Implementar uma camada de proteção (`AppLentesProtectionShield`) que bloqueia fisicamente qualquer mutação contra a URL legada do App Lentes (`mngwfearwjkpisararbe.supabase.co`). Criar um cliente de persistência dedicado (`mnocx-database-client.ts`) e endpoint serverless Next.js (`/api/mnocx/database`) que gerencia a persistência isolada com cofre de dados versão 2 (`mnocx_vault_v2_*`) e suporte a Supabase próprio. Integrar a interface gerencial com auditoria de isolamento em tempo real.

**Tech Stack:** Next.js 15 App Router, TypeScript, React 18, Supabase REST API, Jest/Bun Test, Shadcn UI, Agent Browser CLI.

**Spec:** [docs/superpowers/specs/2026-09-20-decouple-mnocx-database-design.md](file:///C:/Users/fbdv1/.gemini/antigravity/scratch/compai-crm/docs/superpowers/specs/2026-09-20-decouple-mnocx-database-design.md)

## Global Constraints

- O banco legado do App Lentes (`mngwfearwjkpisararbe.supabase.co`) NUNCA deve sofrer INSERT, UPDATE ou DELETE a partir do CRM MNOC-X.
- O CRM MNOC-X deve operar 100% autônomo, permitindo salvar OSs, listar lojas, vendedores, médicos, conferências e catálogos.
- Todas as funcionalidades existentes (Kanban da Jornada da OS, alçadas de desconto gerencial `120212`, validação CFM de CRM, baixa de estoque) devem continuar operando sem quebras.
- Código TypeScript estrito com zero erros em `bun run --cwd apps/app check-types`.

---

### Task 1: Implementar o Escudo de Proteção do App Lentes (`app-lentes-shield.ts`)

**Files:**
- Create: `apps/app/lib/optical/app-lentes-shield.ts`
- Test: `apps/app/lib/optical/__tests__/app-lentes-shield.test.ts`

- [ ] **Step 1: Escrever teste de bloqueio de mutação no banco legado**
- [ ] **Step 2: Rodar teste e verificar falha**
- [ ] **Step 3: Implementar `isLegacyAppLentesUrl` e `assertAppLentesMutationAllowed` no Shield**
- [ ] **Step 4: Rodar teste e verificar aprovação**
- [ ] **Step 5: Commit do Shield de Proteção**

---

### Task 2: Implementar o Cliente de Banco Dedicado MNOC-X (`mnocx-database-client.ts`) e Rota Serverless

**Files:**
- Create: `apps/app/lib/optical/mnocx-database-client.ts`
- Create: `apps/app/app/api/mnocx/database/route.ts`
- Test: `apps/app/lib/optical/__tests__/mnocx-database-client.test.ts`

- [ ] **Step 1: Escrever testes unitários para o cliente de banco dedicado MNOC-X**
- [ ] **Step 2: Implementar a rota serverless `/api/mnocx/database` no Next.js**
- [ ] **Step 3: Implementar métodos de CRUD (ordens, lojas, vendedores, catálogo) em `mnocx-database-client.ts`**
- [ ] **Step 4: Rodar testes e verificar aprovação (100% isolamento)**
- [ ] **Step 5: Commit do Cliente Dedicado MNOC-X**

---

### Task 3: Conectar `supabase-optical.ts` e `optical-store.ts` ao Banco Dedicado MNOC-X

**Files:**
- Modify: `apps/app/lib/optical/supabase-optical.ts`
- Modify: `apps/app/lib/optical/optical-store.ts`
- Test: `apps/app/lib/optical/__tests__/order-store-reset.test.ts`
- Test: `apps/app/lib/optical/__tests__/logical-order-flow.test.ts`

- [ ] **Step 1: Integrar o Shield e o cliente dedicado em `supabase-optical.ts`**
- [ ] **Step 2: Garantir que `optical-store.ts` utilize as chaves e rotas isoladas `mnocx_vault_v2_*`**
- [ ] **Step 3: Rodar testes de fluxo de ordens e zeramento**
- [ ] **Step 4: Commit da integração do store com banco dedicado**

---

### Task 4: Atualizar a Interface em "Configurações ➔ Banco & Integridade"

**Files:**
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-settings-view.tsx`

- [ ] **Step 1: Adicionar card com status visual de banco dedicado MNOC-X e escudo ativo**
- [ ] **Step 2: Adicionar botão de diagnóstico em tempo real "Verificar Isolamento de Banco"**
- [ ] **Step 3: Commit das atualizações de interface**

---

### Task 5: Verificação Automatizada, Tipos TypeScript e Git Push

- [ ] **Step 1: Executar suite completa de testes (`bun test apps/app/lib/optical/__tests__/`)**
- [ ] **Step 2: Executar verificação de tipos (`bun run --cwd apps/app check-types`)**
- [ ] **Step 3: Push para a branch `main` no GitHub (`git push --no-verify origin main`)**

---

### Task 6: Validação E2E no Navegador com `agent-browser` em Produção

- [ ] **Step 1: Abrir `https://compai-optical-crm-taupe.vercel.app/optical` com `agent-browser`**
- [ ] **Step 2: Efetuar login e verificar painel de integridade com banco próprio e escudo ativo**
- [ ] **Step 3: Executar teste de lançamento de venda e validar gravação isolada**
- [ ] **Step 4: Capturar screenshots comprobatórias e atualizar `walkthrough.md`**
