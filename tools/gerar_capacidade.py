"""Gera Capacidade_Produtiva_Caldeiraria.xlsx (modelo parametrizado, sem dados inventados).
Uso: python3 gerar_capacidade.py [saida.xlsx] [--teste]   (--teste preenche dados fictícios p/ validação)"""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.chart import BarChart, Reference
from openpyxl.utils import get_column_letter as L

OUT = next((a for a in sys.argv[1:] if a.endswith(".xlsx")), "Capacidade_Produtiva_Caldeiraria.xlsx")
TESTE = "--teste" in sys.argv
import json, os
_j = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dados_usinagem.json")
REAL = json.load(open(_j, encoding="utf-8")) if os.path.exists(_j) and not TESTE else None
NF = 4

NC, NM, NB = 15, 6, 200          # células, máquinas, linhas da base
B0 = 6; B1 = B0 + NB - 1         # linhas da BASE
CAPR = f"$6:${6 + 4 * NC - 1}"

AZUL = "1F3864"; CINZA = "F2F2F2"
f_in = PatternFill("solid", fgColor="FFF2CC"); f_calc = PatternFill("solid", fgColor="F2F2F2")
f_res = PatternFill("solid", fgColor="E2EFDA"); f_hd = PatternFill("solid", fgColor=AZUL)
f_pend = PatternFill("solid", fgColor="FCE4D6")
thin = Side(style="thin", color="BFBFBF"); BR = Border(left=thin, right=thin, top=thin, bottom=thin)
VERDE = PatternFill("solid", bgColor="C6EFCE"); AMAR = PatternFill("solid", bgColor="FFEB9C"); VERM = PatternFill("solid", bgColor="FFC7CE")

wb = Workbook()
names = ["DASHBOARD", "SIMULADOR", "CAP_CELULA", "USINAGEM", "MAO_OBRA", "TEMPOS", "DEMANDA_CARGA",
         "COMPARATIVO", "PLANO", "BASE", "PARAMETROS", "DIAGNOSTICO", "INSTRUCOES"]
ws = {}
for i, n in enumerate(names):
    ws[n] = wb.active if i == 0 else wb.create_sheet(n)
    ws[n].title = n
    ws[n].sheet_view.showGridLines = False
D, S, C, U, M, T, DC, CO, PL, B, P, DG, IN = (ws[n] for n in names)
for n, col in [("DASHBOARD", "1F3864"), ("SIMULADOR", "C00000"), ("PARAMETROS", "BF8F00"), ("BASE", "BF8F00"), ("MAO_OBRA", "BF8F00")]:
    ws[n].sheet_properties.tabColor = col


def title(w, text, sub=""):
    w["A1"] = text; w["A1"].font = Font(size=16, bold=True, color=AZUL)
    if sub:
        w["A2"] = sub; w["A2"].font = Font(italic=True, color="7F7F7F")


def hdr(w, row, labels, col=1):
    for k, t in enumerate(labels):
        c = w.cell(row, col + k, t); c.fill = f_hd; c.font = Font(bold=True, color="FFFFFF", size=10)
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True); c.border = BR
    w.row_dimensions[row].height = 32


def put(w, ref, val, kind="calc", fmt=None, bold=False):
    c = w[ref]; c.value = val; c.border = BR
    c.fill = {"in": f_in, "calc": f_calc, "res": f_res, "pend": f_pend}[kind]
    if kind == "in": c.font = Font(color="0000FF", bold=bold)
    elif bold: c.font = Font(bold=True)
    if fmt: c.number_format = fmt
    return c


def widths(w, d):
    for k, v in d.items(): w.column_dimensions[k].width = v


HH = '0.0;-0.0;;@'; PCT = '0.0%;-0.0%;;@'; INT = '0;-0;;@'

# ---------------------------------------------------------------- PARAMETROS
title(P, "PARÂMETROS GERAIS", "Amarelo = editável (azul). Valores marcados PROVISÓRIO são premissas a confirmar com a Engenharia/PCP.")
rows = [(4, "Dias úteis no mês (vem da aba PLANO)", "=INDEX(PLANO!C5:N5,MATCH(C3,PLANO!C4:N4,0))", "0", "origem: 1.Available (arquivo Gilmar)" if REAL else "PROVISÓRIO"), (5, "Dias trabalhados na semana", 5, "0", "PROVISÓRIO"),
        (6, "Limite ATENÇÃO (amarelo) — utilização ≥", 0.85, "0%", "configurável"),
        (7, "Limite INSUFICIENTE (vermelho) — utilização ≥", 1.0, "0%", "configurável"),
        (8, "Base do Sogyodo (Nominal / Efetiva)", "Nominal", None, "PREMISSA: Sogyodo = carga ÷ capacidade (confirmar definição da empresa)")]
for r, lab, v, f, note in rows:
    P.cell(r, 2, lab); put(P, f"C{r}", v, "in", f); P.cell(r, 4, note).font = Font(italic=True, color="C00000")
P["B3"] = "Mês do plano de produção"; put(P, "C3", REAL["meses"][6] if REAL else "mês 1", "in", bold=True)
dvm = DataValidation(type="list", formula1="=PLANO!$C$4:$N$4"); P.add_data_validation(dvm); dvm.add("C3")
P["B9"] = "Cenário em análise (índice)"; put(P, "C9", '=MATCH(DASHBOARD!C3,C17:F17,0)', "calc")
dv = DataValidation(type="list", formula1='"Nominal,Efetiva"'); P.add_data_validation(dv); dv.add("C8")
hdr(P, 10, ["", "Turno", "Início", "Término", "Pausas (min)", "Horas líquidas"])
for k, (nm, a, b) in enumerate([("A", "07:30", "17:08"), ("B", "20:40", "05:37"), ("C", "22:00", "06:00")] if REAL else [("A", "06:00", "14:00"), ("B", "14:00", "22:00"), ("C", "22:00", "06:00")]):
    r = 11 + k; P.cell(r, 2, f"Turno {nm}").font = Font(bold=True)
    from datetime import time
    hh, mm = map(int, a.split(":")); h2, m2 = map(int, b.split(":"))
    put(P, f"C{r}", time(hh, mm), "in", "hh:mm"); put(P, f"D{r}", time(h2, m2), "in", "hh:mm")
    put(P, f"E{r}", (0 if (REAL and k == 2) else 60), "in", "0"); put(P, f"F{r}", f"=MOD(D{r}-C{r},1)*24-E{r}/60", "calc", "0.00")
P["G11"] = "A/B: jornada ponderada seg-qui+sex do arquivo (8,63h e 7,95h líq.). C: 8h do arquivo, horário a confirmar" if REAL else "PROVISÓRIO: horários e pausas a confirmar"; P["G11"].font = Font(italic=True, color="C00000")
P["B15"] = "CENÁRIOS (colunas C–E editáveis; F = Simulação livre, vem da aba SIMULADOR)"; P["B15"].font = Font(bold=True, color=AZUL)
hdr(P, 17, ["", "Parâmetro", "Atual", "Ajustado", "Otimizado", "Simulação"], 1)
P["B17"].value = "Parâmetro"; P["A17"].value = ""
labs = ["Turno A ativo (1/0)", "Turno B ativo (1/0)", "Turno C ativo (1/0)", "Horas extras por turno/dia (h)", "Dias com HE no mês",
        "Eficiência operacional", "Disponibilidade", "Fator de demanda (1,20 = +20%)", "Fator de tempo (0,90 = -10%)", "Base de tempo (Padrão/Real)"]
defs = {"C": [1, 0, 0, 0, 0, .85, .90, 1, 1, "Padrão"], "D": [1, 1, 0, 0, 0, .85, .90, 1, 1, "Padrão"], "E": [1, 1, 0, 0, 0, .90, .92, 1, .9, "Padrão"]}
if REAL:  # arquivo Gilmar: performance 84,6% (1.Available I69), frequência 95,5% (G22), fator 0,9 (4.Load Time), HE 0,8 h/dia por pessoa (J22)
    defs = {"C": [1, 0, 0, 0, 0, .845969, .955, 1, .9, "Padrão"], "D": [1, 1, 0, 0, 0, .845969, .955, 1, .9, "Padrão"], "E": [1, 1, 0, 0.8, "=C4", .845969, .955, 1, .9, "Padrão"]}
