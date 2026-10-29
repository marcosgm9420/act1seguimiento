import { ChangeDetectionStrategy, Component, computed, effect, input, model, output, signal } from '@angular/core';
import { IonButton, IonIcon, IonSearchbar, IonSkeletonText } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, createOutline, trashOutline, arrowUp, arrowDown } from 'ionicons/icons';
import { RowAction, TableColumn } from '../../../models';

/** Normaliza un texto para buscar sin distinguir mayúsculas ni tildes. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Valor de una celda ya formateado como texto. */
export function cellText<T>(column: TableColumn<T>, row: T): string {
  const value = row[column.key];
  return column.format ? column.format(value, row) : String(value ?? '');
}

/**
 * Tabla de datos reutilizable con buscador, ordenación y paginación.
 *
 * Es agnóstica de la vista que la contiene: recibe columnas y filas por `input()`
 * y comunica las acciones al padre mediante eventos (`action`, `filteredChange`).
 * El texto de búsqueda admite *two-way binding*: `[(search)]="texto"`.
 *
 * En móvil cada fila se muestra como una tarjeta (diseño *mobile-first*).
 */
@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonSearchbar, IonButton, IonIcon, IonSkeletonText],
})
export class DataTableComponent<T extends { id: number | string }> {
  /** Columnas a mostrar. */
  readonly columns = input.required<TableColumn<T>[]>();
  /** Filas de datos. */
  readonly rows = input.required<T[]>();
  /** Título accesible de la tabla (`<caption>`). */
  readonly caption = input.required<string>();
  /** Muestra el estado de carga. */
  readonly loading = input(false);
  /** Muestra los botones de editar y eliminar. */
  readonly editable = input(false);
  /** Filas por página. */
  readonly pageSize = input(10);
  /** Marca visualmente algunas filas (por ejemplo, stock bajo). */
  readonly highlight = input<(row: T) => boolean>(() => false);
  /** Texto que acompaña a las filas marcadas (lectores de pantalla). */
  readonly highlightLabel = input('Destacado');
  /** Campo usado para describir la fila en los botones (accesibilidad). */
  readonly rowLabelKey = input<keyof T & string>();

  /** Texto de búsqueda (two-way binding). */
  readonly search = model('');

  /** Se emite al pulsar editar, eliminar o una fila. */
  readonly action = output<RowAction<T>>();
  /** Se emite con las filas que cumplen el filtro (para exportar lo que se ve). */
  readonly filteredChange = output<T[]>();

  protected readonly sortKey = signal<(keyof T & string) | null>(null);
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(0);
  protected readonly skeletonRows = [1, 2, 3, 4, 5];

  /** Filas que cumplen la búsqueda, ya ordenadas. */
  protected readonly filtered = computed(() => {
    const term = normalizeText(this.search().trim());
    const columns = this.columns();
    let rows = this.rows();
    if (term) {
      rows = rows.filter((row) => columns.some((col) => normalizeText(cellText(col, row)).includes(term)));
    }
    const key = this.sortKey();
    if (key) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        if (typeof va === 'number' && typeof vb === 'number') {
          return (va - vb) * dir;
        }
        return String(va).localeCompare(String(vb), 'es', { numeric: true }) * dir;
      });
    }
    return rows;
  });

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pageCount() - 1));
  protected readonly visibleRows = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  constructor() {
    addIcons({ chevronBack, chevronForward, createOutline, trashOutline, arrowUp, arrowDown });
    effect(() => this.filteredChange.emit(this.filtered()));
  }

  protected text(column: TableColumn<T>, row: T): string {
    return cellText(column, row);
  }

  protected rowLabel(row: T): string {
    const key = this.rowLabelKey();
    return key ? String(row[key]) : String(row.id);
  }

  protected onSearch(value: string | null | undefined): void {
    this.search.set(value ?? '');
    this.page.set(0);
  }

  /** Cambia la ordenación al pulsar una cabecera. */
  protected toggleSort(column: TableColumn<T>): void {
    if (column.sortable === false) {
      return;
    }
    if (this.sortKey() === column.key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(column.key);
      this.sortDir.set('asc');
    }
  }

  protected ariaSort(column: TableColumn<T>): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== column.key) {
      return 'none';
    }
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  protected goTo(page: number): void {
    this.page.set(Math.min(Math.max(page, 0), this.pageCount() - 1));
  }

  protected emit(action: RowAction<T>['action'], row: T): void {
    this.action.emit({ action, row });
  }
}
