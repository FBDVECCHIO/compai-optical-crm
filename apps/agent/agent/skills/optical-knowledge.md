# MNOC-X Optical Knowledge & Domain Intelligence Skill

This document is the authoritative domain knowledge base for the MNOC-X Optical AI Agent.
It empowers the agent to assist opticians, sales reps, lab managers, and customers with high-precision optical reasoning.

---

## 1. Dicionário Técnico & Termos Fundamentais de Óptica

### DNP (Distância Naso-Pupilar) & DP (Distância Pupilar)
- **Definição**: A DP é a distância total entre os centros das pupilas (em mm). A DNP é a medida monocular do centro da pupila até o centro da ponte nasal (ex: OD 31mm, OE 32mm).
- **Importância Crítica**: A DNP monocular deve ser sempre utilizada na montagem. Erros de montagem da DNP introduzem efeito prismático indesejado segundo a Regra de Prentice, causando cefaleia, astenopia (cansaço visual) e visão dupla.

### Altura de Montagem (Alt)
- **Definição**: Medida vertical em milímetros partindo do reflexo pupilar até a borda inferior interna do aro da armação.
- **Aplicação**: Essencial em lentes multifocais e ocupacionais. Uma altura montada muito alta força o usuário a levantar a cabeça para enxergar longe; muito baixa corta o campo de leitura de perto.

### Centro Óptico (CO)
- O ponto na lente oftálmica pelo qual a luz passa sem sofrer desvio angular. O centro óptico da lente deve coincidir rigorosamente com o centro da pupila do paciente.

### Cilindro (Positivo vs Negativo) & Transposição
- **Convenções**: Oftalmologistas e a indústria de lentes oftálmicas utilizam a notação de **Cilindro Negativo** (`-`). Alguns optometristas utilizam **Cilindro Positivo** (`+`).
- **Fórmula de Transposição**:
  1. Novo Esférico = Esférico Atual + Cilíndrico Atual.
  2. Novo Cilíndrico = Inverter o sinal do Cilíndrico (de `+` para `-` ou vice-versa).
  3. Novo Eixo = Se o eixo for $\le 90^\circ$, somar $90^\circ$. Se for $> 90^\circ$, subtrair $90^\circ$.
  *Exemplo*: `+2.00 -1.50 x 30°` transpõe para `+0.50 +1.50 x 120°`.

### Adição (Add)
- Dioptria esférica positiva adicionada ao grau de longe para permitir foco nítido na distância de leitura (perto ~40cm ou intermediário ~60cm-1m).
- Faixa típica: de `+1.00` a `+3.50`, aumentando com a idade do paciente.

### Prisma & Regra de Prentice
- $\Delta = c \times D$
  - $\Delta$ = dioptrias prismáticas induzidas.
  - $c$ = descentração em centímetros (mm / 10).
  - $D$ = poder dióptrico da lente no meridiano considerado.
- Lentes com dioptrias elevadas toleram margens de erro muito menores na montagem.

### Ângulo Pantoscópico, Facial e Distância Vértice
- **Ângulo Pantoscópico**: Inclinação vertical do plano da lente em relação à vertical (ideal: $8^\circ$ a $12^\circ$).
- **Ângulo Facial (Curvatura do Aro)**: Curvatura horizontal da armação contornando o rosto (ideal: $4^\circ$ a $6^\circ$).
- **Distância Vértice (DV)**: Distância da face posterior da lente ao ápice da córnea (padrão: $12\text{ mm}$ a $14\text{ mm}$). Lentes com grau alto sofrem variação de poder efetivo se a DV mudar.

---

## 2. Óptica Básica & Física dos Materiais de Lentes

### Índices de Refração (IR) e Recomendações
1. **1.50 (CR-39 / Resina Básica / Orma)**:
   - Número de Abbe: ~58 (altíssima pureza óptica, quase sem dispersão cromática).
   - Indicação: Graus baixos (entre `-2.00` e `+2.00`).
   - Restrição: Frágil para armações parafusadas (três peças) ou fio de nylon.
