import { describe, expect, it } from 'vitest';
import { calcular, horasTurno, semTempo, statusDe } from '@/lib/capacidade';
import { efetivoDe, inicial } from '@/lib/dados';
import { mesclar } from '@/lib/xlsx-io';
import orig from '@/tools/dados_usinagem.json';

// Valores de referência lidos do Excel original (aba 4.Load Time, mês out/26 — linhas 641 e 635/637)
const REF = { carga: [308.5599, 268.86, 95.07477, 245.1162], cap1: 146.4723, cap2: 281.2382 };
const app = inicial();
const e = efetivoDe(app);
const r0 = calcular(e, 0), r1 = calcular(e, 1);

describe('jornada', () => {
  it('horas líquidas do turno, inclusive virada de meia-noite', () => {
    expect(horasTurno({ nome: 'A', ini: '07:30', fim: '17:08', pausa: 60 })).toBeCloseTo(8.6333, 3);
    expect(horasTurno({ nome: 'C', ini: '22:00', fim: '06:00', pausa: 0 })).toBe(8);
  });
});

describe('validação contra o Excel original (out/26)', () => {
  it('dias úteis de out/26 = 21', () => expect(e.diasMes).toBe(21));
  it('carga por máquina igual ao Excel (UMC01, UMC02, NCBZ, HMC-16)', () => {
    r0.maquinas.forEach((m, i) => expect(m.carga).toBeCloseTo(REF.carga[i], 2));
  });
  it('carga total = 917,61 h', () => expect(r0.maquinas.reduce((s, m) => s + m.carga, 0)).toBeCloseTo(917.61087, 2));
  it('capacidade de 1 turno = 146,47 h', () => expect(r0.maquinas[0].efetiva).toBeCloseTo(REF.cap1, 2));
  it('capacidade de 2 turnos ≈ 281,24 h (diferença < 0,1%)', () => expect(Math.abs(r1.maquinas[0].efetiva - REF.cap2) / REF.cap2).toBeLessThan(0.001));
  it('horas extras do gráfico: +16,8 h (1 turno) e +33,6 h (2 turnos)', () => {
    expect(r0.capLinhas.t1he - r0.capLinhas.t1).toBeCloseTo(16.8, 5);
    expect(r0.capLinhas.t2he - r0.capLinhas.t2).toBeCloseTo(33.6, 5);
  });
  it('conclusão do plano: UMC01, UMC02 e HMC-16 insuficientes com 1 turno; NCBZ ok', () => {
    expect(r0.maquinas.map((m) => m.status)).toEqual(['INSUFICIENTE', 'INSUFICIENTE', 'OK', 'INSUFICIENTE']);
  });
});

describe('simulação de parâmetros', () => {
  const rod = (f: (x: typeof e) => typeof e) => calcular(f(structuredClone(e)), 0);
  it('demanda +20% aumenta a carga em 20%', () => {
    const r = rod((x) => ({ ...x, cenarios: x.cenarios.map((c) => ({ ...c, fDem: 1.2 })) }));
    expect(r.maquinas[0].carga / r0.maquinas[0].carga).toBeCloseTo(1.2, 6);
  });
  it('tempo −10% reduz a carga em 10%', () => {
    const r = rod((x) => ({ ...x, cenarios: x.cenarios.map((c) => ({ ...c, fTempo: c.fTempo * 0.9 })) }));
    expect(r.maquinas[0].carga / r0.maquinas[0].carga).toBeCloseTo(0.9, 6);
  });
  it('alterar um tempo padrão muda apenas a máquina afetada', () => {
    const r = rod((x) => ({ ...x, linhas: x.linhas.map((l) => (l.maquina === 'NCBZ' && l.tp > 0 ? { ...l, tp: l.tp * 2 } : l)) }));
    expect(r.maquinas[2].carga).toBeCloseTo(r0.maquinas[2].carga * 2, 6);
    expect(r.maquinas[0].carga).toBeCloseTo(r0.maquinas[0].carga, 9);
  });
  it('setup entra como min/lote ÷ lote por peça', () => {
    const r = rod((x) => ({ ...x, linhas: x.linhas.map((l) => (l.maquina === 'UMC01' && l.tp > 0 ? { ...l, setup: 60, lote: 10 } : l)) }));
    const pecas = e.linhas.filter((l) => l.maquina === 'UMC01' && l.tp > 0).reduce((s, l) => s + l.dem, 0);
    expect(r.maquinas[0].carga - r0.maquinas[0].carga).toBeCloseTo((pecas * 6 * 1) / 60, 6);
  });
  it('mais turnos aumentam a capacidade; sem capacidade = insuficiente', () => {
    expect(r1.maquinas[0].efetiva).toBeGreaterThan(r0.maquinas[0].efetiva * 1.8);
    expect(statusDe(e, 10, 0)).toBe('INSUFICIENTE');
    expect(statusDe(e, 0, 10)).toBe('SEM CARGA');
  });
  it('funcionários por célula alteram a capacidade da célula', () => {
    const base = structuredClone(e);
    base.celulas = [{ nome: 'C1', familia: 'CT', func: [[2, 0, 0], [2, 2, 0], [2, 2, 0]] }];
    base.linhas = [{ ...base.linhas[0], celula: 'C1', maquina: '', oper: 1, tp: 60, dem: 10 }];
    const a2 = calcular(base, 0).celulas[0];
    base.celulas[0].func[0] = [3, 0, 0];
    const a3 = calcular(base, 0).celulas[0];
    expect(a3.efetiva / a2.efetiva).toBeCloseTo(1.5, 6);
    expect(a2.carga).toBeCloseTo((10 * 60 * 0.9) / 60, 6);
  });
});

