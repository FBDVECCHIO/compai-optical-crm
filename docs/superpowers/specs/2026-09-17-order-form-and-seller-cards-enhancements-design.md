# Design Specification: Lançar OS Form, Seller Cards & TopNav Symmetrical Grid

**Date:** 2026-09-17
**System:** MNOC-X CRM Óptico
**Status:** Approved for Implementation

---

## 1. Context & Motivation

In previous iterations, the MNOC-X Optical CRM was enhanced with full optical management modules. User feedback identified three specific user experience and interface refinements required for optimal daily operation in optical retail stores:

1. **Lançar OS Form (Optical Order Entry)**:
   - **Issue:** The Laboratório, Lente, and Tratamento controls suffer from visual overlapping and layout clashes.
   - **Requirement:** Implement clean, non-colliding dropdown selectors for Laboratório, Lente, and Tratamento. Lenses and treatments must populate options directly from the registered lens catalog (fetchLensCatalog / TREATMENT_OPTIONS).
   - **Mirroring Requirement:** Mirror the complete technical product schema from the Lens Catalog (tipo, família, lente, IR, tecnologia, laboratório, preço) and Frame Catalog (tipo, marca, família, produto, fabricante, aro, ponte, preço, estoque) into the order form so the optician can see and adjust technical specifications when creating an order. Support single-pair mode, split-eye (OD/OE) mode, and secondary frame (Aro 2).

2. **Balcão & Vendas (Seller Performance Cards)**:
   - **Issue:** Inside Gestão de Metas por Vendedor, the seller performance cards use a rigid 3-column subgrid. In responsive multi-column layouts (4-5 cards per row), each column receives less than 65px, causing Meta Diária, Meta Semana, and Prêmio Semana plus their currency numbers to wrap awkwardly and overlap.
   - **Requirement:** Redesign the seller metrics subgrid using a cleaner 2-row layout: a top 2-column row for Meta Diária and Meta Semana, and a dedicated full-width bottom bar for Prêmio Semana featuring a trophy icon, qualification status, and currency value.

3. **Top Navigation Symmetry (5 + 5 + 1 Layout)**:
   - **Issue:** Row 1 had 5 items and Row 2 had 6 items, resulting in uneven button widths and visual asymmetry.
   - **Requirement:** Align 5 modules on the top row, 5 modules on the bottom row (both rows with identical equal widths), and position Configurações on the right docked across both rows (row-span-2), creating visual balance.

---

## 2. Technical Architecture & File Modifications

### 2.1 File Mapping
- apps/app/lib/optical/optical-types.ts:
  - Extend AroItem with optional mirrored lens technical fields (lensType, lensFamily, lensIndex, lensTech) and frame fields (frameType, frameFamily, frameManufacturer, frameAro, framePonte).
- apps/app/lib/optical/optical-store.ts:
  - Update sanitizeOrder to preserve all new technical lens and frame fields for aro1 and aro2.
- apps/app/app/(app)/[slug]/optical/components/optical-order-form.tsx:
  - Fetch both lensCatalog and frameCatalog on mount.
  - Implement full-width, clean dropdowns for Laboratório, Lente, Tratamento, Armação.
  - Auto-populate and display technical badges/inputs.
- apps/app/app/(app)/[slug]/optical/components/optical-sales-performance-view.tsx:
  - Replace the 3-column subgrid in seller performance cards with a structured 2-row layout.
- apps/app/app/(app)/[slug]/optical/components/optical-top-nav.tsx:
  - Top Row (5 items), Bottom Row (5 items), Right Anchor (Configurações spanning 2 rows).
