import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonMenuButton } from '@ionic/angular';
import { AuthStore } from '../../core/auth/auth.store';

/** Se muestra cuando un usuario intenta abrir una ruta reservada a otro rol. */
@Component({
  selector: 'app-unauthorized',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>Acceso denegado</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <main class="status-page">
        <h1>No tienes permiso para ver esta página</h1>
        <p>Esta sección está reservada al rol de administrador.</p>
        <ion-button [routerLink]="auth.homeUrl()">Volver al inicio</ion-button>
      </main>
    </ion-content>
  `,
  styleUrls: ['./status.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonMenuButton],
})
export class UnauthorizedPage {
  protected readonly auth = inject(AuthStore);
}
