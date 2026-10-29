import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem,
  IonIcon, IonLabel, IonRouterOutlet, IonRouterLink, IonFooter, IonButton, IonBadge,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  statsChartOutline, statsChartSharp, cubeOutline, cubeSharp, swapHorizontalOutline, swapHorizontalSharp,
  helpCircleOutline, helpCircleSharp, logOutOutline, warningOutline,
} from 'ionicons/icons';
import { AuthStore } from './core/auth/auth.store';
import { SupabaseService } from './core/supabase/supabase.service';
import { Role } from './models';

/** Entrada del menú lateral. */
interface MenuEntry {
  title: string;
  url: string;
  icon: string;
  roles: Role[];
}

const MENU: MenuEntry[] = [
  { title: 'Panel de control', url: '/panel', icon: 'stats-chart', roles: ['admin'] },
  { title: 'Productos', url: '/productos', icon: 'cube', roles: ['admin', 'user'] },
  { title: 'Movimientos', url: '/movimientos', icon: 'swap-horizontal', roles: ['admin', 'user'] },
  { title: 'Ayuda', url: '/ayuda', icon: 'help-circle', roles: ['admin', 'user'] },
];

/** Componente raíz: menú lateral (según rol) y contenedor de rutas. */
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote,
    IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet, IonFooter, IonButton, IonBadge,
  ],
})
export class AppComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly configured = inject(SupabaseService).configured;
  private readonly router = inject(Router);

  /** Opciones de menú visibles para el rol actual. */
  protected readonly menu = computed(() => {
    const role = this.auth.role();
    return role ? MENU.filter((entry) => entry.roles.includes(role)) : [];
  });

  constructor() {
    addIcons({
      statsChartOutline, statsChartSharp, cubeOutline, cubeSharp, swapHorizontalOutline, swapHorizontalSharp,
      helpCircleOutline, helpCircleSharp, logOutOutline, warningOutline,
    });
  }

  /** Cierra la sesión y vuelve al login. */
  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  /** Lleva el foco al contenido principal (enlace "Saltar al contenido"). */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    const main = document.querySelector<HTMLElement>('.ion-page:not(.ion-page-hidden) ion-content');
    main?.setAttribute('tabindex', '-1');
    main?.focus();
  }
}
