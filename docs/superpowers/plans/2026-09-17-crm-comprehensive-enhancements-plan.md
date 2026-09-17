# MNOC-X CRM Comprehensive Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 11 major UI, business logic, fiscal, and persistence enhancements across MNOC-X CRM, optimizing density, navigation, data integrity, and compliance.

**Architecture:** Enhances Next.js React 19 components with dense responsive grid layouts, modular validation helpers (`doctor-validation.ts`), fiscal data models (`FiscalInfo`), immediate Supabase persistence in the optical store, client-side CSV template generators and parsers with origin tagging, and compact tabular views with pagination.

**Tech Stack:** Next.js 16.3, React 19, Tailwind CSS 4, shadcn/ui, Bun test runner, Supabase client, Vercel Labs agent-browser CLI.

**Spec:** `docs/superpowers/specs/2026-09-17-crm-comprehensive-enhancements-design.md`

## Global Constraints
- Do not introduce TypeScript errors (`bun run --filter=app check-types` must pass with 0 errors).
- All unit tests must pass (`bun test`).
- Maintain dark/light mode compatibility and accessible ARIA labels.
- Do not truncate buttons or text in navigation or tables.
- All table information and column headers must be left-aligned (`text-left`).

---

### Task 1: Doctor Validation Engine & Anti-Duplication Module

**Files:**
- Create: `apps/app/lib/optical/doctor-validation.ts`
- Test: `apps/app/lib/optical/__tests__/doctor-validation.test.ts`

**Interfaces:**
- Consumes: `DoctorItem` from `apps/app/lib/optical/supabase-optical.ts`
- Produces: `validateDoctorCrm(crm: string): { isValid: boolean; error?: string; formattedCrm?: string }`, `isDoctorDuplicate(newDoc: { nome: string; crm: string }, existingDocs: DoctorItem[]): { isDuplicate: boolean; reason?: string }`

- [ ] **Step 1: Write the failing test**
Create `apps/app/lib/optical/__tests__/doctor-validation.test.ts` testing CRM format, dummy patterns (`000`, `1111`, `123456`), name normalization, and duplicate detection.

- [ ] **Step 2: Run test to verify it fails**
Run: `bun test apps/app/lib/optical/__tests__/doctor-validation.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement minimal code in `doctor-validation.ts`**
Implement regex validation, Brazilian UF check, dummy blacklist, and accent-insensitive name normalization.

- [ ] **Step 4: Run test to verify it passes**
Run: `bun test apps/app/lib/optical/__tests__/doctor-validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
Run: `git add apps/app/lib/optical/doctor-validation.ts apps/app/lib/optical/__tests__/doctor-validation.test.ts && git commit -m "feat(medical): add doctor CRM validation and anti-duplication engine"`

---

### Task 2: Doctor Registration Modal & Anti-Duplication in UI

**Files:**
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-medical-view.tsx`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-settings-view.tsx`
- Modify: `apps/app/lib/optical/supabase-optical.ts`

**Interfaces:**
- Consumes: `validateDoctorCrm` and `isDoctorDuplicate` from `doctor-validation.ts`
- Produces: Interactive "Novo Médico" modal with real-time feedback, dummy rejection, and duplicate block in both Medical view and Settings view.

- [ ] **Step 1: Implement doctor creation modal in `optical-medical-view.tsx`**
Add "Novo Médico" button in header, CRM format validation, duplicate checking against existing doctors, and toast alerts.

- [ ] **Step 2: Update `optical-settings-view.tsx` doctor creation**
Apply the same validation and anti-duplication logic in the settings tab.

- [ ] **Step 3: Verify TypeScript and functional behavior**
Run: `bun run --filter=app check-types`
Expected: 0 errors.

- [ ] **Step 4: Commit**
Run: `git add apps/app/app/(app)/[slug]/optical/components/optical-medical-view.tsx apps/app/app/(app)/[slug]/optical/components/optical-settings-view.tsx apps/app/lib/optical/supabase-optical.ts && git commit -m "feat(medical): integrate doctor anti-duplication modal in medical and settings views"`

