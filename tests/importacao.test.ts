import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { lerExcel, mesclar } from '@/lib/xlsx-io';
import { inicial } from '@/lib/dados';

const arq = 'dados/capacidade_usinagem.xlsx'; // arquivo original (não versionado: contém dados pessoais)
describe.skipIf(!existsSync(arq))('importação do Excel original do Gilmar', () => {
  it('lê plano, dias úteis e tempos iguais ao dataset embutido', async () => {
    const f = new File([readFileSync(arq)], 'x.xlsx');
    const imp = await lerExcel(f);
    const base = inicial();
    expect(imp.origem).toBe('original');
    expect(imp.plano!.length).toBe(base.plano.length);
    expect(imp.plano![0].qtd).toEqual(base.plano[0].qtd);
    expect(imp.dias).toEqual(base.dias);
    expect(imp.meses).toEqual(base.meses);
    expect(imp.linhas.length).toBe(base.est.linhas.length);
    expect(imp.semTempo).toBe(base.est.linhas.filter((l) => !(l.tp > 0)).length);
    const m = mesclar(base, imp, false);
    expect(m.novas).toBe(0); // reimportar o mesmo arquivo não duplica nada
  });
});
