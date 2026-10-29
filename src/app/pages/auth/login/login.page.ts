import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner,
  IonText, IonCheckbox, IonCard, IonCardContent,
} from '@ionic/angular';
import { AuthStore } from '../../../core/auth/auth.store';

const REMEMBER_KEY = 'gestion-di:email';

/** Página de inicio de sesión (formulario reactivo). */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['../auth.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, FormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonInput,
    IonInputPasswordToggle, IonButton, IonSpinner, IonText, IonCheckbox, IonCard, IonCardContent,
  ],
})
export class LoginPage implements OnInit {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  /** Ruta a la que volver tras iniciar sesión (query param `redirect`). */
  readonly redirect = input<string>();
  /** Viene de una sesión caducada (query param `caducada`). */
  readonly caducada = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** Recordar el correo en este dispositivo (two-way binding con ngModel). */
  protected readonly rememberEmail = signal(false);

  ngOnInit(): void {
    const saved = this.readSavedEmail();
    if (saved) {
      this.form.controls.email.setValue(saved);
      this.rememberEmail.set(true);
    }
    if (this.caducada()) {
      this.errorMessage.set('Tu sesión ha caducado. Vuelve a iniciar sesión.');
    }
  }

  /** Envía el formulario de login. */
  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();
    try {
      await this.auth.login(email, password);
      this.saveEmail(email);
      const target = this.redirect()?.startsWith('/') ? this.redirect()! : this.auth.homeUrl();
      await this.router.navigateByUrl(target, { replaceUrl: true });
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  private readSavedEmail(): string | null {
    try {
      return localStorage.getItem(REMEMBER_KEY);
    } catch {
      return null;
    }
  }

  private saveEmail(email: string): void {
    try {
      if (this.rememberEmail()) {
        localStorage.setItem(REMEMBER_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      // El almacenamiento puede no estar disponible (modo privado): no es crítico.
    }
  }
}
