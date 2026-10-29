import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner,
  IonText, IonCard, IonCardContent, IonButtons, IonBackButton, IonNote,
} from '@ionic/angular';
import { map } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { InventoryApiService } from '../../../core/services/inventory-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  matchFieldsValidator, strongPasswordValidator, uniqueValueValidator,
} from '../../../core/validators/form-validators';

/**
 * Alta de nuevos usuarios (rol "Usuario estándar").
 * Incluye validación asíncrona del correo contra la base de datos.
 */
@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['../auth.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonInputPasswordToggle,
    IonButton, IonSpinner, IonText, IonCard, IonCardContent, IonButtons, IonBackButton, IonNote,
  ],
})
export class RegisterPage {
  private readonly auth = inject(AuthStore);
  private readonly api = inject(InventoryApiService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
      email: [
        '',
        {
          validators: [Validators.required, Validators.email],
          asyncValidators: [uniqueValueValidator((email) => this.api.emailExists(email), 'emailTaken')],
          updateOn: 'change' as const,
        },
      ],
      password: ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchFieldsValidator('password', 'confirmPassword') },
  );

  /** Estado de la validación asíncrona del correo (PENDING mientras consulta). */
  protected readonly emailStatus = toSignal(
    this.form.controls.email.statusChanges.pipe(map(() => this.form.controls.email.status)),
    { initialValue: this.form.controls.email.status },
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly confirmationSent = signal(false);

  /** Mensaje de error del campo correo según el error activo. */
  protected emailError(): string {
    const errors = this.form.controls.email.errors;
    if (errors?.['emailTaken']) {
      return 'Ya existe una cuenta con este correo.';
    }
    if (errors?.['required']) {
      return 'El correo es obligatorio.';
    }
    return 'Introduce un correo electrónico válido.';
  }

  /** Envía el formulario de registro. */
  protected async submit(): Promise<void> {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    const { fullName, email, password } = this.form.getRawValue();
    try {
      const result = await this.auth.register(fullName.trim(), email.trim(), password);
      if (result.needsEmailConfirmation) {
        this.confirmationSent.set(true);
      } else {
        await this.notify.success('Cuenta creada correctamente.');
        await this.router.navigateByUrl(this.auth.homeUrl(), { replaceUrl: true });
      }
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
