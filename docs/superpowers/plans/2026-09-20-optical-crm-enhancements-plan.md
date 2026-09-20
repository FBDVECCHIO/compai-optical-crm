# Plano de Implementação: Melhorias no CRM Óptico MNOC-X (Usabilidade, Blindagem e Fluxos)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o pacote de 13 refinamentos no CRM Óptico MNOC-X: blindagem contra tradução de navegadores, layout responsivo de detalhes de OS com impressão/PDF, cadastro de captadores e comissões, lançamento aprimorado de Aro 1 e Aro 2, correção de seletores de pagamento e parcelamento, e zeramento administrativo total.

**Architecture:** O sistema integra a blindagem nativa no layout Next.js (`translate="no"` / `notranslate`), estende a store Zustand e conectores Supabase com as novas entidades (Captadores e Formatos de Aro), aprimora o componente `OpticalDioptersTable` com travamento seletivo de dioptrias e adição, refatora `OpticalOrderForm` com código mandatório de estoque e medições de armação trazida, enriquece `OpticalOrderDetailSheet` com impressão A4/PDF, e valida todo o fluxo ponta a ponta com testes e `agent-browser`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Zustand, Lucide/Carbon Icons, Shadcn UI (Radix UI), Bun Test, Agent Browser.

**Spec:** `docs/superpowers/specs/2026-09-20-optical-crm-enhancements-design.md`

## Global Constraints
- Regra de Ouro: Banco legado do App Lentes (mngwfearwjkpisararbe) deve permanecer 100% blindado contra mutações.
- Preservar tipagem TypeScript estrita com 0 erros de compilação (`bun run --cwd apps/app check-types`).
- Todos os botões e termos ópticos devem ter `translate="no"` e `className="notranslate"`.
- Proibição de uso de termos traduzidos ("Hoop", "Anel", "Foto instantânea").

---

### Task 1: Blindagem Anti-Tradução do Navegador e Correção de Seletores (SelectTrigger e SelectValue)
**Files:**
- Modify: `apps/app/app/layout.tsx`
- Modify: `packages/ui/src/components/select.tsx`
- Modify: `apps/app/app/optical/optical-standalone-container.tsx`
- Test: `apps/app/lib/optical/__tests__/anti-translation-shield.test.ts`

- [ ] **Step 1: Write test for translation shielding attributes and metadata**
- [ ] **Step 2: Add lang="pt-BR", translate="no", className="notranslate" and meta tags in RootLayout**
- [ ] **Step 3: Update SelectTrigger and SelectValue in packages/ui to enforce translate="no" and prevent text duplication**
- [ ] **Step 4: Run tests and typecheck**
- [ ] **Step 5: Commit changes**

---