---

### Task 3: TopNav Simplification & Settings Submenu Reorganization

**Files:**
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-top-nav.tsx`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-settings-view.tsx`
- Modify: `apps/app/app/(app)/[slug]/optical/optical-client-view.tsx`

**Interfaces:**
- Consumes: `OpticalModuleTab`
- Produces: Streamlined 11-item TopNav (with `garantias` removed from top level, retaining access within `conferencia`), and balanced settings submenu with matching `h-11` button widths.

- [ ] **Step 1: Remove `garantias` from `optical-top-nav.tsx` and rebalance grid**
Reorganize navItems into 2 balanced rows: Row 1 with 5 operational items, Row 2 with 6 administrative items.

- [ ] **Step 2: Update `optical-settings-view.tsx` sub-tabs**
Reorganize the 11 database settings buttons into two balanced rows with `h-11` and generous padding, matching the top nav design.

- [ ] **Step 3: Update `optical-client-view.tsx` default tab handling**
Ensure permission redirects route cleanly without orphan references.

- [ ] **Step 4: Verify type safety**
Run: `bun run --filter=app check-types`
Expected: 0 errors.

- [ ] **Step 5: Commit**
Run: `git add apps/app/app/(app)/[slug]/optical/components/optical-top-nav.tsx apps/app/app/(app)/[slug]/optical/components/optical-settings-view.tsx apps/app/app/(app)/[slug]/optical/optical-client-view.tsx && git commit -m "feat(nav): streamline top nav to 11 items and rebalance settings submenu"`

---

### Task 4: Balcão & Vendas Layout Optimization & Seller Goal Density

**Files:**
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-sales-performance-view.tsx`

**Interfaces:**
- Consumes: `SpeedometerGauge`, `orders`, `sellerGoals`
- Produces: Merged Master Row (Master Gauge alongside the 4 Consolidated Performance cards stacked vertically/in 2x2 grid); title changed to "Gestão de Metas por Vendedor"; dense seller cards grid (`grid-cols-2 md:grid-cols-3 xl:grid-cols-4`).

- [ ] **Step 1: Merge Consolidated Performance cards vertically next to Master Gauge**
Eliminate the redundant upper section; position the 4 KPI cards directly to the right of the Master Speedometer.

- [ ] **Step 2: Update section title**
Rename "Gestão de Metas por Vendedor • Velocímetro Power BI" to "Gestão de Metas por Vendedor".

- [ ] **Step 3: Optimize Seller Goal cards grid**
Change from `grid-cols-1 lg:grid-cols-2` to `grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`, compacting card padding to `p-3`, sizing gauge appropriately, and organizing metrics neatly.

- [ ] **Step 4: Verify type check**
Run: `bun run --filter=app check-types`
Expected: 0 errors.

- [ ] **Step 5: Commit**
Run: `git add apps/app/app/(app)/[slug]/optical/components/optical-sales-performance-view.tsx && git commit -m "feat(sales): optimize balcao layout with vertical consolidated metrics and dense seller grid"`

---

### Task 5: OS Orders Table Line Optimization, Pagination & Left-Alignment

**Files:**
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-orders-table.tsx`

**Interfaces:**
- Consumes: `useOpticalOrders`, `OpticalOrder`
- Produces: Clean table without line wrapping or truncation, left-aligned headers and data, and standardized 10/20/50 pagination.

- [ ] **Step 1: Left-align headers and cells**
Change `Financeiro` and `Ações` from `text-right` to `text-left`, aligning all column headers and cells to the left.

- [ ] **Step 2: Add `whitespace-nowrap` and clean column min-widths**
Ensure no text overlap or ugly word wraps on order numbers, client names, lenses, or financial amounts.

- [ ] **Step 3: Verify pagination breaks (10, 20, 50)**
Ensure pagination dropdown and page indicators work flawlessly.

