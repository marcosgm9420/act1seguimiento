import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonCard, IonCardContent,
  IonCardHeader, IonCardTitle, IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption, IonInput,
  IonTextarea, IonButton, IonSpinner, IonList, IonItem, IonIcon, IonNote, IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowDownCircleOutline, arrowUpCircleOutline, chatbubbleEllipsesOutline, trashOutline, radioOutline,
  documentTextOutline, gridOutline,
} from 'ionicons/icons';
import { AuthStore } from '../../core/auth/auth.store';
import { ExportService } from '../../core/services/export.service';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { StockEventsService } from '../../core/services/stock-events.service';
import { Product, StockEvent, StockEventType, TableColumn } from '../../models';
import { formatDateTime, todayStamp } from '../../shared/format';

/** Fila plana para exportar movimientos. */
interface MovementRow {
  id: string;
  date: string;
  type: string;
  sku: string;
  quantity: string;
  author: string;
  comment: string;
}

const EXPORT_COLUMNS: TableColumn<MovementRow>[] = [
  { key: 'date', label: 'Fecha' },
  { key: 'type', label: 'Tipo' },
  { key: 'sku', label: 'SKU' },
  { key: 'quantity', label: 'Cantidad', align: 'end' },
  { key: 'author', label: 'Autor' },
  { key: 'comment', label: 'Comentario' },
];

const TYPE_LABEL: Record<StockEventType, string> = { entrada: 'Entrada', salida: 'Salida', nota: 'Nota' };

/**
 * Registro de movimientos de stock en **tiempo real** (colección NoSQL).
 * Cualquier usuario puede registrar entradas, salidas y notas; los cambios de
 * otros usuarios aparecen al instante sin recargar.
 */
@Component({
  selector: 'app-movements',
  templateUrl: './movements.page.html',
  styleUrls: ['./movements.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonCard,
    IonCardContent, IonCardHeader, IonCardTitle, IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption,
    IonInput, IonTextarea, IonButton, IonSpinner, IonList, IonItem, IonIcon, IonNote, IonText,
  ],
})
export class MovementsPage implements OnInit {
  private readonly eventsService = inject(StockEventsService);
  private readonly api = inject(InventoryApiService);
  private readonly exporter = inject(ExportService);
  private readonly notify = inject(NotificationService);
  private readonly alerts = inject(AlertController);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthStore);

  protected readonly typeLabel = TYPE_LABEL;
  protected readonly formatDateTime = formatDateTime;

  protected readonly form = inject(NonNullableFormBuilder).group({
    type: ['salida' as StockEventType, Validators.required],
    sku: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(100000), Validators.pattern(/^\d+$/)]],
    comment: ['', Validators.maxLength(200)],
  });

  protected readonly products = signal<Product[]>([]);
  protected readonly events = signal<StockEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly live = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isNote = signal(false);

  protected readonly productName = computed(() => {
    const map = new Map(this.products().map((p) => [p.sku, p.name]));
    return (sku?: string) => (sku ? (map.get(sku) ?? sku) : '');
  });

  constructor() {
    addIcons({
      arrowDownCircleOutline, arrowUpCircleOutline, chatbubbleEllipsesOutline, trashOutline, radioOutline,
      documentTextOutline, gridOutline,
    });
  }

  ngOnInit(): void {
    // Suscripción en tiempo real: se cancela sola al destruir la página.
    // Cada cambio recarga también los productos, porque su stock lo actualiza el servidor.
    this.eventsService.events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (events) => {
        this.loadProducts();
        this.events.set(events);
        this.loading.set(false);
        this.live.set(true);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.loading.set(false);
        this.live.set(false);
      },
    });

    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((type) => {
      const note = type === 'nota';
      this.isNote.set(note);
      const { sku, quantity, comment } = this.form.controls;
      if (note) {
        sku.disable();
        quantity.disable();
        comment.addValidators(Validators.required);
      } else {
        sku.enable();
        quantity.enable();
        comment.removeValidators(Validators.required);
      }
      comment.updateValueAndValidity();
    });
  }

  private loadProducts(): void {
    this.api
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (products) => this.products.set(products), error: () => this.products.set([]) });
  }

  /** Registra el movimiento en la colección NoSQL. */
  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const profile = this.auth.profile();
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      await this.eventsService.add({
        type: value.type,
        ...(value.type !== 'nota' ? { sku: value.sku, quantity: Number(value.quantity) } : {}),
        comment: value.comment.trim() || undefined,
        author: profile?.fullName || profile?.email || 'Desconocido',
      });
      await this.notify.success('Movimiento registrado.');
      this.form.patchValue({ quantity: 1, comment: '' });
      this.form.markAsUntouched();
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  /** Elimina un movimiento (solo administrador). */
  protected async remove(event: StockEvent): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Eliminar movimiento',
      message: 'Se borrará del historial, pero el stock no se modificará. ¿Continuar?',
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'destructive' }],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'destructive') {
      return;
    }
    try {
      await this.eventsService.remove(event.id);
      await this.notify.success('Movimiento eliminado.');
    } catch (error) {
      await this.notify.error((error as Error).message);
    }
  }

  protected icon(type: StockEventType): string {
    return type === 'entrada' ? 'arrow-down-circle-outline' : type === 'salida' ? 'arrow-up-circle-outline' : 'chatbubble-ellipses-outline';
  }

  protected exportCsv(): void {
    this.exporter.exportCsv({ title: 'Movimientos', fileName: `movimientos-${todayStamp()}`, columns: EXPORT_COLUMNS, rows: this.rows() });
  }

  protected async exportPdf(): Promise<void> {
    await this.exporter.exportPdf({
      title: 'Historial de movimientos de stock',
      fileName: `movimientos-${todayStamp()}`,
      columns: EXPORT_COLUMNS,
      rows: this.rows(),
    });
  }

  private rows(): MovementRow[] {
    return this.events().map((e) => ({
      id: e.id,
      date: formatDateTime(e.createdAt),
      type: TYPE_LABEL[e.doc.type],
      sku: e.doc.sku ?? '',
      quantity: e.doc.quantity?.toString() ?? '',
      author: e.doc.author,
      comment: e.doc.comment ?? '',
    }));
  }
}
