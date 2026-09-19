# Spec: MNOC-X CRM Deep Improvements — Workflow, Governance, Stock & Order Splitting

**Date:** 2026-09-19  
**Status:** Approved (Autonomous mandate by user)  
**Author:** Antigravity Engineering

---

## 1. Executive Summary & Goals

This specification formalizes deep operational enhancements for MNOC-X Optical CRM across 7 pillars:
1. **Sales Performance & Goals (Balcão & Vendas)**:
   - Restrict seller goal/award edits behind manager authorization with audit logging.
   - Fluid responsive redesign of seller cards to maximize horizontal screen real estate.
   - Remove the deprecated 'Barra Compacta' gauge toggle, standardizing on the Power BI Speedometer.
2. **Lab Conference (Conferência Lab)**:
   - Add responsive pagination (10/20/50 rows per page with page controls and counters).
   - Add inline Edit action (pencil icon) to modify conference lab records.
3. **OS Journey Kanban (Jornada da OS)**:
   - Fix card stage transition bug caused by alias mismatch (PEDIDO, MONTAGEM, CONFERIDO, LOJA vs canonical EM_LABORATORIO, EM_MONTAGEM, CONFERIDA, PRONTA_LOJA).
   - Enhance HTML5 drag-and-drop resilience by ensuring fallback to React state draggedOrderId.
4. **Settings Grid Symmetry & Discount Governance**:
   - Organize Settings subnavigation in a 5 + 5 + 1 symmetrical layout matching the main TopNav:
     - Row 1 (5): Lojas, Labs, Vendedores, Médicos & Clínicas, Comissões.
     - Row 2 (5): Políticas de Desconto, Tolerâncias ISO, Tabelas Apoio, Usuários, Log de Vendas.
     - Right Dock (1): Banco & Integridade spanning both rows (ow-span-2).
   - Implement Discount Policy module with role-based maximum discount percentages segmented by brand/lab (e.g. Vendedor 10%, Gerente 20%, Admin 100%).
5. **Order Form (Lançar OS) — Logical Flow, Stock Deductions & Discount Delegation**:
   - Update terminology: 'Aro 1 (Principal)' and 'Aro 2 / Dobro' (with 'Copiar Aro 1').
   - Frame selection directly linked to registered stock (FRAME_CATALOG / Supabase), displaying code, brand, manufacturer, aro/ponte size, price, and available inventory.
   - Discount Modality selector: R$ (absolute) or % (percentage) on frames and lenses.
   - Manager Delegation Pop-up ('Delegue ao Gerente') when a discount exceeds user role limits, allowing instantaneous manager approval.
   - Filterable Lens Selection by Type, Refraction Index (IR), and free text description, auto-populating lens technical catalog data.
   - Automatic split of Aro 2 into an independent linked Order of Service (OS-XXXX-B) upon launch for independent laboratory tracking.
   - Automatic inventory deduction (stock count -1) for sold frames and sunglasses upon order finalization.
   - Order sequential flow: Patient & Doctor -> Aro 1 -> Aro 2 -> Diopters -> Financials/Payment -> Invoice (NF) -> Finalize & Deduct Stock.
6. **Orders Table Actions Cleanup**:
   - Simplify actions column to 4 distinct icons: Edit, WhatsApp, View Details & Diopters (Magnifying Glass), Mark as Delivered (Checkmark).
   - Remove 'Marcar como Pedido Rápido na Loja'.

---

## 2. Architectural Design

### 2.1. Store Status Standardization (optical-types.ts & optical-store.ts)
- Canonical statuses: DIGITADA, EM_LABORATORIO, EM_MONTAGEM, CONFERIDA, PRONTA_LOJA, ENTREGUE, CANCELADA.
- Normalizer converts PEDIDO -> EM_LABORATORIO, MONTAGEM -> EM_MONTAGEM, CONFERIDO -> CONFERIDA, LOJA -> PRONTA_LOJA.
- sanitizeOrder accepts both canonical and aliases without reverting to DIGITADA.

### 2.2. Discount Policy Schema & Validation
`	s
export interface DiscountPolicy {
  id: string;
  role: 'VENDEDOR' | 'GERENTE' | 'ADMIN';
  brandOrLab: string; // 'TODOS' or specific brand/lab
  maxDiscountPct: number;
  active: boolean;
}
`

### 2.3. Stock Management & OS Splitting
- On order save, if hasAro2 is active, create parent OS (OS-XXX-A) and child OS (OS-XXX-B).
- Stock is decremented in FRAME_CATALOG for chosen items.
