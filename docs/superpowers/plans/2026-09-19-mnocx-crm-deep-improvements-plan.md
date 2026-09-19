# MNOC-X CRM Deep Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Implement deep workflow, governance, stock management, and UI improvements across MNOC-X CRM.

**Architecture:** Extend domain types with discount policies, fix Kanban status reconciliation, create Manager Authorization modals, align Settings subtabs into 5+5+1 grid, clean orders table actions to 4 icons, and overhaul the order form with stock integration, discount delegation, and Aro 2 OS splitting.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, TailwindCSS 4, Carbon Icons, Bun test, agent-browser.

**Spec:** docs/superpowers/specs/2026-09-19-mnocx-crm-deep-improvements-design.md

## Global Constraints
- Zero TypeScript errors (un run --filter=app check-types).
- All existing and new unit tests must pass (un test).
- Visual evidence verified via gent-browser.

---

### Task 1: Status Standardization & Kanban Stage Transition Fix
**Files:**
- Modify: pps/app/lib/optical/optical-types.ts
- Modify: pps/app/lib/optical/optical-store.ts
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-os-journey-view.tsx
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-kanban.tsx
- Test: pps/app/lib/optical/__tests__/kanban-persistence.test.ts

- [ ] **Step 1:** Update sanitizeOrder and alidStatuses in optical-store.ts to recognize both canonical statuses and aliases (PEDIDO, MONTAGEM, CONFERIDO, LOJA), normalizing them into canonical OpticalOrderStatus.
- [ ] **Step 2:** Update optical-os-journey-view.tsx so JOURNEY_STAGES uses canonical statuses or maps bidirectional cleanly, ensuring updateOrderStatus advances the card.
- [ ] **Step 3:** Update optical-kanban.tsx drag-and-drop to fallback to draggedOrderId state if e.dataTransfer.getData is empty.
- [ ] **Step 4:** Run un test apps/app/lib/optical/__tests__/kanban-persistence.test.ts.

---

### Task 2: Balcão & Vendas — Manager Password for Goals/Awards, Card Redistribution & Remove Barra Compacta
**Files:**
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-sales-performance-view.tsx

- [ ] **Step 1:** Remove 'Barra Compacta' toggle from optical-sales-performance-view.tsx, fixing mode to Velocímetro.
- [ ] **Step 2:** Redesign seller cards grid to grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 for superior horizontal real estate coverage.
- [ ] **Step 3:** Implement Manager Authentication Modal when clicking 'Editar Metas'. Prompt for manager selection/password (120212), log authorization, and only then open edit mode.

---

### Task 3: Conferência Lab — Responsive Pagination & Inline Edit Action
**Files:**
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-conference-view.tsx

- [ ] **Step 1:** Add state for pageSize (10, 20, 50) and currentPage (1-indexed).
- [ ] **Step 2:** Paginate iltered records and render accessible pagination bar with rows-per-page selector, item range indicator, and Previous/Next buttons.
- [ ] **Step 3:** Add an Edit button with pencil icon in table action column, populating the conference form for immediate editing with cancel option.

---

### Task 4: Configurações — Symmetrical 5+5+1 Layout & Discount Policies Module
**Files:**
- Modify: pps/app/lib/optical/optical-types.ts
- Modify: pps/app/lib/optical/optical-store.ts
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-settings-view.tsx
- Test: pps/app/lib/optical/__tests__/discount-policy.test.ts (new)

- [ ] **Step 1:** Add DiscountPolicy type and store methods (getDiscountPolicies, saveDiscountPolicy, deleteDiscountPolicy, checkDiscountAllowed).
- [ ] **Step 2:** Reorganize subtabs in optical-settings-view.tsx into 5 (Row 1) + 5 (Row 2) + 1 (Banco & Integridade spanning both rows on the right).
- [ ] **Step 3:** Implement the new descontos subtab in optical-settings-view.tsx with rule table, add form, role selection, brand/lab filter, and max % limit.

---

### Task 5: Orders Table Actions Cleanup (4 Clear Icons)
**Files:**
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-orders-table.tsx

- [ ] **Step 1:** Replace current actions dropdown with 4 direct icon buttons: Edit (Edit), WhatsApp (Phone), View Details & Diopters (Search/View), Mark Delivered (Checkmark).
- [ ] **Step 2:** Remove 'Marcar como Pedido Rápido na Loja'.
- [ ] **Step 3:** Ensure accessible 	itle and ria-label tooltips on each icon button.

---

### Task 6: Order Form Overhaul — Stock Integration, Discount Delegation, Lens Filtering & Aro 2 OS Split
**Files:**
- Modify: pps/app/app/(app)/[slug]/optical/components/optical-order-form.tsx
- Modify: pps/app/app/(app)/[slug]/optical/components/create-optical-order-sheet.tsx
- Modify: pps/app/lib/optical/optical-store.ts
- Test: pps/app/lib/optical/__tests__/order-splitting-and-stock.test.ts (new)

- [ ] **Step 1:** Rename headers: 'Aro 1 (Principal)' and 'Aro 2 / Dobro' (with 'Copiar Aro 1').
- [ ] **Step 2:** Add frame selection with stock display and auto-fill of code, brand, manufacturer, size, and price.
- [ ] **Step 3:** Add discount modality (R$ or %) for frames and lenses with 'Delegue ao Gerente' pop-up if discount exceeds allowed role limit.
- [ ] **Step 4:** Add lens filter by Type, IR, and description with auto-complete from catalog.
- [ ] **Step 5:** On submit, deduct stock by 1 for selected frames, and if hasAro2, automatically generate linked child OS (OS-XXX-B) for independent lab conference.
- [ ] **Step 6:** Include payment methods, residual calculation, and Invoice (NF) input field.

---

### Task 7: Automated Verification & Agent-Browser Visual Validation
- [ ] **Step 1:** Run un test apps/app/lib/optical/__tests__/.
- [ ] **Step 2:** Run un run --filter=app check-types.
- [ ] **Step 3:** Run gent-browser script to capture all updated screens:
  - Settings 5+5+1 grid with Discount Policies.
  - Seller cards with new horizontal distribution and manager auth modal.
  - Lab conference with pagination and edit icon.
  - Orders table with 4 clean action icons.
  - Order form with Aro 1/Aro 2, discount modality, and stock integration.
- [ ] **Step 4:** Commit and push to git origin/main.
- [ ] **Step 5:** Update walkthrough.md.
