import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput, IonSelect, IonSelectOption,
  IonButton, IonSpinner, IonText, IonNote, IonCard, IonCardContent,
} from '@ionic/angular';
import { forkJoin, map, of } from 'rxjs';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { controlStatus, uniqueValueValidator } from '../../core/validators/form-validators';
import { Category, ProductInput } from '../../models';

/** Formato de SKU: tres letras, guion y de 3 a 5 dígitos (ej. ELE-001). */
const SKU_PATTERN = /^[A-Z]{3}-\d{3,5}$/;

/**
 * Alta y edición de productos (solo administrador).
 * El SKU se valida de forma asíncrona contra la API para evitar duplicados.
 */
@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.page.html',
  styleUrls: ['./product-form.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput, IonSelect,
    IonSelectOption, IonButton, IonSpinner, IonText, IonNote, IonCard, IonCardContent,
  ],
})
export class ProductFormPage implements OnInit {
  private readonly api = inject(InventoryApiService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  /** Id del producto (parámetro de ruta); vacío al crear. */
  readonly id = input<string>();
  protected readonly productId = computed(() => (this.id() ? Number(this.id()) : null));
  protected readonly isEdit = computed(() => this.productId() !== null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    sku: [
      '',
      {
        validators: [Validators.required, Validators.pattern(SKU_PATTERN)],
        asyncValidators: [uniqueValueValidator((sku) => this.api.skuExists(sku, this.productId()), 'skuTaken')],
      },
    ],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    minStock: [5, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly skuStatus = controlStatus(this.form.controls.sku);

  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.productId();
    forkJoin({
      categories: this.api.getCategories(),
      product: id ? this.api.getProduct(id) : of(null),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ categories, product }) => {
          this.categories.set(categories);
          if (product) {
            this.form.patchValue(product);
          }
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.loading.set(false);
        },
      });
  }

  /** Convierte el SKU a mayúsculas mientras se escribe. */
  protected upperSku(): void {
    const control = this.form.controls.sku;
    const upper = control.value.toUpperCase();
    if (upper !== control.value) {
      control.setValue(upper);
    }
  }

  /** Mensaje de error del SKU según el error activo. */
  protected skuError(): string {
    const errors = this.form.controls.sku.errors;
    if (errors?.['skuTaken']) {
      return 'Ya existe un producto con este SKU.';
    }
    if (errors?.['required']) {
      return 'El SKU es obligatorio.';
    }
    return 'Formato: tres letras, guion y de 3 a 5 números (ej. ELE-001).';
  }

  /** Guarda el producto (alta o modificación). */
  protected submit(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const raw = this.form.getRawValue();
    const input: ProductInput = {
      ...raw,
      categoryId: Number(raw.categoryId),
      stock: Number(raw.stock),
      minStock: Number(raw.minStock),
      price: Number(raw.price),
    };
    const id = this.productId();
    const request$ = id ? this.api.updateProduct(id, input) : this.api.createProduct(input);
    request$.pipe(map((p) => p.name)).subscribe({
      next: (name) => {
        this.saving.set(false);
        void this.notify.success(id ? `Producto «${name}» actualizado.` : `Producto «${name}» creado.`);
        void this.router.navigateByUrl('/productos');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