- [ ] **Step 4: Verify type check**
Run: `bun run --filter=app check-types`
Expected: 0 errors.

- [ ] **Step 5: Commit**
Run: `git add apps/app/app/(app)/[slug]/optical/components/optical-orders-table.tsx && git commit -m "feat(orders): left-align optical orders table, prevent line wrapping and enforce pagination"`

---

### Task 6: Fiscal & Accounting Module (NFC-e / NF-e)

**Files:**
- Modify: `apps/app/lib/optical/optical-types.ts`
- Create: `apps/app/lib/optical/fiscal-service.ts`
- Test: `apps/app/lib/optical/__tests__/fiscal-service.test.ts`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-order-detail-sheet.tsx`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-sales-performance-view.tsx`

**Interfaces:**
- Consumes: `OpticalOrder`
- Produces: `emitNfce(order: OpticalOrder): OpticalOrder`, `emitNfe(order: OpticalOrder): OpticalOrder`, `calculateFiscalTaxes(amount: number, cfop: string)`, `exportMonthlyAccountingBatch(orders: OpticalOrder[]): string`

- [ ] **Step 1: Write the failing test for fiscal service**
Test CFOP calculation, 44-digit access key generation, tax breakdown (ICMS, PIS, COFINS), and monthly export generation.

- [ ] **Step 2: Run test to verify it fails**
Run: `bun test apps/app/lib/optical/__tests__/fiscal-service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement fiscal service and types**
Implement `fiscal-service.ts` with SEFAZ simulation, tax rules, and accounting CSV/XML export.

- [ ] **Step 4: Run test to verify it passes**
Run: `bun test apps/app/lib/optical/__tests__/fiscal-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Add Fiscal Actions & Badges to Order Detail Sheet and Sales Performance View**
Add "Emitir NFC-e (Balcão)" and "Emitir NF-e (Reembolso)" buttons, SEFAZ key display, and "Exportar Pacote Contábil Mensal" button.

- [ ] **Step 6: Commit**
Run: `git add apps/app/lib/optical/fiscal-service.ts apps/app/lib/optical/__tests__/fiscal-service.test.ts apps/app/lib/optical/optical-types.ts apps/app/app/(app)/[slug]/optical/components/optical-order-detail-sheet.tsx apps/app/app/(app)/[slug]/optical/components/optical-sales-performance-view.tsx && git commit -m "feat(fiscal): add NFC-e/NF-e engine, tax calculation and accounting export"`

---

### Task 7: Batch Spreadsheet Import & Origin Tagging (Peças & Lentes)

**Files:**
- Modify: `apps/app/lib/optical/optical-types.ts`
- Modify: `apps/app/lib/optical/supabase-optical.ts`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-frames-catalog-view.tsx`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-lens-catalog-view.tsx`

**Interfaces:**
- Consumes: `FrameCatalogItem`, `LensCatalogItem`
- Produces: Direct "Baixar Planilha Modelo" and "Subir Planilha (.csv)" buttons with file upload, parser, preview, and `origem: "PLANILHA"` vs `"SISTEMA"` badges.

- [ ] **Step 1: Add `origem` field to catalog types**
Update `FrameCatalogItem` and `LensCatalogItem` with `origem?: "PLANILHA" | "SISTEMA"`.

- [ ] **Step 2: Enhance `optical-frames-catalog-view.tsx` with top-level CSV buttons**
Add download template button, file upload button (`<input type="file" accept=".csv" />`), origin tagging on import, and origin badge.

- [ ] **Step 3: Enhance `optical-lens-catalog-view.tsx` with top-level CSV buttons**
Add download template button, file upload button, origin tagging on import, and origin badge.

- [ ] **Step 4: Verify type check**
Run: `bun run --filter=app check-types`
Expected: 0 errors.

