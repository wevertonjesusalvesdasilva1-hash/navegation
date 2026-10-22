import * as XLSX from 'xlsx';
import { Linha, calcular } from '@/lib/capacidade';
import { App, Plano, efetivoDe } from '@/lib/dados';

export type Importacao = { origem: 'original' | 'tempos'; plano?: Plano[]; dias?: number[]; meses?: string[]; maquinas?: string[]; linhas: Linha[]; avisos: string[]; semTempo: number };
const PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fam = (m: string) => (m.startsWith('D') ? 'CT' : m.startsWith('WA') ? 'WL/WA' : m.startsWith('GD') ? 'MG' : 'HE/PC');
const num = (x: unknown) => { const n = typeof x === 'number' ? x : parseFloat(String(x ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const txt = (x: unknown) => (x == null ? '' : String(x).trim());
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
const mk = (o: Partial<Linha>): Linha => ({ familia: '', modelo: '', peca: '', processo: 'USINAGEM', celula: '', maquina: '', oper: 1, tp: 0, tr: 0, setup: 0, lote: 0, dem: 0, ...o });

export async function lerExcel(file: File): Promise<Importacao> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  // força o início em A1 para que índices de linha/coluna coincidam com os do Excel (algumas abas começam em B2 etc.)
  const grade = (n: string) => { const ws = wb.Sheets[n]; const rg = XLSX.utils.decode_range(ws['!ref'] ?? 'A1'); return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, range: { s: { r: 0, c: 0 }, e: rg.e } }); };
  const avisos: string[] = [];
  if (wb.SheetNames.includes('4.Load Time') && wb.SheetNames.includes('3. Production Plan')) {
    const pl = grade('3. Production Plan'), lt = grade('4.Load Time');
    const meses = (pl[3] ?? []).slice(2, 14).map((v) => (v instanceof Date ? `${PT[v.getMonth()]}/${String(v.getFullYear()).slice(2)}` : txt(v)));
    const plano: Plano[] = [];
    for (let r = 4; r <= 24; r++) { const m = txt(pl[r]?.[1]); if (m) plano.push({ modelo: m, familia: fam(m), qtd: (pl[r] as unknown[]).slice(2, 14).map(num) }); }
    let dias: number[] | undefined;
    if (wb.SheetNames.includes('1.Available')) { const av = grade('1.Available'); dias = []; for (let r = 21; r <= 32; r++) dias.push(num(av[r]?.[2])); }
    else avisos.push('Aba 1.Available não encontrada: dias úteis mantidos.');
    const maquinas = (lt[15] ?? []).slice(4, 8).map(txt).filter(Boolean);
    const linhas: Linha[] = []; let proc = '';
    for (let r = 16; r <= 526; r++) {
      const row = lt[r] ?? []; if (txt(row[2])) proc = txt(row[2]);
      const mod = txt(row[3]); if (!mod || !proc) continue;
      let ok = false;
      maquinas.forEach((m, k) => { const t = num(row[4 + k]); if (t > 0) { linhas.push(mk({ familia: fam(mod), modelo: mod, peca: proc, maquina: m, tp: t })); ok = true; } });
      if (!ok) linhas.push(mk({ familia: fam(mod), modelo: mod, peca: proc }));
    }
    if (plano.length === 0) avisos.push('Plano de produção vazio.');
    return { origem: 'original', plano, dias, meses, maquinas, linhas, avisos, semTempo: linhas.filter((l) => !(l.tp > 0)).length };
  }
  // planilha de tempos (modelo exportado pelo próprio app ou tabela com os mesmos títulos)
  for (const n of wb.SheetNames) {
    const g = grade(n); const hi = g.findIndex((r) => r?.some((c) => norm(txt(c)) === 'modelo') && r?.some((c) => norm(txt(c)).startsWith('tempopadrao')));
    if (hi < 0) continue;
    const idx: Record<string, number> = {}; (g[hi] as unknown[]).forEach((c, i) => { idx[norm(txt(c))] = i; });
    const col = (...k: string[]) => k.map((x) => idx[x]).find((v) => v !== undefined);
    const c = { fam: col('familia'), mod: col('modelo'), pec: col('peca'), pro: col('processo'), cel: col('celula'), maq: col('maquina'), tp: col('tempopadrao', 'tempopadraomin'), tr: col('temporeal', 'temporealmin'), su: col('setup', 'setupminlote'), lo: col('lote', 'lotepc') };
    const linhas: Linha[] = [];
    g.slice(hi + 1).forEach((row, i) => {
      if (!row || !txt(row[c.mod!])) return;
      const m = txt(row[c.mod!]);
      linhas.push(mk({ familia: c.fam !== undefined ? txt(row[c.fam]) || fam(m) : fam(m), modelo: m, peca: c.pec !== undefined ? txt(row[c.pec]) : '', processo: c.pro !== undefined ? txt(row[c.pro]) || 'USINAGEM' : 'USINAGEM', celula: c.cel !== undefined ? txt(row[c.cel]) : '', maquina: c.maq !== undefined ? txt(row[c.maq]) : '', tp: c.tp !== undefined ? num(row[c.tp]) : 0, tr: c.tr !== undefined ? num(row[c.tr]) : 0, setup: c.su !== undefined ? num(row[c.su]) : 0, lote: c.lo !== undefined ? num(row[c.lo]) : 0 }));
      if (c.tp === undefined) avisos.push(`Linha ${hi + i + 2}: sem coluna de tempo padrão.`);
    });
    return { origem: 'tempos', linhas, avisos, semTempo: linhas.filter((l) => !(l.tp > 0)).length };
  }
  throw new Error('Formato não reconhecido. Use o arquivo original (abas "3. Production Plan" e "4.Load Time") ou uma planilha com as colunas Família, Modelo, Peça, Processo, Célula, Máquina, Tempo padrão, Tempo real.');
}

