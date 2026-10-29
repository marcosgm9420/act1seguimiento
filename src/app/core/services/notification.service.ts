import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

/**
 * Mensajes breves al usuario mediante `ion-toast`.
 * Los toasts se anuncian a los lectores de pantalla (región `status`).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toasts = inject(ToastController);

  /** Mensaje de operación correcta. */
  success(message: string): Promise<void> {
    return this.show(message, 'success');
  }

  /** Mensaje de error. */
  error(message: string): Promise<void> {
    return this.show(message, 'danger', 6000);
  }

  private async show(message: string, color: 'success' | 'danger', duration = 3000): Promise<void> {
    const toast = await this.toasts.create({
      message,
      color,
      duration,
      position: 'bottom',
      buttons: [{ text: 'Cerrar', role: 'cancel' }],
    });
    await toast.present();
  }
}
