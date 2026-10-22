"""Extrai (sem dados pessoais) plano, dias úteis e tempos de usinagem do Excel do Gilmar -> tools/dados_usinagem.json"""
import sys, json, datetime, openpyxl
src = sys.argv[1]
v = openpyxl.load_workbook(src, data_only=True)
pl = v["3. Production Plan"]; av = v["1.Available"]; lt = v["4.Load Time"]
meses = [pl.cell(4, c).value for c in range(3, 15)]
pt = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
lab = [f"{pt[m.month - 1]}/{str(m.year)[2:]}" for m in meses]
fam = lambda m: "CT" if m.startswith("D") else "WL/WA" if m.startswith("WA") else "MG" if m.startswith("GD") else "HE/PC"
plano = [{"modelo": pl.cell(r, 2).value, "familia": fam(pl.cell(r, 2).value), "qtd": [pl.cell(r, c).value or 0 for c in range(3, 15)]}
         for r in range(5, 26) if pl.cell(r, 2).value]
dias = [av.cell(r, 3).value for r in range(22, 34)]
maqs = [lt.cell(16, c).value for c in range(5, 9)]
linhas, sem_tempo, proc = [], 0, None
for r in range(17, 528):
    if lt.cell(r, 3).value: proc = lt.cell(r, 3).value
    mod = lt.cell(r, 4).value
    if not mod: continue
    vals = [lt.cell(r, c).value for c in range(5, 9)]
    ok = False
    for m, x in zip(maqs, vals):
        if isinstance(x, (int, float)) and x > 0:
            linhas.append({"familia": fam(mod), "modelo": mod, "peca": proc, "maquina": m, "tp": round(x, 4)}); ok = True
    if not ok: sem_tempo += 1
orig = {"mes": lab[6], "maq": maqs, "carga_out26": [round(lt.cell(641, c).value, 4) for c in range(5, 9)],
        "cap_1turno": round(lt.cell(635, 5).value, 4), "cap_2turnos": round(lt.cell(637, 5).value, 4)}
json.dump({"meses": lab, "dias": dias, "plano": plano, "maquinas": maqs, "linhas": linhas, "sem_tempo": sem_tempo, "orig": orig}, open("tools/dados_usinagem.json", "w"), ensure_ascii=False, indent=1)
print(len(linhas), "linhas;", sem_tempo, "peça×modelo sem tempo;", orig)
