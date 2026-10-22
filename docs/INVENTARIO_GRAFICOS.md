# Inventário de gráficos e indicadores do Excel original

Arquivo analisado: `capacidade_usinagem.xlsx` (Gilmar) — 21 abas (9 ocultas), 8 gráficos, ~5.600 células com erro.

## Gráficos (extraídos do XML do arquivo)

| ID | Aba | Tipo | Título / eixo | Séries (fonte) | Cores | Situação no Excel | No app |
|---|---|---|---|---|---|---|---|
| G1 | 5.Load Graph | Colunas empilhadas + 4 linhas, legenda no topo | eixo `[HRS]`; categorias UMC01, UMC02, NCBZ, HMC-16 | 21 modelos = carga (h) (`4.Load Time!E610:H630`); linhas `1sHIFT`, `1Shift (ET)`, `2sHIFT`, `2Shift (ET)` (`E635:H638`) | tema Office + explícitas (7030A0, 002060, 5B9BD5, FFC000, 9E480E, F1975A, B7B7B7); linhas azul 0000FF (1 turno) e vermelha FF0000 (2 turnos), tracejada = com HE | funciona | **Reproduzido e recalculado** (`GCarga`) |
| G2 | 3. Production Plan | Linhas, legenda no topo | eixo `[Qtd Maquinas/Dia]` | HE, CT, WL, MG, TTL (`C39:O46`) | accent1/2/3/5/4 | **quebrado**: aponta p/ linhas zeradas | Reproduzido com as séries corrigidas (plano por modelo, linhas 5–25); eixo renomeado para `[Qtd Máquinas/Mês]` (valores são mensais) |
| G3 | Planilha2 | Colunas empilhadas, legenda embaixo | "Hora extra por dia"; eixo `Hrs` | 12 processos (VIGA PC, BOOM HE, TRACK FRAME CT…) × dias da semana (`B3:H14`) | accent1–6 | funciona | Reproduzido (valores do Excel, somente leitura) |
| G4 | Planilha2 | Colunas empilhadas, legenda embaixo | eixo `Hrs` | 7 meses (set/25–mar/26) × dias da semana — célula BOOM HE (`B20:H26`) | accent1–6 | funciona | Reproduzido (valores do Excel, somente leitura) |
| G5 | 7.Pitch-Time Graph (oculta) | Colunas empilhadas + linha | "HE ● PITCH-TIME STUDY (PC200-8)"; eixo `[Min]` | tempos do modelo por máquina + PITCH-TIME (`4.Load Time!E591:H591`) | 002060 / accent1 | **zerado** (`#DIV/0!`) | Reproduzido; Pitch-Time editável |
| G6 | 7.Pitch-Time Graph (oculta) | idem | "… (PC160-8)" | idem | idem | **zerado** | Reproduzido (seletor de modelo) |
| G7 | 10.Machine Load Graph (oculta) | Colunas empilhadas + 4 linhas | eixo `[HRS]`; 97 postos (jigs/serras) | 16 modelos (`9.Machine Load Time!E309:CW324`), capacidade `E327:E330` | tema + explícitas | funciona, mas liga ao plano por **índice de linha** (HLOOKUP) e nomes divergem | Reproduzido com valores em cache; recálculo pendente do mapa de modelos |
| G8 | 10.Machine Load Graph (oculta) | idem, em h/dia | eixo `[HRS]` | `E336:CW357` | — | **100% `#N/A`** | Não reproduzido (sem dados) |

## Indicadores e tabelas

| Aba | O que mostra | No app |
|---|---|---|
| 1.Available | jornada (07:30–17:10 seg–qui, 17:00 sex; 2º turno 20:40–05:40), dias úteis/mês, frequência 95,5%, performance 84,6%, HE 0,8 h/dia, disponibilidade por funcionário | Turnos e pessoas, Usinagem (parâmetros dos cenários) |
| 3. Production Plan | plano 12 meses por modelo + totais por família | PLANO (aba Dados/Tempos), Dashboard G2 |
| 4.Load Time | tempo por peça×modelo×máquina; "Time per model"; carga do mês (linhas 610–630); capacidade (635–638); Workload/Sogyodo (E8–E12, **quebrados**) | Tempos padrão, Usinagem, Dashboard |
| 8/9/10 | máquinas/jigs da Caldeiraria (ocultas) | G7 (snapshot) |
| CALDEIRARIA, Relação, 2.Employees | listas nominais de pessoas | **não copiadas** (dados pessoais) |
| HORA EXTRA REAL / Planilha2 | registros e resumo de horas extras | G3, G4 |

## Lógica de cálculo preservada

`carga(h) = demanda do mês × Σ tempo(min) × 0,9 ÷ 60` · `capacidade(h) = dias úteis × horas do turno × frequência × performance` · `HE (linha ET) = + 0,8 h × dias × nº de turnos` (sem aplicar eficiência, como no Excel).
