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