2. **1.59 (Policarbonato / Airwear)**:
   - Número de Abbe: ~30.
   - Vantagens: Altíssima resistência mecânica a impacto, 20-25% mais fino que 1.50, proteção UV nativa.
   - Indicação: Armações esportivas, crianças, aros de nylon e parafusados. Graus moderados (até `±4.00`).
3. **1.53 (Trivex)**:
   - Número de Abbe: ~45 (excelente nitidez e contraste).
   - Vantagens: Levíssimo (densidade 1.11 g/cm³), ultra resistente a tracionamento e solventes. Perfeito para armações furadas/parafusadas.
4. **1.67 (Resina de Alto Índice)**:
   - Número de Abbe: ~32.
   - Vantagens: 35-40% mais fina que CR-39. Essencial para miopias de `-4.00` a `-7.00` ou hipermetropias altas.
5. **1.74 (Resina de Ultra Alto Índice)**:
   - Número de Abbe: ~33.
   - Vantagens: Máxima redução de espessura de borda para miopias severas (`-6.00` a `-14.00`). Lentes extremamente estéticas e planas.

### Número de Abbe
- Quantifica a dispersão cromática do material óptico. Quanto maior o Abbe, menor o arco-íris/franja colorida vista nas bordas da lente. Materiais com Abbe $\ge 40$ oferecem máximo conforto visual periférico.

---

## 3. Fisiologia Ocular & Erros Refrativos

1. **Miopia**:
   - Olho axialmente longo ou poder refrativo excessivo da córnea/cristalino. O foco ocorre antes da retina.
   - Sintoma: Visão embaçada para longe; boa visão para perto.
   - Lente corretiva: Côncava/Divergente (esférico negativo). Borda mais grossa que o centro.
2. **Hipermetropia**:
   - Olho axialmente curto ou poder refrativo insuficiente. O foco ocorre atrás da retina.
   - Sintoma: Cansaço na leitura, cefaleia frontal, esforço acomodativo constante.
   - Lente corretiva: Convexa/Convergente (esférico positivo). Centro mais espesso que as bordas.
3. **Astigmatismo**:
   - Córnea ou cristalino com curvaturas desiguais nos meridianos ortogonais (tórica).
   - Sintoma: Distorção de formas, sombras em letras, dificuldade tanto de perto quanto de longe.
   - Lente corretiva: Cilíndrica/Tórica com eixo de 1° a 180°.
   - *Com a regra*: Meridiano vertical mais curvo (eixo do cilindro negativo próximo a 180°).
   - *Contra a regra*: Meridiano horizontal mais curvo (eixo do cilindro negativo próximo a 90°).
4. **Presbiopia ("Vista Cansada")**:
   - Esclerose natural do cristalino e perda de contratilidade do músculo ciliar a partir dos 40 anos.
   - Sintoma: Afastar braços para conseguir ler o celular ou bulas.
   - Lente corretiva: Multifocal progressiva (com campo de longe, intermediário e perto) ou Ocupacional.

---

## 4. Diretrizes de Pós-Venda MNOC-X

- **Pós 7 Dias (Adaptação Inicial)**: Verificar adaptação na locomoção, escadas e leitura. Em multifocais novos, orientar a mover a cabeça na direção do objeto.
- **Pós 30 Dias (Satisfação)**: Avaliar conforto prolongado no trabalho/telas e a facilidade de limpeza do antirreflexo.
- **Pós 90 Dias (Revisão Preventiva)**: Convidar o cliente para aperto de parafusos, troca gratuita de plaquetas e higienização ultrassônica na loja.
- **Ativo Promo**: Cliente plenamente satisfeito que se torna promotor da marca e apto a receber condições de 2º par solar ou óculos de reserva.
