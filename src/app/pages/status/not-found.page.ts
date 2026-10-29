import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonMenuButton } from '@ionic/angular';

/** Página 404 para rutas inexistentes. */
@Component({
  selector: 'app-not-found',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>Página no encontrada</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <main class="status-page">
        <h1>Error 404</h1>
        <p>La página que buscas no existe o se ha movido.</p>
        <ion-button routerLink="/">Ir al inicio</ion-button>
      </main>
    </ion-content>
  `,
  styleUrls: ['./status.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonMenuButton],
})
export class NotFoundPage {}
