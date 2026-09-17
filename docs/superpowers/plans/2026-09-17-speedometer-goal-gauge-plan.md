# Velocímetro de Metas Estilo Power BI - Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o indicador linear de metas por um componente de velocímetro radial estilo Power BI (Gauge Chart) com agulha animada, linha de alvo (target pace), zonas de performance e mostrador digital central.

**Architecture:** Módulo matemático puro em TypeScript para cálculos de arcos SVG e coordenadas polares (`speedometer-math.ts`), componente React reutilizável em SVG puro vetorial (`speedometer-gauge.tsx`), integração no painel comercial do CRM (`optical-sales-performance-view.tsx`) com visão consolidada e individual.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Lucide/Carbon Icons, Bun Test, SVG Nativo.

**Spec:** `docs/superpowers/specs/2026-09-17-speedometer-goal-gauge-design.md`

## Global Constraints
- Pure SVG rendering without external heavy chart libraries.
- Dark mode (`zinc-900`/`zinc-800`) and Light mode (`white`/`zinc-100`) full support.
- Zero TypeScript errors (`tsc --noEmit` must pass with exit code 0).
- Fully accessible with ARIA meter attributes (`role="meter"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).

---

### Task 1: Módulo Matemático do Velocímetro (`speedometer-math.ts`) e Testes

**Files:**
- Create: `apps/app/app/(app)/[slug]/optical/components/speedometer-math.ts`
- Test: `apps/app/app/(app)/[slug]/optical/components/__tests__/speedometer-math.test.ts`

**Interfaces:**
- Produces:
  - `polarToCartesian(cx: number, cy: number, r: number, angleDegrees: number): { x: number; y: number }`
  - `describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string`
  - `valueToAngle(value: number, min: number, max: number, startAngle?: number, endAngle?: number): number`
  - `calculatePaceStatus(realizado: number, esperadoHoje: number): "AHEAD" | "ON_TRACK" | "BEHIND"`
  - `generateTicks(min: number, max: number, count?: number): Array<{ value: number; angle: number; label: string; isTarget?: boolean }>`

- [ ] **Step 1: Escrever testes unitários em `speedometer-math.test.ts`**
- [ ] **Step 2: Rodar `bun test` e verificar que os testes falham**
- [ ] **Step 3: Implementar `speedometer-math.ts`**
- [ ] **Step 4: Rodar `bun test` e verificar 100% de aprovação**
- [ ] **Step 5: Commit do módulo matemático**

---

### Task 2: Componente React do Velocímetro SVG (`speedometer-gauge.tsx`)

**Files:**
- Create: `apps/app/app/(app)/[slug]/optical/components/speedometer-gauge.tsx`

**Interfaces:**
- Consumes: `speedometer-math.ts`
- Produces:
  - `SpeedometerGauge(props: SpeedometerGaugeProps): React.JSX.Element`

- [ ] **Step 1: Implementar o componente `SpeedometerGauge`**
  - Arco base (background track).
  - Arco preenchido colorido com gradiente/cor baseada no ritmo (Verde se à frente, Azul se no ritmo, Vermelho se abaixo).
  - Marcador de Alvo (Target Line) estilo Power BI indicando a meta esperada até hoje.
  - Agulha esportiva com ponteiro afilado e pivô central com anel metálico.
  - Ticks graduados ao redor do arco.
  - Mostrador digital central com valor formatado, percentual de atingimento e badge de status.
- [ ] **Step 2: Suporte a tamanhos `"sm"` e `"lg"` com responsividade**
- [ ] **Step 3: Commit do componente `speedometer-gauge.tsx`**

---

### Task 3: Integração no Painel Comercial (`optical-sales-performance-view.tsx`)

**Files:**
- Modify: `apps/app/app/(app)/[slug]/optical/components/optical-sales-performance-view.tsx`

**Interfaces:**
- Consumes: `SpeedometerGauge`

- [ ] **Step 1: Adicionar Velocímetro Consolidado Geral da Loja/Rede no topo da Seção 3**
- [ ] **Step 2: Atualizar os cards individuais de vendedor com o Velocímetro Power BI**
- [ ] **Step 3: Adicionar seletor/toggle de modo de exibição (Velocímetro vs Barra)**
- [ ] **Step 4: Commit das alterações de visualização comercial**

---

### Task 4: Verificação Automatizada (Testes + Typecheck)

- [ ] **Step 1: Executar `bun test` e validar que todos os testes passam**
- [ ] **Step 2: Executar `tsc --noEmit` em `apps/app` e garantir zero erros de tipagem**
- [ ] **Step 3: Commit de eventuais ajustes**

---

### Task 5: Validação Visual no Frontend com `agent-browser`

- [ ] **Step 1: Subir ou verificar execução do Next.js**
- [ ] **Step 2: Usar `agent-browser open` e navegar até a tela do CRM**
- [ ] **Step 3: Tirar screenshot com `agent-browser screenshot` do velocímetro renderizado**
- [ ] **Step 4: Confirmar conformidade visual do velocímetro e finalizar walkthrough**