### Task 2: Visualização de Detalhes da OS, Botões Imprimir e Gerar PDF
**Files:**
- Create: `apps/app/lib/optical/optical-print-order.ts`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-order-detail-sheet.tsx`
- Test: `apps/app/lib/optical/__tests__/optical-print-order.test.ts`

- [ ] **Step 1: Write tests for optical order print data preparation and voucher formatting**
- [ ] **Step 2: Implement optical-print-order.ts with A4 and thermal layout, signatures and diopters**
- [ ] **Step 3: Expand optical-order-detail-sheet.tsx to sm:max-w-4xl with uncrowded layout and add [Imprimir OS] and [Gerar PDF] buttons**
- [ ] **Step 4: Run tests and verify**
- [ ] **Step 5: Commit changes**

---

### Task 3: Módulo de Captadores & Comissões de OS
**Files:**
- Modify: `apps/app/lib/optical/optical-types.ts`
- Modify: `apps/app/lib/optical/supabase-optical.ts`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-settings-view.tsx`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-order-form.tsx`
- Test: `apps/app/lib/optical/__tests__/captadores-commission.test.ts`

- [ ] **Step 1: Write unit tests for captador commission calculation (percentage vs fixed BRL)**
- [ ] **Step 2: Add OpticalCaptador type and storage helpers in supabase-optical.ts**
- [ ] **Step 3: Add Captadores management tab in optical-settings-view.tsx with CRUD and commission settings**
- [ ] **Step 4: Add Captador selection and live commission display in optical-order-form.tsx below Doctor**
- [ ] **Step 5: Run tests and typecheck**
- [ ] **Step 6: Commit changes**

---

### Task 4: Aro 1 - Código de Produto Mandatório, Bloqueio de Estoque e Armação Trazida com Formato 2D & Foto
**Files:**
- Modify: `apps/app/lib/optical/optical-types.ts`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-order-form.tsx`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-settings-view.tsx`
- Test: `apps/app/lib/optical/__tests__/aro1-stock-validation.test.ts`

- [ ] **Step 1: Write tests for mandatory product code, stock validation blocking, and customer frame technical metrics**
- [ ] **Step 2: Implement mandatory product code autocomplete with readonly locked fields for stock pieces in Aro 1**
- [ ] **Step 3: Implement stock validation check (blocking OS submission if stock <= 0 with alert)**
- [ ] **Step 4: Implement brought frame measurements (bridge, eye, vertical B, diagonal ED, brand, type) with 2D shape selector and photo upload**
- [ ] **Step 5: Add 2D frame shapes catalog in settings**
- [ ] **Step 6: Run tests and typecheck**
- [ ] **Step 7: Commit changes**

---

### Task 5: Alinhamento de Tratamentos, Nomenclatura de Modo de Pagamento e Refinamentos de Formulário
**Files:**
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-order-form.tsx`

- [ ] **Step 1: Fix treatment description alignment with price box in Aro 1 and Aro 2**
- [ ] **Step 2: Update payment mode title to "Modo de Pagamento" and buttons to "Pagamento Total" and "Sinal"**
- [ ] **Step 3: Update patient button to "Copiar WhatsApp"**
- [ ] **Step 4: Fix doctor button to have single plus sign "+ Cadastrar Novo Médico"**
- [ ] **Step 5: Verify form visual consistency and run check-types**
- [ ] **Step 6: Commit changes**

---

### Task 6: Aro 2 - Blindagem de Dioptrias, Apenas DNP/Altura Editáveis, Adição Blindada em Monofocal e Botão Copiar Dados Aro 1
**Files:**
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-diopters-table.tsx`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-order-form.tsx`
- Test: `apps/app/lib/optical/__tests__/aro2-diopters-lock.test.ts`

- [ ] **Step 1: Write tests for Aro 2 diopters locking (allowing only DNP and Altura) and monofocal addition lock**
- [ ] **Step 2: Add allowOnlyDnpAndAlt and lockAddition props to OpticalDioptersTable**
- [ ] **Step 3: Update Aro 2 in optical-order-form.tsx with locked diopters, title "Aro 2", and enhanced "Copiar Dados Aro 1" button**
- [ ] **Step 4: Run tests and verify**
- [ ] **Step 5: Commit changes**

---

### Task 7: Zeramento Administrativo Seguro e Validação de Construção
**Files:**
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-settings-view.tsx`
- Modify: `apps/app/lib/optical/optical-store.ts`

- [ ] **Step 1: Ensure administrative zeroing (password 120212) completely clears all CRM sales and orders cleanly**
- [ ] **Step 2: Run full test suite (`bun test apps/app/lib/optical/__tests__/`)**
- [ ] **Step 3: Run full TypeScript check (`bun run --cwd apps/app check-types`)**
- [ ] **Step 4: Commit and push to main**

---

### Task 8: Validação E2E no Navegador com Agent Browser em Produção
**Files:**
- Test: Live deployment at `https://compai-optical-crm-taupe.vercel.app/optical`

- [ ] **Step 1: Authenticate and inspect the refreshed UI in agent-browser**
- [ ] **Step 2: Open order details sheet, test Imprimir and Gerar PDF**
- [ ] **Step 3: Verify payment method and installments selectors (no overlapping text)**
- [ ] **Step 4: Test Aro 1 stock code autocomplete and stock blocking**
- [ ] **Step 5: Test Aro 2 with locked diopters and "Copiar Dados Aro 1"**
- [ ] **Step 6: Capture and save verification screenshots**
