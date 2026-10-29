import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, documentTextOutline, gridOutline, refreshOutline } from 'ionicons/icons';
import { AuthStore } from '../../core/auth/auth.store';
import { ExportService } from '../../core/services/export.service';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Product, RowAction, TableColumn } from '../../models';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { formatCurrency, formatDateTime, formatNumber, todayStamp } from '../../shared/format';

/** Columnas de la tabla (y de los informes) de productos. */
export const PRODUCT_COLUMNS: TableColumn<Product>[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Producto' },
  { key: 'categoryName', label: 'Categoría' },
  { key: 'stock', label: 'Stock', align: 'end', format: (v) => formatNumber(v as number) },
  { key: 'minStock', label: 'Mínimo', align: 'end', format: (v) => formatNumber(v as number) },
  { key: 'price', label: 'Precio', align: 'end', format: (v) => formatCurrency(v as number) },
  { key: 'updatedAt', label: 'Actualizado', format: (v) => formatDateTime(v as string) },
];

/** ¿El producto está por debajo de su stock mínimo? */
export const isLowStock = (p: Product): boolean => p.stock <= p.minStock;

/**
 * Listado de productos (todos los roles). El administrador puede crear,
 * editar y eliminar; todos pueden buscar y exportar a CSV/PDF.
 */
@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, DataTableComponent, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonButton,
    IonIcon, IonRefresher, IonRefresherContent, IonText,
  ],
})
export class ProductsPage {
  private readonly api = inject(InventoryApiService);
  private readonly exporter = inject(ExportService);
  private readonly notify = inject(NotificationService);
  private readonly alerts = inject(AlertController);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthStore);

  protected readonly columns = PRODUCT_COLUMNS;
  protected readonly isLowStock = isLowStock;

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  /** Texto del buscador (two-way binding con la tabla). */
  protected readonly search = signal('');
  /** Filas visibles tras el filtro (lo que se exporta). */
  protected readonly visible = signal<Product[]>([]);
  protected readonly lowStockCount = computed(() => this.products().filter(isLowStock).length);

  constructor() {
    addIcons({ addOutline, documentTextOutline, gridOutline, refreshOutline });
  }

  /** Ciclo de vida de Ionic: recarga al volver a la página (p. ej. tras editar). */
  ionViewWillEnter(): void {
    this.load();
  }

  /** Carga los productos desde la API REST. */
  protected load(done?: () => void): void {
    this.loading.set(this.products().length === 0);
    this.error.set(null);
    this.api
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.loading.set(false);
          done?.();
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
          done?.();
        },
      });
  }

  protected refresh(event: CustomEvent): void {
    this.load(() => (event.target as HTMLIonRefresherElement).complete());
  }

  /** Gestiona los eventos emitidos por la tabla. */
  protected async onAction({ action, row }: RowAction<Product>): Promise<void> {
    if (action === 'edit') {
      await this.router.navigate(['/productos', row.id, 'editar']);
    } else if (action === 'delete') {
      await this.confirmDelete(row);
    }
  }

  protected exportCsv(): void {
    this.exporter.exportCsv({
      title: 'Inventario de productos',
      fileName: `productos-${todayStamp()}`,
      columns: this.columns,
      rows: this.visible(),
    });
  }

  protected async exportPdf(): Promise<void> {
    await this.exporter.exportPdf({
      title: 'Inventario de productos',
      subtitle: `${this.visible().length} productos${this.search() ? ` · filtro: «${this.search()}»` : ''}`,
      fileName: `productos-${todayStamp()}`,
      columns: this.columns,
      rows: this.visible(),
    });
  }

  private async confirmDelete(product: Product): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Eliminar producto',
      message: `¿Seguro que quieres eliminar «${product.name}» (${product.sku})? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') {
      return;
    }
    this.api.deleteProduct(product.id).subscribe({
      next: () => {
        this.products.update((list) => list.filter((p) => p.id !== product.id));
        void this.notify.success(`Producto «${product.name}» eliminado.`);
      },
      error: (err: Error) => void this.notify.error(err.message),
    });
  }
}
