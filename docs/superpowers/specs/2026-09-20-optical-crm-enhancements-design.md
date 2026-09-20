# Especificação de Design: Melhorias no CRM Óptico MNOC-X (Usabilidade, Blindagem e Fluxos)

Data: 20/09/2026  
Status: Aprovado  
Autor: Antigravity AI & Engenharia Óptica  

---

## 1. Visão Geral e Objetivos

Este documento especifica a modernização e refinamento de fluxos operacionais, correção de bugs de interface, blindagem contra interferência de tradutores automáticos de navegadores e novas capacidades comerciais para o sistema MNOC-X.

### Metas Principais:
1. **Blindagem Anti-Tradução do Navegador**: Prevenir terminantemente que o Google Translate ou Microsoft Edge Translate modifique textos ópticos (ex: traduzindo "Aro" para "Hoop" ou "Anel", "Pix" para "Foto instantânea") e duplique nós do DOM no React (bug do SelectTrigger encavalado).
2. **Visualização Detalhada da OS com Impressão & PDF**: Reestruturar o sheet/modal de detalhes da OS para eliminar sobreposições de texto, expandir largura (sm:max-w-4xl), e adicionar botões funcionais de Imprimir OS e Gerar PDF.
3. **Módulo de Captadores & Comissões de OS**:
   - Menu dedicado em Configurações para gerenciar Captadores (clínicas parceiras, promotores, oftalmologistas de captação).
   - Parametrização flexível de comissão: Percentual (%) ou Valor Fixo (R$).
   - Etapa na criação da OS (abaixo do Médico Prescritor) para atrelar um Captador e calcular a comissão estimada em tempo real.
4. **Fluxo do Aro 1 (Armação & Lentes)**:
   - Campo mandatório: Código do Produto (com busca e auto-preenchimento do catálogo de estoque).
   - Demais dados da peça trazidos automaticamente e travados para edição (Marca, Modelo, Preço, Tipo de Peça, Família, Fabricante, Aro, Ponte).
   - Bloqueio de Estoque: Proibição estrita de lançar armação/óculos de sol com estoque zerado (estoque <= 0).
   - Armação Trazida pelo Cliente: Preço R$ 0,00, campos manuais de medição técnica (ponte, aro, vertical B, diagonal maior ED, marca, tipo), seletor visual de formatos de aro 2D (Redondo, Quadrado, Retangular, Aviador, Gatinho, Geométrico, Oval, Panto) e upload de foto.
   - Menu em Configurações para cadastro e gestão de formatos de aro.
5. **Alinhamento de Tratamentos**: Equalizar a disposição da descrição do tratamento com a caixa de preço em Aro 1 e Aro 2.
6. **Correção de Seletores (Forma de Pagamento e Parcelas)**:
   - Resolução da duplicação de texto identificada nas capturas de tela do usuário (media_1789938587805.png e media_1789938845506.png).
7. **Modo de Pagamento & Nomenclatura**:
   - Título: Modo de Pagamento
   - Botões: Pagamento Total e Sinal
8. **Aro 2 (2º Par com Desconto)**:
   - Título fixo e blindado: Aro 2 (eliminação de "Hoop", "Anel" e "Desdobramento Técnico").
   - Dioptrias e medidas: Apenas DNP e Altura livres para edição; Esférico, Cilíndrico e Eixo copiados e blindados do Aro 1.
   - Se monofocal em Aro 1 ou Aro 2: campo Adição blindado/desabilitado.
   - Botão "Copiar Dados Aro 1" para trazer todas as configurações do Aro 1 para personalização rápida.
9. **Ajustes de Formulário (Médico e Paciente)**:
   - Botão do Paciente: Renomear para "Copiar WhatsApp" (removendo "Clonar Whats" que o navegador traduzia para "Clonar o quê").
   - Botão do Médico: Remover o sinal duplo de + mantendo apenas um "+ Cadastrar Novo Médico".
10. **Zeramento Administrativo do CRM**:
    - Garantir que o botão com senha de segurança (120212) em Configurações > Banco & Integridade limpe 100% de OSs e vendas do CRM mantendo o banco isolado do App Lentes intocado.
