import { TableColumn } from '../../models';
import { buildCsv, escapeCsv } from './export.service';

interface Row {
  id: number;
  name: string;
  price: number;
}

const columns: TableColumn<Row>[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'price', label: 'Precio', format: (v) => `${(v as number).toFixed(2)} €` },
];

describe('Exportación CSV', () => {
  it('escapa comillas, saltos de línea y separadores', () => {
    expect(escapeCsv('simple')).toBe('simple');
    expect(escapeCsv('con "comillas"')).toBe('"con ""comillas"""');
    expect(escapeCsv('a;b')).toBe('"a;b"');
    expect(escapeCsv('línea\nnueva')).toBe('"línea\nnueva"');
  });

  it('genera cabecera, filas formateadas y BOM UTF-8 para Excel', () => {
    const csv = buildCsv(columns, [
      { id: 1, name: 'Monitor', price: 139.9 },
      { id: 2, name: 'Cable "HDMI"', price: 6.9 },
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual(['Nombre;Precio', 'Monitor;139.90 €', '"Cable ""HDMI""";6.90 €']);
  });
});