fm = ["0", "0", "0", "0.0", "0", "0%", "0%", "0.00", "0.00", None]
dvb = DataValidation(type="list", formula1='"Padrão,Real"'); P.add_data_validation(dvb)
dvf = DataValidation(type="list", formula1='"0,1"'); P.add_data_validation(dvf)
for k, lab in enumerate(labs):
    r = 18 + k; P.cell(r, 2, lab)
    for col in "CDE": put(P, f"{col}{r}", defs[col][k], "in", fm[k])
    put(P, f"F{r}", f"=SIMULADOR!C{7 + k}", "calc", fm[k])
    if k < 3: dvf.add(f"C{r}:E{r}")
    if k == 9: dvb.add(f"C{r}:E{r}")
P["G23"] = "Arquivo: eficiência=performance 84,6%, disponibilidade=frequência 95,5%. Fator tempo 0,9 = multiplicador do Load Time." if REAL else "PROVISÓRIO (todos os cenários): confirmar eficiência/disponibilidade"; P["G23"].font = Font(italic=True, color="C00000")
P["B28"] = "Horas efetivas por funcionário/mês (calc)"
for col in "CDEF":
    put(P, f"{col}28", f"=$C$4*({col}18*$F$11+{col}19*$F$12+{col}20*$F$13)*{col}23*{col}24", "calc", "0.0")
P["B31"] = "LISTAS"; P["B31"].font = Font(bold=True, color=AZUL)
hdr(P, 31, ["", "Máquinas de usinagem", "Observação"])
for j in range(NM):
    put(P, f"B{32 + j}", (REAL["maquinas"] if REAL else ["UMC-01", "UMC-02", "HMC-16"])[j] if j < (4 if REAL else 3) else None, "in")
hdr(P, 39, ["", "Famílias", ""])
for j, f in enumerate(["HE/PC", "WL/WA", "CT", "MG"]): put(P, f"B{40 + j}", f, "in")
P["B44"] = "Eficiência por processo = Tempo padrão ÷ Tempo real (aba TEMPOS). Setup entra na carga como min/lote ÷ lote."
widths(P, {"A": 3, "B": 46, "C": 13, "D": 13, "E": 13, "F": 13, "G": 40})

# ---------------------------------------------------------------- BASE
title(B, "BASE DE DADOS", "Uma linha = peça × processo. Preencha só as colunas amarelas. Colunas cinza são calculadas. Use o filtro (setas) por família, modelo, célula ou máquina.")
hdr(B, 5, ["Família", "Modelo", "Peça", "Processo", "Célula", "Máquina usinagem", "Operadores (h-homem)", "Tempo padrão (min/pç)",
           "Tempo real (min/pç)", "Setup (min/lote)", "Lote (pç)", "Demanda do mês (pç) — vem de PLANO", "Observação / Pendência",
           "Tempo real efetivo", "Setup min/pç", "Operadores efetivo", "Eficiência proc. (TP/TR)"])
for r in range(B0, B1 + 1):
    for c in range(1, 14): put(B, f"{L(c)}{r}", None, "in")
    put(B, f"L{r}", f'=IF(B{r}="",0,IFERROR(INDEX(PLANO!$C$6:$N$40,MATCH(B{r},PLANO!$B$6:$B$40,0),MATCH(PARAMETROS!$C$3,PLANO!$C$4:$N$4,0)),0))', "calc", "0")
    put(B, f"N{r}", f"=IF(I{r}>0,I{r},H{r})", "calc", "0.00")
    put(B, f"O{r}", f"=IF(K{r}>0,J{r}/K{r},0)", "calc", "0.000")
    put(B, f"P{r}", f"=IF(G{r}>0,G{r},1)", "calc", "0")
    put(B, f"Q{r}", f'=IF(AND(H{r}>0,I{r}>0),H{r}/I{r},"")', "calc", "0%")
B.freeze_panes = "A6"; B.auto_filter.ref = f"A5:Q{B1}"
dvfam = DataValidation(type="list", formula1="=PARAMETROS!$B$40:$B$43"); B.add_data_validation(dvfam); dvfam.add(f"A{B0}:A{B1}")
dvcel = DataValidation(type="list", formula1=f"=MAO_OBRA!$A$6:$A${5 + NC}", allow_blank=True); B.add_data_validation(dvcel); dvcel.add(f"E{B0}:E{B1}")
dvmq = DataValidation(type="list", formula1="=PARAMETROS!$B$32:$B$37", allow_blank=True); B.add_data_validation(dvmq); dvmq.add(f"F{B0}:F{B1}")
widths(B, {"A": 10, "B": 14, "C": 16, "D": 16, "E": 14, "F": 14, "G": 11, "H": 12, "I": 12, "J": 11, "K": 9, "L": 13, "M": 30, "N": 11, "O": 10, "P": 11, "Q": 12})
if REAL:
    for k, l in enumerate(REAL["linhas"]):
        r = B0 + k
        for c, key in enumerate(["familia", "modelo", "peca"], 1): B.cell(r, c).value = l[key]
        B.cell(r, 4).value = "USINAGEM"; B.cell(r, 6).value = l["maquina"]; B.cell(r, 8).value = l["tp"]
        B.cell(r, 13).value = "Setup, lote e tempo real: pendentes (não constam no arquivo)"
if TESTE:
    import random; random.seed(1)
    for r in range(B0, B0 + 24):
        fam = ["HE/PC", "WL/WA", "CT"][r % 3]
        vals = [fam, f"M{r % 4}", f"P{r}", "Solda", f"CEL-{(r % 5) + 1:02d}" if r % 4 else None, ["UMC-01", "UMC-02", "HMC-16"][r % 3] if r % 4 == 0 else None,
                2, 30 + r, 35 + r, 60, 20, 100 + 10 * r]
        for c, v in enumerate(vals, 1): B.cell(r, c).value = v

# ---------------------------------------------------------------- PLANO
title(PL, "PLANO DE PRODUÇÃO (máquinas/mês) E DIAS ÚTEIS", "Fonte: 3. Production Plan e 1.Available (arquivo Gilmar). Edite as quantidades; a BASE e todos os cálculos atualizam.")
hdr(PL, 4, ["", "Modelo", *(REAL["meses"] if REAL else [f"mês {i}" for i in range(1, 13)]), "Média", "Família"])
PL["B5"] = "Dias úteis"; PL["B5"].font = Font(bold=True)
for k in range(12): put(PL, f"{L(3 + k)}5", REAL["dias"][k] if REAL else None, "in", "0")
put(PL, "O5", "=AVERAGE(C5:N5)", "calc", "0.0")
for i in range(35):
    r = 6 + i
    p = REAL["plano"][i] if REAL and i < len(REAL["plano"]) else None
    put(PL, f"B{r}", p["modelo"] if p else None, "in")
    for k in range(12): put(PL, f"{L(3 + k)}{r}", p["qtd"][k] if p else None, "in", "0")
    put(PL, f"O{r}", f'=IF(B{r}="","",AVERAGE(C{r}:N{r}))', "calc", "0.0"); put(PL, f"P{r}", p["familia"] if p else None, "in")
put(PL, "B41", "TOTAL", "res", bold=True)
for k in range(13): put(PL, f"{L(3 + k)}41", f"=SUM({L(3 + k)}6:{L(3 + k)}40)", "res", "0")
widths(PL, {"A": 3, "B": 16, "P": 10}); [setattr(PL.column_dimensions[L(c)], "width", 8) for c in range(3, 16)]
PL.freeze_panes = "C6"