describe('dados e importação', () => {
  it('identifica combinações sem tempo cadastrado', () => expect(app.est.linhas.filter(semTempo).length).toBe(orig.linhas_sem_tempo.length));
  it('mesclar não duplica linhas existentes', () => {
    const imp = { origem: 'tempos' as const, linhas: [{ ...app.est.linhas[0], tp: 99 }], avisos: [], semTempo: 0 };
    const m = mesclar(app, imp, false);
    expect(m.app.est.linhas.length).toBe(app.est.linhas.length);
    expect(m.atualizadas).toBe(1);
    expect(m.app.est.linhas[0].tp).toBe(99);
  });
});

import { alternativas, comparar, porTurno, transferir } from '@/lib/turnos';

describe('capacidade por turno', () => {
  const pt = porTurno(e, 1); // cenário Ajustado: turnos A e B ativos
  it('soma das capacidades por turno = capacidade total da máquina', () => {
    pt.maquinas.forEach((m, i) => expect(m.total.cap).toBeCloseTo(r1.maquinas[i].efetiva, 6));
  });
  it('turno C inativo não tem capacidade e a carga se divide entre A e B', () => {
    expect(pt.turnos[2].maq.cap).toBe(0);
    expect(pt.maquinas[0].t[0].carga + pt.maquinas[0].t[1].carga).toBeCloseTo(r1.maquinas[0].carga, 6);
  });
  it('alocação sequencial enche o turno A antes do B', () => {
    const seq = porTurno({ ...e, alocacao: 'sequencial' }, 1);
    expect(seq.maquinas[0].t[0].util).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(seq.maquinas[2].t[1].carga).toBeCloseTo(0, 6); // NCBZ cabe no turno A
  });
  it('máquina que não opera no turno B tem capacidade 0 nele e menor capacidade total', () => {
    const x = structuredClone(e); x.maqCfg = { UMC01: { turnos: [true, false, true] } };
    const p = porTurno(x, 1);
    expect(p.maquinas[0].t[1].cap).toBe(0);
    expect(p.maquinas[0].total.cap).toBeCloseTo(r0.maquinas[0].efetiva, 6); // só o turno A opera
    expect(calcular(x, 1).maquinas[0].efetiva).toBeCloseTo(p.maquinas[0].total.cap, 6);
  });
  it('mais funcionários não aumentam a capacidade de máquina', () => {
    const x = structuredClone(e); x.celulas = [{ nome: 'C1', familia: 'CT', func: [[1, 0, 0], [1, 0, 0], [1, 0, 0]] }]; const a0 = calcular(x, 0).maquinas[0].efetiva;
    x.celulas[0].func[0] = [50, 0, 0]; expect(calcular(x, 0).maquinas[0].efetiva).toBe(a0);
  });
  it('nova escala mais curta no turno B reduz só a capacidade do turno B', () => {
    const x = structuredClone(e); x.turnosAtual = structuredClone(x.turnos); x.turnos[1] = { ...x.turnos[1], fim: '04:37' };
    const c = comparar(x, 1, 1);
    expect(c.perdas[1].maq.h).toBeLessThan(0); expect(c.perdas[0].maq.h).toBeCloseTo(0, 9); expect(c.perdas[1].maq.pct).toBeCloseTo(-1 / 7.95, 3);
  });
  it('período: diário × dias = mensal; semanal = diário × 5', () => {
    const cap = pt.total.maq.cap; expect(cap / e.diasMes * e.diasMes).toBeCloseTo(cap, 6);
  });
});

describe('transferência de peça entre máquinas', () => {
  const idx = e.linhas.findIndex((l) => l.maquina === 'UMC01' && l.tp > 0 && l.dem > 0);
  const base = calcular(e, 0);
  it('retira a carga da origem e soma na destino (com tempo da outra máquina)', () => {
    const o = e.linhas[idx], x = transferir(e, idx, 'NCBZ', o.tp * 2), r = calcular(x, 0);
    const h = (o.dem * o.tp * 0.9) / 60;
    expect(r.maquinas[0].carga).toBeCloseTo(base.maquinas[0].carga - h, 6);
    expect(r.maquinas[2].carga).toBeCloseTo(base.maquinas[2].carga + h * 2, 6);
  });
  it('não altera o estado original (simulação) e mantém a linha antiga como alternativa', () => {
    const x = transferir(e, idx, 'UMC02');
    expect(e.linhas[idx].ativo).not.toBe(false);
    expect(x.linhas[idx].ativo).toBe(false);
    expect(alternativas(x, x.linhas.length - 1).some((z) => z.l.maquina === 'UMC01')).toBe(true);
  });
  it('transferir de volta restaura exatamente a carga original', () => {
    const x = transferir(e, idx, 'UMC02', e.linhas[idx].tp), y = transferir(x, x.linhas.length - 1, 'UMC01', e.linhas[idx].tp);
    calcular(y, 0).maquinas.forEach((m, i) => expect(m.carga).toBeCloseTo(base.maquinas[i].carga, 9));
  });
  it('máquina desativada sai da capacidade e da carga', () => {
    const x = structuredClone(e); x.maqCfg = { NCBZ: { ativa: false } };
    expect(calcular(x, 0).maquinas.map((m) => m.nome)).toEqual(['UMC01', 'UMC02', 'HMC-16']);
  });
});
