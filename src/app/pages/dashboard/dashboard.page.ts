import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonSelect, IonSelectOption, IonButton,
  IonIcon, IonCard, IonCardContent, IonText, IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cubeOutline, layersOutline, cashOutline, alertCircleOutline, documentTextOutline, gridOutline, refreshOutline,
} from 'ionicons/icons';
import { catchError, debounceTime, EMPTY, forkJoin, merge, startWith, Subject, switchMap } from 'rxjs';
import { ExportService } from '../../core/services/export.service';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { StockEventsService } from '../../core/services/stock-events.service';
import { Category, Product, StockEvent, TableColumn } from '../../models';
import { ChartComponent, ChartSelection, ChartSeries } from '../../shared/components/chart/chart.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { formatCurrency, formatNumber, todayStamp } from '../../shared/format';
import { isLowStock, PRODUCT_COLUMNS } from '../products/products.page';

/** Valor del filtro "todas las categorías". */
const ALL = 0;

/** Resumen por categoría para gráficos e informe. */
interface CategorySummary {
  id: number;
  name: string;
  products: string;
  units: string;
  value: string;
  lowStock: string;
}

const SUMMARY_COLUMNS: TableColumn<CategorySummary>[] = [
  { key: 'name', label: 'Categoría' },
  { key: 'products', label: 'Productos', align: 'end' },
  { key: 'units', label: 'Unidades', align: 'end' },
  { key: 'value', label: 'Valor', align: 'end' },
  { key: 'lowStock', label: 'Stock bajo', align: 'end' },
];

/** Últimos `days` días como etiquetas `dd/mm` y claves `AAAA-MM-DD`. */
function lastDays(days: number): { key: string; label: string }[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toLocaleDateString('sv-SE');
    return { key, label: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) };
  });
}