# ---------------------------------------------------------------- MAO_OBRA
title(M, "MÃO DE OBRA E TURNOS", "Funcionários por célula e turno em cada cenário. Cenário 'Simulação' = Atual + variação definida no SIMULADOR.")
hdr(M, 4, ["", "", "ATUAL", "", "", "AJUSTADO", "", "", "OTIMIZADO", "", "", "SIMULAÇÃO", "", "", "TOTAL ATIVO (turnos ativos)", "", "", ""])
hdr(M, 5, ["Célula", "Família", "A", "B", "C", "A", "B", "C", "A", "B", "C", "A", "B", "C", "Atual", "Ajustado", "Otimizado", "Simulação"])
fcol = {1: "CDE", 2: "FGH", 3: "IJK", 4: "LMN"}; pcol = {1: "C", 2: "D", 3: "E", 4: "F"}; tcol = {1: "O", 2: "P", 3: "Q", 4: "R"}
for i in range(NC):
    r = 6 + i
    put(M, f"A{r}", f"CEL-{i + 1:02d}" if TESTE and i < 5 else None, "in"); put(M, f"B{r}", (["HE/PC","WL/WA","CT"][i%3] if TESTE and i<5 else None), "in")
    for s in (1, 2, 3):
        for k, c in enumerate(fcol[s]): put(M, f"{c}{r}", (3 if TESTE and s == 1 and i < 5 else None), "in", "0")
    for k, c in enumerate(fcol[4]):
        put(M, f"{c}{r}", f"=IF(A{r}=SIMULADOR!$C$5,MAX(0,{'CDE'[k]}{r}+SIMULADOR!$C$6),{'CDE'[k]}{r})", "calc", "0")
    for s in range(1, 5):
        a, b, c = fcol[s]; p = pcol[s]
        put(M, f"{tcol[s]}{r}", f"={a}{r}*PARAMETROS!${p}$18+{b}{r}*PARAMETROS!${p}$19+{c}{r}*PARAMETROS!${p}$20", "res", "0")
r = 6 + NC
put(M, f"A{r}", "TOTAL", "res", bold=True)
for c in range(3, 19): put(M, f"{L(c)}{r}", f"=SUM({L(c)}6:{L(c)}{r - 1})", "res", "0", True)
dvc = DataValidation(type="list", formula1="=PARAMETROS!$B$40:$B$43", allow_blank=True); M.add_data_validation(dvc); dvc.add(f"B6:B{5 + NC}")
widths(M, {"A": 14, "B": 10}); [M.column_dimensions.__setitem__(L(c), M.column_dimensions[L(c)]) for c in range(3, 19)]
for c in range(3, 19): M.column_dimensions[L(c)].width = 9
M.freeze_panes = "C6"

# ---------------------------------------------------------------- CAP_CELULA
title(C, "CAPACIDADE POR CÉLULA — 4 cenários (horas-homem/mês)", "Células são recursos independentes. Dentro de um fluxo, o limitante é a célula/máquina de maior utilização (ver DEMANDA_CARGA, coluna Gargalo).")
hdr(C, 5, ["Cen.", "#", "Célula", "Família", "Funcionários", "Cap. nominal (h)", "Cap. efetiva (h)", "Cap. extra HE (h)", "Carga (h)", "Utilização",
           "Saldo (h)", "Ociosidade (h)", "Déficit (h)", "HE necessária (h)", "Func. adicionais", "Sogyodo", "Status", "Util. c/ HE",
           "Cap. diária (h)", "Cap. semanal (h)", "Cap. equiv. (pç/mês)"])
BE = f"BASE!$E${B0}:$E${B1}"; BP = f"BASE!$P${B0}:$P${B1}"; BL = f"BASE!$L${B0}:$L${B1}"; BN = f"BASE!$N${B0}:$N${B1}"
BH = f"BASE!$H${B0}:$H${B1}"; BO = f"BASE!$O${B0}:$O${B1}"; BF = f"BASE!$F${B0}:$F${B1}"
for s in range(1, 5):
    p = pcol[s]
    for i in range(NC):
        r = 6 + (s - 1) * NC + i; mo = 6 + i
        fl = lambda n: f"PARAMETROS!${p}${n}"
        a, b, c = fcol[s]
        f = {
            "A": s, "B": i + 1,
            "C": f'=IF(MAO_OBRA!A{mo}="","",MAO_OBRA!A{mo})', "D": f'=IF(MAO_OBRA!B{mo}="","",MAO_OBRA!B{mo})',
            "E": f"=MAO_OBRA!{tcol[s]}{mo}",
            "F": f"=PARAMETROS!$C$4*(MAO_OBRA!{a}{mo}*{fl(18)}*PARAMETROS!$F$11+MAO_OBRA!{b}{mo}*{fl(19)}*PARAMETROS!$F$12+MAO_OBRA!{c}{mo}*{fl(20)}*PARAMETROS!$F$13)",
            "G": f"=F{r}*{fl(23)}*{fl(24)}",
            "H": f"={fl(22)}*{fl(21)}*E{r}*{fl(23)}*{fl(24)}",
            "I": (f'=IF(C{r}="",0,{fl(25)}/60*(IF({fl(27)}="Real",SUMPRODUCT(({BE}=C{r})*{BP}*{BL}*{BN}),SUMPRODUCT(({BE}=C{r})*{BP}*{BL}*{BH}))*{fl(26)}'
                  f'+SUMPRODUCT(({BE}=C{r})*{BP}*{BL}*{BO})))'),
            "J": f"=IF(G{r}>0,I{r}/G{r},0)", "K": f"=G{r}-I{r}", "L": f"=MAX(0,K{r})", "M": f"=MAX(0,-K{r})", "N": f"=M{r}",
            "O": f"=IF(PARAMETROS!${p}$28>0,M{r}/PARAMETROS!${p}$28,0)",
            "P": f'=IF(PARAMETROS!$C$8="Nominal",IF(F{r}>0,I{r}/F{r},0),J{r})',
            "Q": f'=IF(C{r}="","",IF(I{r}=0,"SEM CARGA",IF(OR(G{r}=0,J{r}>=PARAMETROS!$C$7),"INSUFICIENTE",IF(J{r}>=PARAMETROS!$C$6,"ATENÇÃO","OK"))))',
            "R": f"=IF(G{r}+H{r}>0,I{r}/(G{r}+H{r}),0)",
            "S": f"=G{r}/PARAMETROS!$C$4", "T": f"=S{r}*PARAMETROS!$C$5",
            "U": f"=IF(I{r}>0,SUMIF({BE},C{r},{BL})*{fl(25)}*G{r}/I{r},0)",
        }
        fmts = {"E": INT, "F": HH, "G": HH, "H": HH, "I": HH, "J": PCT, "K": '0.0;-0.0;0.0', "L": HH, "M": HH, "N": HH, "O": '0.0;-0.0;;@', "P": PCT, "R": PCT, "S": HH, "T": HH, "U": '#,##0;-#,##0;;@'}
        for col, v in f.items(): put(C, f"{col}{r}", v, "calc" if col in "ABCD" else "res", fmts.get(col))
C.freeze_panes = "D6"; C.auto_filter.ref = f"A5:U{5 + 4 * NC}"
widths(C, {"A": 6, "B": 4, "C": 14, "D": 9, "Q": 14}); [setattr(C.column_dimensions[L(c)], "width", 12) for c in list(range(5, 17)) + list(range(18, 22))]

def cf_util(w, rng):
    first = rng.split(":")[0].replace("$", "")
    w.conditional_formatting.add(rng, FormulaRule(formula=[f"AND({first}>=PARAMETROS!$C$7,{first}<>0)"], fill=VERM))
    w.conditional_formatting.add(rng, FormulaRule(formula=[f"AND({first}>=PARAMETROS!$C$6,{first}<PARAMETROS!$C$7)"], fill=AMAR))
    w.conditional_formatting.add(rng, FormulaRule(formula=[f"AND({first}>0,{first}<PARAMETROS!$C$6)"], fill=VERDE))
def cf_status(w, rng):
    first = rng.split(":")[0].replace("$", "")
    for txt, fl in (("INSUFICIENTE", VERM), ("ATENÇÃO", AMAR), ("OK", VERDE)):
        w.conditional_formatting.add(rng, FormulaRule(formula=[f'{first}="{txt}"'], fill=fl))
