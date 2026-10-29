import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RowAction, TableColumn } from '../../../models';
import { DataTableComponent, normalizeText } from './data-table.component';

interface Item {
  id: number;
  name: string;
  stock: number;
}

@Component({
  imports: [DataTableComponent],
  template: `
    <app-data-table
      caption="Prueba"
      [columns]="columns"
      [rows]="rows"
      [editable]="true"
      rowLabelKey="name"
      [(search)]="search"
      (filteredChange)="filtered = $event"
      (action)="last = $event"
    ></app-data-table>
  `,
})
class HostComponent {
  columns: TableColumn<Item>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'stock', label: 'Stock', align: 'end' },
  ];
  rows: Item[] = [
    { id: 1, name: 'Ratón ergonómico', stock: 4 },
    { id: 2, name: 'Teclado', stock: 42 },
    { id: 3, name: 'Monitor', stock: 18 },
  ];
  search = signal('');
  filtered: Item[] = [];
  last: RowAction<Item> | null = null;
}

async function render() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('DataTableComponent', () => {
  it('normaliza textos ignorando tildes y mayúsculas', () => {
    expect(normalizeText('ErgonÓMICO')).toBe('ergonomico');
  });

  it('muestra todas las filas sin filtro', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(3);
    expect(fixture.componentInstance.filtered.length).toBe(3);
  });

  it('filtra por el texto de búsqueda (two-way binding) sin distinguir tildes', async () => {
    const fixture = await render();
    fixture.componentInstance.search.set('raton');
    fixture.detectChanges();
    await fixture.whenStable();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Ratón ergonómico');
    expect(fixture.componentInstance.filtered.map((i) => i.id)).toEqual([1]);
  });

  it('emite el evento de edición al componente padre', async () => {
    const fixture = await render();
    const editButton: HTMLElement = fixture.nativeElement.querySelector('tbody tr:nth-child(2) ion-button');
    editButton.click();
    expect(fixture.componentInstance.last).toEqual({ action: 'edit', row: fixture.componentInstance.rows[1] });
  });

  it('ordena por columna y actualiza aria-sort', async () => {
    const fixture = await render();
    const sortButtons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('th button.sort'));
    sortButtons[1].click(); // Stock ascendente
    fixture.detectChanges();
    await fixture.whenStable();
    const firstCell = fixture.nativeElement.querySelector('tbody tr td');
    expect(firstCell.textContent).toContain('Ratón');
    expect(sortButtons[1].closest('th')?.getAttribute('aria-sort')).toBe('ascending');
  });
});
