# Order Form, Seller Cards & TopNav Enhancements Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Implement dropdown improvements and technical catalog mirroring in Lançar OS, fix text clipping in seller performance cards, and achieve 5+5+1 symmetrical layout in TopNav.

**Architecture:** Extend AroItem in optical-types.ts and optical-store.ts; modernize optical-order-form.tsx with clean full-width dropdowns from lensCatalog, rameCatalog, and TREATMENT_OPTIONS; adjust optical-sales-performance-view.tsx subgrid to 2-row layout; refactor optical-top-nav.tsx into 5-col top, 5-col bottom, and right-docked 2-row config button.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI, @crm/ui, Bun test.

**Spec:** docs/superpowers/specs/2026-09-17-order-form-and-seller-cards-enhancements-design.md

## Global Constraints
- Preserve existing comments and docstrings.
- Ensure 0 TypeScript errors (check-types).
- Verify visual layout using agent-browser.

---

### Task 1: Core Schema & Store Extension
**Files:**
- Modify: pps/app/lib/optical/optical-types.ts
- Modify: pps/app/lib/optical/optical-store.ts
- Test: pps/app/lib/optical/__tests__/

- [ ] Step 1: Add lens and frame technical fields to AroItem in optical-types.ts.
- [ ] Step 2: Update sanitizeOrder in optical-store.ts to preserve technical fields for ro1 and ro2.
- [ ] Step 3: Run un test apps/app/lib/optical/__tests__/ to verify existing tests pass.

### Task 2: TopNav Symmetrical 5+5+1 Reorganization
**Files:**
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-top-nav.tsx

- [ ] Step 1: Divide modules into ow1Items (5 items: balcao, jornada_os, pos_venda, mensagens, conferencia), ow2Items (5 items: lentes, pecas, medicos, visita_medica, resumo), and configItem (config).
- [ ] Step 2: Implement responsive desktop layout where cols 1-5 have equal width across row 1 and row 2, and config occupies the right side spanning both rows (ow-span-2 h-full).
- [ ] Step 3: Verify TypeScript and styling.

### Task 3: Seller Performance Cards Redesign
**Files:**
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-sales-performance-view.tsx

- [ ] Step 1: Replace cramped grid grid-cols-3 with 2-row layout:
  - Row 1: 2 equal-width columns for Meta Diária and Meta Semana.
  - Row 2: full-width highlighted bar for Prêmio Semana with trophy icon, qualification status, and currency.
- [ ] Step 2: Verify responsive behavior and typography.

### Task 4: Order Form Dropdowns & Technical Fields Mirroring
**Files:**
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-order-form.tsx
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-order-detail-sheet.tsx

- [ ] Step 1: Fetch rameCatalog along with lensCatalog.
- [ ] Step 2: Replace clashing/overlapping selectors with clean, full-width selectors for Laboratório, Lente, and Tratamento.
- [ ] Step 3: Add Frame Catalog selector for Aro 1 and Aro 2.
- [ ] Step 4: Mirror and display technical badges/inputs (Tipo, Família, IR, Tecnologia for lenses; Tipo, Família, Fabricante, Aro/Ponte for frames).
- [ ] Step 5: Support split OD/OE mode and copy Aro 1 to Aro 2 with all technical fields replicated.

### Task 5: Automated Verification & agent-browser Visual Validation
**Files:**
- Verification only

- [ ] Step 1: Run un test apps/app/lib/optical/__tests__/.
- [ ] Step 2: Run un run --filter=app check-types.
- [ ] Step 3: Use gent-browser to capture and verify:
  - TopNav symmetry.
  - Seller performance cards layout.
  - Nova Venda / Lançar OS modal dropdowns and mirrored fields.
- [ ] Step 4: Commit and push changes.