cf_util(C, f"J6:J{5 + 4 * NC}"); cf_status(C, f"Q6:Q{5 + 4 * NC}")

# ---------------------------------------------------------------- USINAGEM
title(U, "CAPACIDADE DA USINAGEM — 4 cenários (horas-máquina/mês)", "Horas-máquina: não multiplicam por operadores. Carga = demanda × (tempo + setup/lote). Máquinas definidas em PARAMETROS (B32:B37).")
hdr(U, 5, ["Cen.", "#", "Máquina", "Turnos ativos", "Cap. nominal (h)", "Cap. efetiva (h)", "Cap. extra HE (h)", "Carga (h)", "Utilização", "Saldo (h)",
           "Ociosidade (h)", "Déficit (h)", "HE necessária (h)", "Status", "Sogyodo", "Turnos-A equiv. necessários", "Setup incluso (h)", "Util. c/ HE"])
for s in range(1, 5):
    p = pcol[s]
    for j in range(NM):
        r = 6 + (s - 1) * NM + j
        fl = lambda n: f"PARAMETROS!${p}${n}"
        f = {
            "A": s, "B": j + 1, "C": f'=IF(PARAMETROS!B{32 + j}="","",PARAMETROS!B{32 + j})',
            "D": f"={fl(18)}+{fl(19)}+{fl(20)}",
            "E": f"=PARAMETROS!$C$4*({fl(18)}*PARAMETROS!$F$11+{fl(19)}*PARAMETROS!$F$12+{fl(20)}*PARAMETROS!$F$13)",
            "F": f"=E{r}*{fl(23)}*{fl(24)}", "G": f"={fl(22)}*{fl(21)}*D{r}*{fl(23)}*{fl(24)}",
            "H": (f'=IF(C{r}="",0,{fl(25)}/60*(IF({fl(27)}="Real",SUMPRODUCT(({BF}=C{r})*{BL}*{BN}),SUMPRODUCT(({BF}=C{r})*{BL}*{BH}))*{fl(26)}'
                  f'+SUMPRODUCT(({BF}=C{r})*{BL}*{BO})))'),
            "I": f"=IF(F{r}>0,H{r}/F{r},0)", "J": f"=F{r}-H{r}", "K": f"=MAX(0,J{r})", "L": f"=MAX(0,-J{r})", "M": f"=L{r}",
            "N": f'=IF(C{r}="","",IF(H{r}=0,"SEM CARGA",IF(OR(F{r}=0,I{r}>=PARAMETROS!$C$7),"INSUFICIENTE",IF(I{r}>=PARAMETROS!$C$6,"ATENÇÃO","OK"))))',
            "O": f'=IF(PARAMETROS!$C$8="Nominal",IF(E{r}>0,H{r}/E{r},0),I{r})',
            "P": f"=IF(PARAMETROS!$F$11*{fl(23)}*{fl(24)}*PARAMETROS!$C$4>0,H{r}/(PARAMETROS!$F$11*{fl(23)}*{fl(24)}*PARAMETROS!$C$4),0)",
            "Q": f'=IF(C{r}="",0,{fl(25)}/60*SUMPRODUCT(({BF}=C{r})*{BL}*{BO}))',
            "R": f"=IF(F{r}+G{r}>0,H{r}/(F{r}+G{r}),0)",
        }
        fm2 = {"E": HH, "F": HH, "G": HH, "H": HH, "I": PCT, "J": '0.0;-0.0;0.0', "K": HH, "L": HH, "M": HH, "O": PCT, "P": '0.00;-0.00;;@', "Q": HH, "R": PCT}
        for col, v in f.items(): put(U, f"{col}{r}", v, "calc" if col in "ABCD" else "res", fm2.get(col))
cf_util(U, f"I6:I{5 + 4 * NM}"); cf_status(U, f"N6:N{5 + 4 * NM}")
U["A33"] = "CAPACIDADE EM 1, 2 E 3 TURNOS — cenário em análise (Dashboard)"; U["A33"].font = Font(bold=True, color=AZUL, size=12)
hdr(U, 34, ["", "", "Máquina", "Carga (h)", "Util. 1 turno", "Util. 2 turnos", "Util. 3 turnos", "Menor nº de turnos que atende"])
sel = "PARAMETROS!$C$9"
for j in range(NM):
    r = 35 + j
    put(U, f"C{r}", f'=IF(PARAMETROS!B{32 + j}="","",PARAMETROS!B{32 + j})')
    put(U, f"D{r}", f"=INDEX($H$6:$H${5 + 4 * NM},({sel}-1)*{NM}+{j + 1})", "res", HH)
    eff = f"INDEX(PARAMETROS!$C$23:$F$23,{sel})*INDEX(PARAMETROS!$C$24:$F$24,{sel})*PARAMETROS!$C$4"
    for n, col in enumerate("EFG", 1):
        hrs = "+".join(f"PARAMETROS!$F${11 + k}" for k in range(n))
        put(U, f"{col}{r}", f"=IF(({hrs})*{eff}>0,D{r}/(({hrs})*{eff}),0)", "res", PCT)
    put(U, f"H{r}", f'=IF(C{r}="","",IF(D{r}=0,"SEM CARGA",IF(E{r}<PARAMETROS!$C$7,1,IF(F{r}<PARAMETROS!$C$7,2,IF(G{r}<PARAMETROS!$C$7,3,"Não atende")))))', "res")
cf_util(U, f"E35:G{34 + NM}")
widths(U, {"A": 6, "B": 4, "C": 14, "N": 14, "H": 14}); [setattr(U.column_dimensions[L(c)], "width", 12) for c in list(range(4, 8)) + list(range(9, 14)) + list(range(15, 19))]
U.freeze_panes = "D6"

# ---------------------------------------------------------------- COMPARATIVO
title(CO, "COMPARATIVO DE CENÁRIOS", "Resultados lado a lado. Parâmetros dos cenários em PARAMETROS (C17:F28).")
hdr(CO, 4, ["", "Indicador", "=PARAMETROS!C17", "=PARAMETROS!D17", "=PARAMETROS!E17", "=PARAMETROS!F17"])
CO["A4"].value = ""
CA = lambda col, s: f"SUMIF(CAP_CELULA!$A$6:$A${5 + 4 * NC},{s},CAP_CELULA!${col}$6:${col}${5 + 4 * NC})"
UA = lambda col, s: f"SUMIF(USINAGEM!$A$6:$A${5 + 4 * NM},{s},USINAGEM!${col}$6:${col}${5 + 4 * NM})"
ind = [
    ("Funcionários disponíveis", lambda s, c: "=" + CA("E", s), INT),
    ("Capacidade efetiva (h)", lambda s, c: "=" + CA("G", s), HH),
    ("Carga planejada (h)", lambda s, c: "=" + CA("I", s), HH),
    ("Utilização geral", lambda s, c: f"=IF({c}6>0,{c}7/{c}6,0)", PCT),
    ("Horas excedentes (h)", lambda s, c: "=" + CA("M", s), HH),
    ("Horas ociosas (h)", lambda s, c: "=" + CA("L", s), HH),
    ("Horas extras necessárias (h)", lambda s, c: "=" + CA("N", s), HH),
    ("Funcionários adicionais necessários", lambda s, c: "=" + CA("O", s), '0.0;-0.0;;@'),
    ("Funcionários necessários", lambda s, c: f"={c}5+{c}12", '0.0;-0.0;;@'),
    ("Sogyodo geral", lambda s, c: f'=IF(PARAMETROS!$C$8="Nominal",IF({CA("F", s)}>0,{c}7/{CA("F", s)},0),{c}8)', PCT),
    ("Células INSUFICIENTES", lambda s, c: f'=COUNTIFS(CAP_CELULA!$A$6:$A${5 + 4 * NC},{s},CAP_CELULA!$Q$6:$Q${5 + 4 * NC},"INSUFICIENTE")', INT),
    ("Células em ATENÇÃO", lambda s, c: f'=COUNTIFS(CAP_CELULA!$A$6:$A${5 + 4 * NC},{s},CAP_CELULA!$Q$6:$Q${5 + 4 * NC},"ATENÇÃO")', INT),
    ("Máquinas INSUFICIENTES", lambda s, c: f'=COUNTIFS(USINAGEM!$A$6:$A${5 + 4 * NM},{s},USINAGEM!$N$6:$N${5 + 4 * NM},"INSUFICIENTE")', INT),
    ("Maior utilização na usinagem", lambda s, c: f"=SUMPRODUCT(MAX((USINAGEM!$A$6:$A${5 + 4 * NM}={s})*USINAGEM!$I$6:$I${5 + 4 * NM}))", PCT),
    ("Demanda mensal total (pç)", lambda s, c: f"=SUM({BL})*PARAMETROS!{pcol[s]}25", '#,##0;-#,##0;;@'),
    ("Capacidade equivalente (pç/mês)", lambda s, c: f"=IF({c}7>0,{c}19*{c}6/{c}7,0)", '#,##0;-#,##0;;@'),
]
for k, (lab, fn, fmt) in enumerate(ind):
    r = 5 + k; CO.cell(r, 2, lab).border = BR
    for s in range(1, 5):
        col = L(2 + s); put(CO, f"{col}{r}", fn(s, col), "res", fmt)