const chave = (l: Linha) => `${l.modelo}|${l.peca}|${l.processo}|${l.maquina}|${l.celula}`;
/** Mescla evitando duplicidades: linhas com a mesma chave só atualizam os tempos informados (>0). */
export function mesclar(a: App, imp: Importacao, substituir: boolean): { app: App; novas: number; atualizadas: number } {
  const n = structuredClone(a); let novas = 0, atualizadas = 0;
  if (imp.plano?.length) n.plano = imp.plano;
  if (imp.dias?.length === 12 && imp.dias.every((d) => d > 0)) n.dias = imp.dias;
  if (imp.meses?.length === 12 && imp.plano?.length) n.meses = imp.meses;
  if (imp.maquinas?.length) n.est.maquinas = Array.from(new Set([...n.est.maquinas, ...imp.maquinas]));
  if (substituir) { n.est.linhas = imp.linhas; novas = imp.linhas.length; return { app: n, novas, atualizadas }; }
  const mapa = new Map(n.est.linhas.map((l, i) => [chave(l), i]));
  for (const l of imp.linhas) {
    const i = mapa.get(chave(l));
    if (i === undefined) { n.est.linhas.push(l); mapa.set(chave(l), n.est.linhas.length - 1); novas++; }
    else { const o = n.est.linhas[i]; let ch = false; for (const k of ['tp', 'tr', 'setup', 'lote'] as const) if (l[k] > 0 && o[k] !== l[k]) { o[k] = l[k]; ch = true; } if (ch) atualizadas++; }
  }
  return { app: n, novas, atualizadas };
}

export function exportarExcel(a: App) {
  const e = efetivoDe(a); const wb = XLSX.utils.book_new();
  const res = e.cenarios.map((_, i) => calcular(e, i));
  const soma = (x: ReturnType<typeof calcular>, k: 'efetiva' | 'carga' | 'deficit' | 'ocioso') => x.maquinas.reduce((s, m) => s + m[k], 0);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Indicador (usinagem)', ...e.cenarios.map((c) => c.nome)],
    ['Capacidade efetiva (h)', ...res.map((r) => soma(r, 'efetiva'))], ['Carga (h)', ...res.map((r) => soma(r, 'carga'))],
    ['Utilização', ...res.map((r) => (soma(r, 'efetiva') ? soma(r, 'carga') / soma(r, 'efetiva') : 0))], ['Horas excedentes / HE necessárias (h)', ...res.map((r) => soma(r, 'deficit'))],
    ['Horas ociosas (h)', ...res.map((r) => soma(r, 'ocioso'))], ['Máquinas insuficientes', ...res.map((r) => r.maquinas.filter((m) => m.status === 'INSUFICIENTE').length)]]), 'Resumo');
  const r = res[a.sel];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.maquinas.map((m) => ({ Máquina: m.nome, 'Capacidade (h)': m.efetiva, 'Carga (h)': m.carga, Utilização: m.util, 'Saldo (h)': m.saldo, 'HE necessária (h)': m.deficit, Sogyodo: m.sogyodo, Status: m.status }))), `Máquinas ${e.cenarios[a.sel].nome}`.slice(0, 31));
  const modelos = Array.from(new Set(Object.values(r.pilha).flatMap((o) => Object.keys(o))));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Máquina', ...modelos, '1 turno', '1 turno+HE', '2 turnos', '2 turnos+HE'], ...r.maquinas.map((m) => [m.nome, ...modelos.map((x) => r.pilha[m.nome]?.[x] ?? 0), r.capLinhas.t1, r.capLinhas.t1he, r.capLinhas.t2, r.capLinhas.t2he])]), 'Carga por modelo');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(a.est.linhas.map((l) => ({ Família: l.familia, Modelo: l.modelo, Peça: l.peca, Processo: l.processo, Célula: l.celula, Máquina: l.maquina, 'Tempo padrão (min)': l.tp, 'Tempo real (min)': l.tr, 'Setup (min/lote)': l.setup, 'Lote (pç)': l.lote }))), 'Tempos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Modelo', 'Família', ...a.meses], ['Dias úteis', '', ...a.dias], ...a.plano.map((p) => [p.modelo, p.familia, ...p.qtd])]), 'Plano');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(a.est.turnos.map((t) => ({ Turno: t.nome, Entrada: t.ini, Saída: t.fim, 'Pausa (min)': t.pausa }))), 'Turnos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(a.hist.map((h) => ({ Quando: new Date(h.t).toLocaleString('pt-BR'), Quem: h.quem, Campo: h.campo, De: h.de, Para: h.para }))), 'Histórico');
  XLSX.writeFile(wb, `capacidade_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