- [ ] **Step 5: Commit**
Run: `git add apps/app/lib/optical/optical-types.ts apps/app/lib/optical/supabase-optical.ts apps/app/app/(app)/[slug]/optical/components/optical-frames-catalog-view.tsx apps/app/app/(app)/[slug]/optical/components/optical-lens-catalog-view.tsx && git commit -m "feat(catalog): add spreadsheet template download, CSV upload and origin tracking"`

---

### Task 8: Peças & Solares Compact Tabular List View with Square Thumbnails

**Files:**
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-frames-catalog-view.tsx`

**Interfaces:**
- Consumes: `FrameCatalogItem[]`
- Produces: Compact list view with 36x36px square thumbnails, ~44px row height, left-aligned columns, pagination (10/20/50), and view mode toggle.

- [ ] **Step 1: Implement compact table component**
Create table with square thumbnails (36x36px), left-aligned headers and cells, status badges, and origin tags.

- [ ] **Step 2: Add pagination (10 / 20 / 50)**
Integrate pagination controls identical to `optical-orders-table.tsx`.

- [ ] **Step 3: Set "Lista Compacta" as default with optional toggle to cards**
Provide mode switcher with default set to compact list.

- [ ] **Step 4: Verify type check**
Run: `bun run --filter=app check-types`
Expected: 0 errors.

- [ ] **Step 5: Commit**
Run: `git add apps/app/app/(app)/[slug]/optical/components/optical-frames-catalog-view.tsx && git commit -m "feat(frames): add compact list view with square thumbnails and pagination"`

---

### Task 9: OS Journey Kanban Persistence & Interactive Drag-and-Drop

**Files:**
- Modify: `apps/app/lib/optical/optical-store.ts`
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-kanban.tsx`
- Test: `apps/app/lib/optical/__tests__/kanban-persistence.test.ts`

**Interfaces:**
- Consumes: `useOpticalOrders`
- Produces: Fully persistent status updates via `saveOrderToSupabase`, HTML5 drag-and-drop between columns, quick stage move menu, and persistence test.

- [ ] **Step 1: Write persistence unit test**
Create `apps/app/lib/optical/__tests__/kanban-persistence.test.ts` verifying that `updateOrderStatus` updates state, timestamps (`readyAt`, `deliveredAt`), and triggers the persistence layer.

- [ ] **Step 2: Fix `updateOrderStatus` in `optical-store.ts` to call `saveOrderToSupabase`**
Ensure every status change invokes `saveOrderToSupabase(updatedOrder)`.

- [ ] **Step 3: Add interactive Drag-and-Drop and quick move to `optical-kanban.tsx`**
Implement `draggable`, `onDragStart`, `onDragOver`, and `onDrop`, plus a quick "Mover para etapa..." dropdown.

- [ ] **Step 4: Run tests**
Run: `bun test apps/app/lib/optical/__tests__/kanban-persistence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
Run: `git add apps/app/lib/optical/optical-store.ts apps/app/app/(app)/[slug]/optical/components/optical-kanban.tsx apps/app/lib/optical/__tests__/kanban-persistence.test.ts && git commit -m "feat(kanban): ensure immediate database persistence and interactive drag-and-drop"`

---

### Task 10: End-to-End Visual Verification with Agent-Browser

**Files:**
- Test via CLI: `agent-browser`

- [ ] **Step 1: Start Next.js dev server or verify build**
Run: `bun run --filter=app build` to verify 100% production compilation.

- [ ] **Step 2: Run agent-browser navigation and capture screenshots**
- Screenshot 1: Balcão & Vendas (vertical consolidated cards next to gauge, dense seller cards).
- Screenshot 2: Peças & Solares compact list view with square thumbnails and origin badges.
- Screenshot 3: Doctor Registration modal with anti-duplication alert.
- Screenshot 4: Settings submenu with uniform button widths.

- [ ] **Step 3: Save screenshots to brain artifacts directory**
Copy captured screenshots to artifacts directory.

- [ ] **Step 4: Commit and Push**
Run: `git push origin main`

- [ ] **Step 5: Update `walkthrough.md`**
Document all completed enhancements and embed screenshots.