cf_util(CO, "C8:F8"); cf_util(CO, "C18:F18")
widths(CO, {"A": 3, "B": 38, "C": 16, "D": 16, "E": 16, "F": 16})
def bar(w, title_, cats, series, anchor, w_=16, h_=7.5, yt=None):
    ch = BarChart(); ch.type = "col"; ch.title = title_; ch.width = w_; ch.height = h_
    for ref, tf in series: ch.add_data(ref, titles_from_data=tf)
    ch.set_categories(cats)
    if yt: ch.y_axis.title = yt
    ch.y_axis.delete = False; ch.x_axis.delete = False
    w.add_chart(ch, anchor); return ch
bar(CO, "Utilização geral por cenário", Reference(CO, min_col=3, max_col=6, min_row=4), [(Reference(CO, min_col=2, max_col=6, min_row=8), True)], "H3")
bar(CO, "Carga × capacidade (h)", Reference(CO, min_col=3, max_col=6, min_row=4), [(Reference(CO, min_col=2, max_col=6, min_row=6), True), (Reference(CO, min_col=2, max_col=6, min_row=7), True)], "H19")
bar(CO, "Demanda × capacidade mensal (pç)", Reference(CO, min_col=3, max_col=6, min_row=4), [(Reference(CO, min_col=2, max_col=6, min_row=19), True), (Reference(CO, min_col=2, max_col=6, min_row=20), True)], "H35")

# ---------------------------------------------------------------- SIMULADOR
title(S, "SIMULADOR DE CAPACIDADE", "Altere as células amarelas. O cenário 'Simulação' recalcula tudo e é comparado ao Atual.")
S["B4"] = "ALAVANCAS"; S["B4"].font = Font(bold=True, color=AZUL)
sim = [("Célula a alterar", f"=MAO_OBRA!A6", None), ("Variação de funcionários por turno ativo (+/-)", 0, "0")]
put(S, "C5", "CEL-01" if TESTE else None, "in"); S["B5"] = "Célula a alterar"
dvs = DataValidation(type="list", formula1=f"=MAO_OBRA!$A$6:$A${5 + NC}", allow_blank=True); S.add_data_validation(dvs); dvs.add("C5")
S["B6"] = "Variação de funcionários por turno ativo (+/-)"; put(S, "C6", 0, "in", "0")
for k, lab in enumerate(labs):
    S.cell(7 + k, 2, lab); put(S, f"C{7 + k}", f"=PARAMETROS!C{18 + k}" if False else defs["C"][k], "in", fm[k])
    S.cell(7 + k, 4, "← inicia igual ao cenário Atual").font = Font(italic=True, color="7F7F7F") if k == 0 else Font()
dvf.add("C7:C9"); dvb.add("C16")
S["B18"] = "RESULTADO — CÉLULA SELECIONADA (Atual × Simulação)"; S["B18"].font = Font(bold=True, color=AZUL)
hdr(S, 19, ["", "Indicador", "Atual", "Simulação", "Variação"])
def cap_row(s, col): return f"INDEX(CAP_CELULA!${col}$6:${col}${5 + 4 * NC},{(s - 1) * NC}+MATCH($C$5,MAO_OBRA!$A$6:$A${5 + NC},0))"
res = [("Funcionários", "E", INT), ("Capacidade efetiva (h/mês)", "G", HH), ("Carga (h/mês)", "I", HH), ("Utilização", "J", PCT), ("Saldo (h)", "K", '0.0;-0.0;0.0'),
       ("Capacidade equivalente (pç/mês)", "U", '#,##0;-#,##0;0'), ("Extra com horas extras (h)", "H", HH)]
for k, (lab, col, fmt) in enumerate(res):
    r = 20 + k; S.cell(r, 2, lab).border = BR
    put(S, f"C{r}", f"=IFERROR({cap_row(1, col)},0)", "res", fmt); put(S, f"D{r}", f"=IFERROR({cap_row(4, col)},0)", "res", fmt)
    put(S, f"E{r}", f"=D{r}-C{r}", "res", fmt)
S["B28"] = "RESULTADO GERAL (Simulação)"; S["B28"].font = Font(bold=True, color=AZUL)
geral = [("Utilização geral da Caldeiraria", "=COMPARATIVO!F8", PCT), ("Horas extras necessárias (h)", "=COMPARATIVO!F11", HH),
         ("Funcionários necessários para o plano", "=COMPARATIVO!F13", '0.0'), ("Funcionários disponíveis", "=COMPARATIVO!F5", INT),
         ("Células INSUFICIENTES", "=COMPARATIVO!F15", INT), ("Máquinas INSUFICIENTES", "=COMPARATIVO!F17", INT)]
for k, (lab, f, fmt) in enumerate(geral):
    S.cell(29 + k, 2, lab).border = BR; put(S, f"C{29 + k}", f, "res", fmt)
S["B36"] = "RESPOSTAS RÁPIDAS (Simulação)"; S["B36"].font = Font(bold=True, color=AZUL)
b4 = lambda col: f"CAP_CELULA!${col}${6 + 3 * NC}:${col}${5 + 4 * NC}"
u4 = lambda col: f"USINAGEM!${col}${6 + 3 * NM}:${col}${5 + 4 * NM}"
resp = [("Célula mais sobrecarregada", f'=IF(MAX({b4("J")})=0,"-",INDEX({b4("C")},MATCH(MAX({b4("J")}),{b4("J")},0)))'),
        ("  utilização", f'=MAX({b4("J")})'),
        ("Célula com mais mão de obra ociosa", f'=IF(MAX({b4("L")})=0,"-",INDEX({b4("C")},MATCH(MAX({b4("L")}),{b4("L")},0)))'),
        ("Máquina de usinagem limitante", f'=IF(MAX({u4("I")})=0,"-",INDEX({u4("C")},MATCH(MAX({u4("I")}),{u4("I")},0)))'),
        ("  utilização", f'=MAX({u4("I")})'),
        ("Linha (peça/processo) com maior consumo de horas", '=IFERROR(INDEX(DEMANDA_CARGA!$C$6:$C$%d,MATCH(LARGE(DEMANDA_CARGA!$L$6:$L$%d,1),DEMANDA_CARGA!$L$6:$L$%d,0))&" / "&INDEX(DEMANDA_CARGA!$D$6:$D$%d,MATCH(LARGE(DEMANDA_CARGA!$L$6:$L$%d,1),DEMANDA_CARGA!$L$6:$L$%d,0)),"-")' % ((B1,) * 6))]
for k, (lab, f) in enumerate(resp):
    S.cell(37 + k, 2, lab).border = BR; put(S, f"C{37 + k}", f, "res", PCT if "utilização" in lab else None)
S["B44"] = "Obs.: aba SIMULADOR usa o cenário 4 (Simulação). O Dashboard permite escolher qualquer cenário."
S["B44"].font = Font(italic=True, color="7F7F7F")
widths(S, {"A": 3, "B": 50, "C": 16, "D": 16, "E": 14})