/**
 * Cuadro de mando del administrador.
 *
 * Combina de forma concurrente la API REST (SQL: productos y categorías, con
 * `forkJoin`) y la colección en tiempo real (NoSQL: movimientos). Cada nuevo
 * movimiento refresca los indicadores. El filtro de categoría se aplica al
 * instante a KPIs, gráficos y tabla.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, StatCardComponent, ChartComponent, DataTableComponent, IonHeader, IonToolbar, IonButtons,
    IonMenuButton, IonTitle, IonContent, IonSelect, IonSelectOption, IonButton, IonIcon, IonCard, IonCardContent,
    IonText, IonSpinner,
  ],
})
export class DashboardPage implements OnInit {
  private readonly api = inject(InventoryApiService);
  private readonly eventsService = inject(StockEventsService);
  private readonly exporter = inject(ExportService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly productColumns = PRODUCT_COLUMNS;

  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly events = signal<StockEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly reload$ = new Subject<void>();

  /** Categoría seleccionada en el filtro (two-way binding con `ngModel`). */
  protected readonly categoryFilter = signal<number>(ALL);
  /** Mostrar en la tabla solo productos con stock bajo. */
  protected readonly onlyLowStock = signal(true);

  protected readonly filteredProducts = computed(() => {
    const category = this.categoryFilter();
    return category === ALL ? this.products() : this.products().filter((p) => p.categoryId === category);
  });

  protected readonly tableRows = computed(() =>
    this.onlyLowStock() ? this.filteredProducts().filter(isLowStock) : this.filteredProducts(),
  );

  protected readonly kpis = computed(() => {
    const list = this.filteredProducts();
    const units = list.reduce((sum, p) => sum + p.stock, 0);
    const value = list.reduce((sum, p) => sum + p.stock * p.price, 0);
    return {
      products: formatNumber(list.length),
      units: formatNumber(units),
      value: formatCurrency(value),
      lowStock: list.filter(isLowStock).length,
    };
  });

  /** Resumen agrupado por categoría (respeta el filtro). */
  protected readonly summary = computed<CategorySummary[]>(() => {
    const selected = this.categoryFilter();
    return this.categories()
      .filter((c) => selected === ALL || c.id === selected)
      .map((c) => {
        const items = this.products().filter((p) => p.categoryId === c.id);
        return {
          id: c.id,
          name: c.name,
          products: formatNumber(items.length),
          units: formatNumber(items.reduce((s, p) => s + p.stock, 0)),
          value: formatCurrency(items.reduce((s, p) => s + p.stock * p.price, 0)),
          lowStock: formatNumber(items.filter(isLowStock).length),
        };
      });
  });

  protected readonly chartLabels = computed(() => this.summary().map((s) => s.name));

  protected readonly unitsSeries = computed<ChartSeries[]>(() => [
    {
      label: 'Unidades en stock',
      data: this.summary().map((s) =>
        this.products().filter((p) => p.categoryId === s.id).reduce((sum, p) => sum + p.stock, 0),
      ),
    },
  ]);

  protected readonly valueSeries = computed<ChartSeries[]>(() => [
    {
      label: 'Valor (€)',
      data: this.summary().map((s) =>
        Math.round(
          this.products().filter((p) => p.categoryId === s.id).reduce((sum, p) => sum + p.stock * p.price, 0),
        ),
      ),
    },
  ]);

  private readonly days = lastDays(7);
  protected readonly dayLabels = this.days.map((d) => d.label);

  /** Entradas y salidas de los últimos 7 días (de la colección en tiempo real). */
  protected readonly movementSeries = computed<ChartSeries[]>(() => {
    const skus = new Set(this.filteredProducts().map((p) => p.sku));
    const count = (type: 'entrada' | 'salida') =>
      this.days.map(({ key }) =>
        this.events()
          .filter(
            (e) =>
              e.doc.type === type &&
              e.doc.sku !== undefined &&
              skus.has(e.doc.sku) &&
              new Date(e.createdAt).toLocaleDateString('sv-SE') === key,
          )
          .reduce((sum, e) => sum + (e.doc.quantity ?? 0), 0),
      );
    return [
      { label: 'Entradas', data: count('entrada') },
      { label: 'Salidas', data: count('salida') },
    ];
  });

  constructor() {
    addIcons({
      cubeOutline, layersOutline, cashOutline, alertCircleOutline, documentTextOutline, gridOutline, refreshOutline,
    });
  }

  ngOnInit(): void {
    // Orquestación asíncrona: los movimientos llegan en tiempo real y cada cambio
    // vuelve a pedir productos y categorías en paralelo (forkJoin).
    const events$ = this.eventsService.events$;

    events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (events) => this.events.set(events),
      error: () => this.events.set([]),
    });

    merge(events$.pipe(debounceTime(300), catchError(() => EMPTY)), this.reload$)
      .pipe(
        startWith(null),
        switchMap(() =>
          forkJoin({ products: this.api.getProducts(), categories: this.api.getCategories() }).pipe(
            catchError((err: Error) => {
              this.error.set(err.message);
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ products, categories }) => {
        this.products.set(products);
        this.categories.set(categories);
        this.loading.set(false);
        this.error.set(null);
      });
  }

  /** Al pulsar una barra del gráfico se filtra por esa categoría. */
  protected onChartSelect(selection: ChartSelection): void {
    const category = this.summary()[selection.index];
    if (category) {
      this.categoryFilter.set(this.categoryFilter() === category.id ? ALL : category.id);
    }
  }

  protected showLowStock(): void {
    this.onlyLowStock.set(true);
    document.getElementById('tabla-stock')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected retry(): void {
    this.loading.set(true);
    this.reload$.next();
  }

  protected categoryName(): string {
    const id = this.categoryFilter();
    return id === ALL ? 'Todas las categorías' : (this.categories().find((c) => c.id === id)?.name ?? '');
  }

  protected exportCsv(): void {
    this.exporter.exportCsv({
      title: 'Resumen por categoría',
      fileName: `cuadro-de-mando-${todayStamp()}`,
      columns: SUMMARY_COLUMNS,
      rows: this.summary(),
    });
  }

  protected async exportPdf(): Promise<void> {
    const k = this.kpis();
    await this.exporter.exportPdf({
      title: 'Cuadro de mando · Resumen por categoría',
      subtitle: `${this.categoryName()} · ${k.products} productos · ${k.units} unidades · valor ${k.value} · ${k.lowStock} con stock bajo`,
      fileName: `cuadro-de-mando-${todayStamp()}`,
      columns: SUMMARY_COLUMNS,
      rows: this.summary(),
    });
  }
}
