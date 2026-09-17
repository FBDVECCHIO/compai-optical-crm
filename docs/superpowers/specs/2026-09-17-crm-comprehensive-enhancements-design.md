# Design Spec: MNOC-X CRM Comprehensive Enhancements

**Date:** 2026-09-17  
**Author:** Antigravity AI Engineering Team  
**Scope:** 11 Comprehensive UX, Business Logic, and Architectural Enhancements

---

## 1. Executive Summary & Goals

This specification formalizes the 11 improvements requested for the MNOC-X Optical CRM application:

1. **Balcão & Vendas Layout:** Reposition the 4 Consolidated Performance metrics vertically alongside the Team Goal Meter; remove "Velocímetro Power BI" from the section title.
2. **Seller Goal Cards Grid Density:** Re-layout seller cards into a dense, multi-column grid (`grid-cols-2 md:grid-cols-3 xl:grid-cols-4`) to fit maximum sellers horizontally and vertically without wasted vertical space.
3. **OS Orders Table Line Optimization:** Eliminate text wrapping, overlapping, and truncated lines in `optical-orders-table.tsx` with clean tabular padding and `whitespace-nowrap`.
4. **TopNav Simplification:** Remove the redundant `Garantias & Ocorrências` menu (already integrated inside `Conferência Lab`) and rebalance the top navigation into clean, uniform rows.
5. **Doctor Registration & CRM Anti-Duplication:** Prevent duplicate doctor registrations by normalized name or CRM; reject generic dummy patterns (e.g. `000`, `1111`, sequential `123456`); validate format against standard CRM schema (`\d{4,8}\/[A-Z]{2}`); simulate active CFM registry lookup.
6. **Fiscal & Accounting (NFC-e / NF-e):** Implement optical tax data models, CFOPs (`5.102`, `5.405`, `5.933`), fiscal emission state machine (`PENDENTE`, `EMITIDA_NFCE`, `EMITIDA_NFE`, `CANCELADA`), 44-digit access key generator, and monthly accounting batch export (XML/CSV).
7. **Batch Spreadsheet Import & Data Origin:** Provide direct "Baixar Modelo" and "Subir Planilha (.csv)" buttons for both *Peças & Solares* and *Lentes*, tagging each item with `origem: "PLANILHA"` vs `origem: "SISTEMA"`.
8. **OS Journey Kanban Persistence:** Verify that column transitions update Supabase immediately (`saveOrderToSupabase`); add interactive drag-and-drop and column change controls to `optical-kanban.tsx`.
9. **Global Pagination & Left-Alignment:** Standardize 10/20/50 page size breaks across all lists and left-align all table cells with their respective headers.
10. **Peças & Solares List View:** Replace oversized photo cards with a compact tabular list with square thumbnails (36x36px), cutting row height to ~44px so that many pieces fit on screen.
11. **Settings Submenu UI Reorganization:** Match the database settings navigation buttons to the exact height, padding, and balanced grid layout of the top navigation, preventing clipped text.

---

## 2. Component Architecture & Data Models

### 2.1 Fiscal & Accounting Model (`optical-types.ts`)
```typescript
export type FiscalStatus = "PENDENTE" | "EMITIDA_NFCE" | "EMITIDA_NFE" | "CANCELADA" | "CONTINGENCIA";

export interface FiscalInfo {
  status: FiscalStatus;
  cfop: "5.102" | "5.405" | "5.933";
  accessKey?: string; // 44 digits
  invoiceNumber?: string;
  series?: string;
  issuedAt?: string;
  xmlUrl?: string;
  icmsBase: number;
  icmsValue: number;
  pisValue: number;
  cofinsValue: number;
}
```

### 2.2 Doctor Validation Engine (`optical-doctor-validation.ts`)
- **Normalized CRM:** Strip non-alphanumeric, uppercase, enforce `^\d{4,8}\/[A-Z]{2}$`.
- **Dummy Blacklist:**
  - Repeated single digits: `000`, `1111`, `99999`, etc.
  - Trivial sequences: `1234`, `12345`, `123456`.
  - Invalid UFs: must belong to the 27 Brazilian federative units.
- **Name Normalization:** Strips accents, punctuation, Dr./Dra. prefixes, lowercases, compares via Levenshtein / token set matching.
- **CFM Registry Simulation:** Validates that the CRM is active in the state's CRM board and provides primary specialty (Oftalmologia).

### 2.3 Peças & Lentes Data Origin (`optical-types.ts`)
```typescript
export type CatalogItemOrigin = "PLANILHA" | "SISTEMA";
```
Every `FrameCatalogItem` and `LensCatalogItem` gains `origem?: CatalogItemOrigin`.

---

## 3. UI/UX Specifications

### 3.1 Balcão & Vendas (`optical-sales-performance-view.tsx`)
- **Master Row:** Left/Center = `SpeedometerGauge` (Master Team Gauge); Right = 4 Consolidated Cards stacked in a compact 2x2 or vertical grid:
  1. Faturamento do Mês
  2. Meta Diária Necessária
  3. Tíquete Médio / OSs
  4. Saldo Residual a Receber
- **Section Title:** `"Gestão de Metas por Vendedor"` (without `• Velocímetro Power BI`).
- **Seller Cards Grid:** `grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5` with compact `p-3` padding, mini gauge (`size="xs"` or `"sm"`), and clean metric pills.

### 3.2 TopNav & Settings Submenu
- **TopNav (`optical-top-nav.tsx`):** 11 items. Row 1: 5 items (`balcao`, `jornada_os`, `pos_venda`, `mensagens`, `conferencia`). Row 2: 6 items (`lentes`, `pecas`, `medicos`, `visita_medica`, `resumo`, `config`).
- **Settings Submenu (`optical-settings-view.tsx`):** Two balanced rows matching TopNav styling: Row 1: 6 buttons, Row 2: 5 buttons, `h-11` height, zero truncated text.

### 3.3 Peças & Solares Compact View (`optical-frames-catalog-view.tsx`)
- Standard Table View with:
  - Thumbnail: 36x36px `rounded-md object-cover border`
  - Columns: Foto, Modelo/Código, Marca & Família, Tipo (Badge), Aro/Ponte, Preço de Venda, Estoque, Origem (Badge `Planilha`/`Sistema`), Ações
  - Pagination: 10 / 20 / 50 per page
  - Left-aligned header and cells

---

## 4. Verification & Testing Strategy
1. **Automated Unit Tests:**
   - Doctor CRM & Anti-Duplication validator test suite (`doctor-validation.test.ts`).
   - Kanban status transition & persistence test suite (`kanban-persistence.test.ts`).
   - Batch import parser test suite (`batch-import.test.ts`).
2. **Type Check:** `bun run --filter=app check-types` (0 errors).
3. **Frontend Visual Validation:** Vercel Labs `agent-browser` taking screenshots of Balcão, Peças table, Doctor modal, and Settings submenu.