# ---------------------------------------------------------------- DASHBOARD
title(D, "DASHBOARD — CAPACIDADE PRODUTIVA | CALDEIRARIA E USINAGEM", "")
D["B3"] = "Cenário:"; put(D, "C3", "Atual", "in", bold=True); D["D3"] = "Família:"; put(D, "E3", None, "in")
D["B4"] = "Filtro família:"; put(D, "C4", "TODAS", "in", bold=True)
D["E3"].value = None
dvsc = DataValidation(type="list", formula1="=PARAMETROS!$C$17:$F$17"); D.add_data_validation(dvsc); dvsc.add("C3")
dvfa = DataValidation(type="list", formula1='"TODAS,HE/PC,WL/WA,CT,MG"'); D.add_data_validation(dvfa); dvfa.add("C4")
D["D3"].value = None
D["F3"] = "Verde = suficiente | Amarelo = atenção | Vermelho = insuficiente (limites em PARAMETROS C6:C7)"; D["F3"].font = Font(italic=True, color="7F7F7F")
kp = ["Capacidade disponível (h)", "Carga planejada (h)", "Utilização", "Horas excedentes (h)", "Horas ociosas (h)", "Func. necessários", "Func. disponíveis", "Horas extras necessárias (h)", "Sogyodo"]
hdr(D, 7, ["", *kp]); D.row_dimensions[7].height = 40
c0, c1 = 13, 12 + NC
rg = lambda col: f"${col}${c0}:${col}${c1}"
kv = [f"=SUMPRODUCT({rg('J')},{rg('E')})", f"=SUMPRODUCT({rg('J')},{rg('F')})", "=IF(B8>0,C8/B8,0)",
      f"=SUMPRODUCT({rg('J')}*({rg('H')}<0)*(-{rg('H')}))", f"=SUMPRODUCT({rg('J')}*({rg('H')}>0)*{rg('H')})",
      f"=H8+SUMPRODUCT({rg('J')},{rg('K')})", f"=SUMPRODUCT({rg('J')},{rg('D')})", "=E8",
      f'=IF(PARAMETROS!$C$8="Nominal",IF(SUMPRODUCT({rg("J")},{rg("L")})>0,C8/SUMPRODUCT({rg("J")},{rg("L")}),0),D8)']
kf = [HH, HH, PCT, HH, HH, '0.0', INT, HH, PCT]
for k, (v, f) in enumerate(zip(kv, kf)):
    c = put(D, f"{L(2 + k)}8", v, "res", f, True); c.font = Font(bold=True, size=14); c.alignment = Alignment(horizontal="center")
D.row_dimensions[8].height = 28
cf_util(D, "D8:D8")
D["A11"] = "CARGA × CAPACIDADE POR CÉLULA"; D["A11"].font = Font(bold=True, color=AZUL, size=12)
hdr(D, 12, ["#", "Célula", "Família", "Func.", "Capacidade (h)", "Carga (h)", "Utilização", "Saldo (h)", "Status", "Filtro", "Func. adic.", "Cap. nominal (h)", "Chave"])
for i in range(NC):
    r = c0 + i; ix = f"(PARAMETROS!$C$9-1)*{NC}+{i + 1}"
    I = lambda col: f"=INDEX(CAP_CELULA!${col}$6:${col}${5 + 4 * NC},{ix})"
    put(D, f"A{r}", i + 1)
    for col, src, fmt in [("B", "C", None), ("C", "D", None), ("D", "E", INT), ("E", "G", HH), ("F", "I", HH), ("G", "J", PCT), ("H", "K", '0.0;-0.0;0.0'), ("I", "Q", None), ("K", "O", '0.0;-0.0;;@'), ("L", "F", HH)]:
        put(D, f"{col}{r}", I(src), "res", fmt)
    put(D, f"J{r}", f'=IF(B{r}="",0,IF(OR($C$4="TODAS",C{r}=$C$4),1,0))', "calc", "0")
    put(D, f"M{r}", f"=J{r}*G{r}+{i + 1}/10000000", "calc", "0.0000")
cf_util(D, f"G{c0}:G{c1}"); cf_status(D, f"I{c0}:I{c1}")
m0 = c1 + 4
D[f"A{m0 - 2}"] = "UTILIZAÇÃO DAS MÁQUINAS DE USINAGEM"; D[f"A{m0 - 2}"].font = Font(bold=True, color=AZUL, size=12)
hdr(D, m0 - 1, ["#", "Máquina", "", "Turnos", "Capacidade (h)", "Carga (h)", "Utilização", "Saldo (h)", "Status"])
for j in range(NM):
    r = m0 + j; ix = f"(PARAMETROS!$C$9-1)*{NM}+{j + 1}"
    I = lambda col: f"=INDEX(USINAGEM!${col}$6:${col}${5 + 4 * NM},{ix})"
    put(D, f"A{r}", j + 1); put(D, f"B{r}", I("C"), "res"); put(D, f"D{r}", I("D"), "res", INT)
    for col, src, fmt in [("E", "F", HH), ("F", "H", HH), ("G", "I", PCT), ("H", "J", '0.0;-0.0;0.0'), ("I", "N", None)]: put(D, f"{col}{r}", I(src), "res", fmt)
mq1 = m0 + NM - 1
cf_util(D, f"G{m0}:G{mq1}"); cf_status(D, f"I{m0}:I{mq1}")
hdr(D, 9, ["", *["USINAGEM — " + k for k in ["capacidade (h)", "carga (h)", "utilização", "horas excedentes (h)", "horas ociosas (h)", "máquinas insuficientes", "máquinas em atenção", "horas extras necessárias (h)", "Sogyodo"]]])
D.row_dimensions[9].height = 40
mg = lambda col: f"${col}${m0}:${col}${mq1}"
ku = [f"=SUM({mg('E')})", f"=SUM({mg('F')})", "=IF(B10>0,C10/B10,0)", f"=SUMPRODUCT(({mg('H')}<0)*(-{mg('H')}))", f"=SUMPRODUCT(({mg('H')}>0)*{mg('H')})",
      f'=COUNTIF({mg("I")},"INSUFICIENTE")', f'=COUNTIF({mg("I")},"ATENÇÃO")', "=E10",
      '=IF(PARAMETROS!$C$8="Nominal",D10*INDEX(PARAMETROS!$C$23:$F$23,PARAMETROS!$C$9)*INDEX(PARAMETROS!$C$24:$F$24,PARAMETROS!$C$9),D10)']
for k, (v_, f_) in enumerate(zip(ku, [HH, HH, PCT, HH, HH, INT, INT, HH, PCT])):
    c = put(D, f"{L(2 + k)}10", v_, "res", f_, True); c.font = Font(bold=True, size=14); c.alignment = Alignment(horizontal="center")
D.row_dimensions[10].height = 28
cf_util(D, "D10:D10")
f0 = mq1 + 4
D[f"A{f0 - 2}"] = "CAPACIDADE POR FAMÍLIA"; D[f"A{f0 - 2}"].font = Font(bold=True, color=AZUL, size=12)
hdr(D, f0 - 1, ["#", "Família", "", "", "Capacidade (h)", "Carga (h)", "Utilização"])
for k in range(NF):
    r = f0 + k; put(D, f"A{r}", k + 1); put(D, f"B{r}", f"=PARAMETROS!B{40 + k}", "calc")
    put(D, f"E{r}", f"=SUMPRODUCT(({rg('C')}=B{r})*{rg('E')})", "res", HH); put(D, f"F{r}", f"=SUMPRODUCT(({rg('C')}=B{r})*{rg('F')})", "res", HH)
    put(D, f"G{r}", f"=IF(E{r}>0,F{r}/E{r},0)", "res", PCT)
