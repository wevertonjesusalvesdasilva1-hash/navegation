# Validação

## Cálculos (testes automatizados: `npm test`, 28 testes)

Referência: Excel original, mês out/26 (`4.Load Time` linhas 635–641).

| Item | Excel | App | Diferença |
|---|---|---|---|
| Carga UMC01 (h) | 308,5599 | 308,56 | 0 |
| Carga UMC02 (h) | 268,86 | 268,86 | 0 |
| Carga NCBZ (h) | 95,07477 | 95,07 | 0 |
| Carga HMC-16 (h) | 245,1162 | 245,12 | 0 |
| Carga total (h) | 917,61087 | 917,61 | 0 |
| Capacidade 1 turno (h) | 146,4723 | 146,47 | 0 |
| Capacidade 2 turnos (h) | 281,2382 | 281,35 | +0,04% — o Excel pondera seg–qui/sex no 2º turno; o app usa 20:40–05:37 com 60 min (7,95 h) |
| Linha 1 turno + HE | +16,8 h | +16,8 h | 0 |
| Linha 2 turnos + HE | +33,6 h | +33,6 h | 0 |

Também testados: demanda +20% (carga ×1,2), tempo −10% (carga ×0,9), alterar tempo de uma máquina só afeta essa máquina, setup por lote, funcionários por célula, status por faixa, importação do arquivo original (idêntica ao dataset embutido, sem duplicar ao reimportar).

Sogyodo não é calculado no Excel (célula `#REF!`; valores 0,98/0,58 digitados): definição adotada = carga ÷ capacidade (nominal ou efetiva, configurável). **Precisa de confirmação.**

## Gráficos
Ver `INVENTARIO_GRAFICOS.md`. G1 coincide com o Excel (mesmas séries, cores, eixo, linhas de capacidade). G2, G5, G6 estavam quebrados/zerados no original; G8 só tem `#N/A`.

## Limitações conhecidas
- Células/mão de obra da Caldeiraria: o arquivo não traz tempos por célula nem funcionários por célula; telas prontas, dados pendentes.
- Aba 9 (jigs/serras): nomes de modelo diferem do plano; mantida como snapshot (G7).
- 377 combinações peça×modelo sem tempo: a carga é um piso.
- Supabase (login, papéis, dados compartilhados): código e SQL prontos (`supabase/schema.sql`), **não testados** contra um projeto real. Sem as variáveis, o app roda em modo local.
- Componentes de UI no estilo shadcn/ui escritos à mão (sem Radix/CLI).

## Capacidade por turno e tempos de usinagem (testes)
- Soma das capacidades por turno = capacidade total da máquina; turno inativo = 0 e a carga se divide entre os turnos que operam.
- Distribuição sequencial enche o turno A antes do B; proporcional mantém a mesma utilização em todos.
- Máquina que não opera em um turno não ganha capacidade nele; **mais funcionários não aumentam a capacidade da máquina** (testado).
- Nova escala com turno B mais curto reduz só a capacidade do turno B (−1/7,95 = −12,6%).
- Transferência de peça: carga sai da origem e entra na destino com o tempo da outra máquina; simulação não altera o estado oficial; transferir de volta restaura a carga original; máquina desativada sai dos cálculos.

Premissa: a demanda é mensal; como ela é distribuída entre os turnos é uma regra editável (proporcional, sequencial ou manual) — **confirmar com a produção**.
