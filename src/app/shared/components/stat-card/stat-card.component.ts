import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IonIcon, IonSkeletonText } from '@ionic/angular';

/** Colores disponibles para la tarjeta (todos con contraste AA sobre su fondo). */
export type StatCardColor = 'primary' | 'success' | 'warning' | 'danger';

/**
 * Widget estadístico reutilizable: muestra un indicador (KPI) con icono.
 *
 * Si se marca como `clickable`, se comporta como un botón accesible y emite
 * `selected` al pulsarlo (por ejemplo, para filtrar una tabla).
 */
@Component({
  selector: 'app-stat-card',
  template: `
    <ng-template #content>
      <span class="icon" aria-hidden="true"><ion-icon [name]="icon()"></ion-icon></span>
      <span class="body">
        <span class="label">{{ label() }}</span>
        @if (loading()) {
          <ion-skeleton-text [animated]="true" class="value-skeleton"></ion-skeleton-text>
        } @else {
          <span class="value">{{ value() }}</span>
        }
        @if (hint()) {
          <span class="hint">{{ hint() }}</span>
        }
      </span>
    </ng-template>

    @if (clickable()) {
      <button type="button" [class]="'card ' + color()" (click)="selected.emit()">
        <ng-container [ngTemplateOutlet]="content" />
      </button>
    } @else {
      <div [class]="'card ' + color()">
        <ng-container [ngTemplateOutlet]="content" />
      </div>
    }
  `,
  styleUrls: ['./stat-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, IonIcon, IonSkeletonText],
})
export class StatCardComponent {
  /** Nombre del indicador. */
  readonly label = input.required<string>();
  /** Valor ya formateado. */
  readonly value = input.required<string | number>();
  /** Nombre del icono de Ionicons. */
  readonly icon = input('stats-chart-outline');
  /** Color de acento. */
  readonly color = input<StatCardColor>('primary');
  /** Texto secundario opcional. */
  readonly hint = input<string>();
  /** Muestra un esqueleto mientras se cargan los datos. */
  readonly loading = input(false);
  /** Permite pulsar la tarjeta. */
  readonly clickable = input(false);

  /** Se emite al pulsar la tarjeta (solo si `clickable`). */
  readonly selected = output<void>();
}