cf_util(D, f"G{f0}:G{f0 + NF - 1}")
k0 = f0 + 6
D[f"A{k0 - 2}"] = "RANKING — CÉLULAS MAIS SOBRECARREGADAS (filtro aplicado)"; D[f"A{k0 - 2}"].font = Font(bold=True, color=AZUL, size=12)
hdr(D, k0 - 1, ["Pos.", "Célula", "", "", "Capacidade (h)", "Carga (h)", "Utilização"])
for n in range(5):
    r = k0 + n; put(D, f"A{r}", n + 1)
    mt = f"MATCH(LARGE({rg('M')},{n + 1}),{rg('M')},0)"
    put(D, f"B{r}", f'=IF(LARGE({rg("M")},{n + 1})<1/100000,"-",INDEX({rg("B")},{mt}))', "res")
    put(D, f"E{r}", f'=IFERROR(INDEX({rg("E")},{mt}),0)', "res", HH); put(D, f"F{r}", f'=IFERROR(INDEX({rg("F")},{mt}),0)', "res", HH)
    put(D, f"G{r}", f'=IFERROR(INDEX({rg("G")},{mt}),0)', "res", PCT)
cf_util(D, f"G{k0}:G{k0 + 4}")
widths(D, {"A": 5, "B": 22, "C": 14, "D": 12, "E": 15, "F": 14, "G": 13, "H": 14, "I": 16, "J": 16, "K": 11, "L": 12, "M": 10})
D.column_dimensions["N"].width = 3
cat_c = Reference(D, min_col=2, min_row=c0, max_row=c1)
bar(D, "Carga × capacidade por célula (h)", cat_c, [(Reference(D, min_col=5, min_row=12, max_row=c1), True), (Reference(D, min_col=6, min_row=12, max_row=c1), True)], "O3", 18, 7.5)
bar(D, "Utilização das máquinas de usinagem", Reference(D, min_col=2, min_row=m0, max_row=mq1), [(Reference(D, min_col=7, min_row=m0 - 1, max_row=mq1), True)], "O19", 18, 7.5)
bar(D, "Capacidade por família (h)", Reference(D, min_col=2, min_row=f0, max_row=f0 + NF - 1), [(Reference(D, min_col=5, min_row=f0 - 1, max_row=f0 + NF - 1), True), (Reference(D, min_col=6, min_row=f0 - 1, max_row=f0 + NF - 1), True)], "O35", 18, 7.5)
bar(D, "Distribuição de mão de obra (funcionários por célula)", cat_c, [(Reference(D, min_col=4, min_row=12, max_row=c1), True)], "O51", 18, 7.5)
bar(D, "Gargalos — ranking de utilização", Reference(D, min_col=2, min_row=k0, max_row=k0 + 4), [(Reference(D, min_col=7, min_row=k0 - 1, max_row=k0 + 4), True)], "X3", 16, 7.5)
bar(D, "Comparação dos cenários — utilização geral", Reference(CO, min_col=3, max_col=6, min_row=4), [(Reference(CO, min_col=2, max_col=6, min_row=8), True)], "X19", 16, 7.5)
bar(D, "Demanda × capacidade mensal (pç)", Reference(CO, min_col=3, max_col=6, min_row=4), [(Reference(CO, min_col=2, max_col=6, min_row=19), True), (Reference(CO, min_col=2, max_col=6, min_row=20), True)], "X35", 16, 7.5)

# ---------------------------------------------------------------- TEMPOS
title(T, "TEMPOS PADRÃO × TEMPO REAL", "Visão calculada da BASE. Para alterar tempos, edite a aba BASE (colunas H e I).")
hdr(T, 5, ["Família", "Modelo", "Peça", "Processo", "Célula", "Máquina", "Tempo padrão (min/pç)", "Tempo real (min/pç)", "Desvio (min)", "Desvio %", "Eficiência (TP/TR)", "Pendência"])
for r in range(B0, B1 + 1):
    for k, col in enumerate("ABCDEF"): put(T, f"{col}{r}", f'=IF(BASE!{col}{r}="","",BASE!{col}{r})', "calc")
    put(T, f"G{r}", f'=IF(BASE!H{r}="","",BASE!H{r})', "calc", "0.00"); put(T, f"H{r}", f'=IF(BASE!I{r}="","",BASE!I{r})', "calc", "0.00")
    put(T, f"I{r}", f'=IF(AND(ISNUMBER(G{r}),ISNUMBER(H{r})),H{r}-G{r},"")', "res", "0.00")
    put(T, f"J{r}", f'=IF(AND(ISNUMBER(I{r}),G{r}>0),I{r}/G{r},"")', "res", "0.0%")
    put(T, f"K{r}", f"=BASE!Q{r}", "res", "0%")
    put(T, f"L{r}", f'=IF(BASE!C{r}="","",IF(BASE!H{r}="","PENDENTE: tempo padrão",IF(BASE!I{r}="","tempo real ausente (usa padrão)","")))', "pend")
T.freeze_panes = "A6"; T.auto_filter.ref = f"A5:L{B1}"; widths(T, {"A": 10, "B": 12, "C": 14, "D": 14, "L": 30}); [setattr(T.column_dimensions[L(c)], "width", 13) for c in range(5, 12)]

# ---------------------------------------------------------------- DEMANDA_CARGA
title(DC, "DEMANDA E CARGA — cenário em análise", "Carga por linha da BASE no cenário escolhido no Dashboard. Gargalo do fluxo = recurso de maior utilização entre as linhas da mesma peça/modelo.")
hdr(DC, 5, ["Família", "Modelo", "Peça", "Processo", "Célula", "Máquina", "Demanda ajustada (pç)", "Carga h-homem", "Carga h-máquina", "Utilização do recurso", "Gargalo do fluxo", "Ordem (h total)", "", "Família", "Demanda (pç)", "Carga h-homem", "Carga h-máquina"])
ps = lambda row: f"INDEX(PARAMETROS!$C${row}:$F${row},PARAMETROS!$C$9)"
for r in range(B0, B1 + 1):
    for col in "ABCDEF": put(DC, f"{col}{r}", f'=IF(BASE!{col}{r}="","",BASE!{col}{r})', "calc")
    put(DC, f"G{r}", f"=N(BASE!L{r})*{ps(25)}", "res", '#,##0;-#,##0;;@')
    t = f'IF({ps(27)}="Real",BASE!N{r},N(BASE!H{r}))'
    put(DC, f"H{r}", f'=IF(E{r}="",0,{ps(25)}/60*N(BASE!L{r})*BASE!P{r}*({t}*{ps(26)}+BASE!O{r}))', "res", HH)
    put(DC, f"I{r}", f'=IF(F{r}="",0,{ps(25)}/60*N(BASE!L{r})*({t}*{ps(26)}+BASE!O{r}))', "res", HH)
    put(DC, f"J{r}", (f'=MAX(IFERROR(INDEX(CAP_CELULA!$J$6:$J${5 + 4 * NC},(PARAMETROS!$C$9-1)*{NC}+MATCH(E{r},MAO_OBRA!$A$6:$A${5 + NC},0)),0),'
                      f'IFERROR(INDEX(USINAGEM!$I$6:$I${5 + 4 * NM},(PARAMETROS!$C$9-1)*{NM}+MATCH(F{r},PARAMETROS!$B$32:$B$37,0)),0))'), "res", PCT)
    put(DC, f"K{r}", f'=IF(AND(C{r}<>"",J{r}>0,J{r}=SUMPRODUCT(MAX(($B${B0}:$B${B1}=B{r})*($C${B0}:$C${B1}=C{r})*$J${B0}:$J${B1}))),"◄ GARGALO","")', "res")
    put(DC, f"L{r}", f"=H{r}+I{r}+ROW()/10000000", "calc", "0.00")
for k in range(NF):
    r = 6 + k
    put(DC, f"N{r}", f"=PARAMETROS!B{40 + k}", "calc")
    put(DC, f"O{r}", f"=SUMIF($A${B0}:$A${B1},N{r},$G${B0}:$G${B1})", "res", "#,##0")
    put(DC, f"P{r}", f"=SUMIF($A${B0}:$A${B1},N{r},$H${B0}:$H${B1})", "res", HH)
    put(DC, f"Q{r}", f"=SUMIF($A${B0}:$A${B1},N{r},$I${B0}:$I${B1})", "res", HH)
DC.conditional_formatting.add(f"K{B0}:K{B1}", FormulaRule(formula=[f'K{B0}<>""'], fill=VERM))
cf_util(DC, f"J{B0}:J{B1}")
DC.freeze_panes = "A6"; DC.auto_filter.ref = f"A5:L{B1}"; widths(DC, {"A": 10, "B": 12, "C": 14, "D": 14, "E": 11, "F": 11, "K": 14, "M": 3, "N": 10})
[setattr(DC.column_dimensions[L(c)], "width", 13) for c in (7, 8, 9, 10, 12, 15, 16, 17)]

# ---------------------------------------------------------------- DIAGNOSTICO / INSTRUCOES
title(DG, "DIAGNÓSTICO E LÓGICA DE CÁLCULO")
def lines(w, rows, start=3):
    for k, (a, b) in enumerate(rows):
        r = start + k; w.cell(r, 1, a).font = Font(bold=(b is None), color=AZUL if b is None else "000000", size=12 if b is None else 11)
        if b: w.cell(r, 2, b).alignment = Alignment(wrap_text=True, vertical="top")
lines(DG, [
    ("STATUS DOS ARQUIVOS DE ORIGEM", None),
    *([
    ("Arquivo analisado", "capacidade_usinagem.xlsx (Gilmar): 21 abas, 9 ocultas. Carregado: plano 12 meses por modelo (3. Production Plan), dias úteis e jornada (1.Available), tempos de usinagem UMC01/UMC02/NCBZ/HMC-16 (4.Load Time)."),
    ("Conferência (mês out/26)", "Carga calculada = original: UMC01 308,56 h, UMC02 268,86 h, NCBZ 95,07 h, HMC-16 245,12 h. Capacidade 1 turno = 146,47 h (igual). 2 turnos = 281,35 h vs 281,24 h do original (diferença 0,04%: o original usa média ponderada seg-qui/sex do 2º turno; aqui pausa fixa de 60 min)."),
    ("Resultado do plano atual", "Com 1 turno, UMC01 (211%), UMC02 (184%) e HMC-16 (167%) não atendem; NCBZ atende (65%). Com 2 turnos, UMC01 ainda fica em 110%; UMC02 96% e HMC-16 87% ficam em atenção."),
    ("Erros no original", "~5.600 células com erro (#REF!, #N/A, #DIV/0!, #VALUE!), concentradas nas abas ocultas 4.Load Time (Real/Padrão) e 9.Machine Load Time. Em 4.Load Time: Workload (E9) = SUM(...,#REF!) e Sogyodo (E12) quebrados; Sogyodo real 0,98 e 0,58 digitados à mão; PITCH-TIME (HE) = #DIV/0!."),
    ("Inconsistências", "(1) Fator 0,9 fixo dentro das fórmulas de Time per Model (agora parâmetro 'Fator de tempo'); (2) capacidade de máquina usa frequência e performance de funcionário (95,5% × 84,6%), sem considerar PM, setup ou tyorei da aba 8.Machine Available time; (3) nomes de modelos divergem entre abas (PC200 × PC200-8 × PC200-10M0), gerando #N/A em RESPOSIÇÃO e impedindo ligar a aba 9 ao plano."),
    ("Pendências de dados", "(1) 377 combinações peça×modelo da aba 4.Load Time sem tempo de usinagem (peças como U-Frame, Garfo, Canhão, Mancal, Haste, Bracket, Frame): só 42 linhas têm tempo; (2) setup, lote e tempo real não constam; (3) a aba 9 (tempos por jig/serra da Caldeiraria) não foi carregada por conflito de nomes de modelo; (4) funcionários por célula (usar MAO_OBRA) — a aba CALDEIRARIA do arquivo é lista nominal e não foi copiada por conter dados pessoais."),
    ("Sogyodo", "Definição adotada: carga ÷ capacidade (nominal por padrão; alternar em PARAMETROS C8). Confirmar a fórmula usada pela Komatsu."),
    ("Premissas HE", "Cenário Otimizado usa 0,8 h/dia de HE por turno (J22 do original) — o original soma HE sem aplicar eficiência; aqui aplica."),
    ] if REAL else [
    ("Planilhas originais", "Não carregadas nesta versão. Preencher BASE, PLANO e MAO_OBRA."),
    ("Premissas PROVISÓRIAS", "Dias úteis=22, turnos 06-14/14-22/22-06 com 60 min de pausa, eficiência 85% e disponibilidade 90%."),
    ("Sogyodo", "Definição adotada: carga ÷ capacidade."),
    ]),
    ("LÓGICA IMPLEMENTADA", None),
    ("Horas líquidas do turno", "MOD(término − início, 1)×24 − pausas/60 (aceita turno C que cruza meia-noite)."),
    ("Capacidade nominal (h-homem)", "Dias úteis × Σ(funcionários do turno × turno ativo × horas líquidas do turno)."),
    ("Capacidade efetiva", "Nominal × eficiência × disponibilidade do cenário."),
    ("Capacidade com HE", "Dias com HE × horas extras por turno × funcionários ativos × eficiência × disponibilidade (informada à parte, não soma na efetiva)."),
    ("Carga célula (h-homem)", "Fator demanda ÷ 60 × Σ[demanda × operadores × (tempo × fator tempo + setup÷lote)]."),
    ("Carga máquina (h-máquina)", "Mesma lógica sem operadores. Horas-homem e horas-máquina nunca são somadas entre si."),
    ("Utilização / Ociosidade / Déficit", "Carga ÷ cap. efetiva; ociosidade = MAX(0, saldo); déficit = MAX(0, −saldo)."),
    ("Func. adicionais", "Déficit ÷ horas efetivas por funcionário no mês (PARAMETROS linha 28)."),
    ("Gargalo do fluxo", "Processos em sequência NÃO são somados: o limitante da peça/modelo é o recurso de maior utilização (DEMANDA_CARGA, coluna Gargalo)."),
    ("Limitação conhecida", "Capacidade por célula assume mão de obra e carga confinadas à própria célula; a redistribuição entre células é feita editando MAO_OBRA."),
], 3)
widths(DG, {"A": 34, "B": 120})
title(IN, "INSTRUÇÕES")
lines(IN, [
    ("CÓDIGO DE CORES", None),
    ("Amarelo + texto azul", "Entrada editável."), ("Cinza", "Fórmula / dado vinculado. Não editar."), ("Verde", "Resultado calculado."), ("Salmão", "Pendência de dado."),
    ("PASSO A PASSO", None),
    ("1. PARAMETROS", "Confirmar dias úteis, turnos, pausas, eficiência, disponibilidade, limites do semáforo, lista de máquinas e famílias."),
    ("2. MAO_OBRA", "Cadastrar células e funcionários por turno em Atual, Ajustado e Otimizado (redistribuição = mover números entre células)."),
    ("3. BASE", "Colar dados reais: uma linha por peça×processo. Preencher célula (caldeiraria) e/ou máquina (usinagem)."),
    ("4. DASHBOARD", "Escolher cenário (C3) e família (C4). Tudo recalcula sozinho."),
    ("5. SIMULADOR", "Mudar célula, ±funcionários, turnos, HE, eficiência, fator de demanda (1,2 = +20%) e fator de tempo. Ver impacto imediato."),
    ("6. COMPARATIVO", "Ver os 4 cenários lado a lado."),
    ("INTERPRETAÇÃO", None),
    ("Verde", "Utilização abaixo do limite de atenção (PARAMETROS C6)."), ("Amarelo", "Entre C6 e C7: próximo do limite."), ("Vermelho", "≥ C7: capacidade insuficiente."),
    ("Filtros", "Use as setas de filtro nas abas BASE, CAP_CELULA, TEMPOS e DEMANDA_CARGA (família, modelo, célula, máquina). Turno: cenário/colunas de MAO_OBRA."),
    ("Expansão", "Até 15 células, 6 máquinas e 200 linhas na BASE. Para mais, estender intervalos."),
], 3)
widths(IN, {"A": 24, "B": 110})

wb.save(OUT); print("OK", OUT)
