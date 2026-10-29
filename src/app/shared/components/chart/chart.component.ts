import {
  afterNextRender, ChangeDetectionStrategy, Component, effect, ElementRef, input, OnDestroy, output, viewChild,
} from '@angular/core';
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, ChartType, DoughnutController, Legend,
  LinearScale, LineController, LineElement, PointElement, Tooltip, Filler,
} from 'chart.js';

Chart.register(
  BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
);

/** Paleta con contraste suficiente sobre fondo claro y oscuro. */
export const CHART_COLORS = ['#1f6feb', '#d1495b', '#2a9d8f', '#e9a03b', '#7b5ea7', '#3d7a3d', '#c05f1a', '#5c6b7a'];

/** Serie de datos de un gráfico. */
export interface ChartSeries {
  label: string;
  data: number[];
}

/** Elemento seleccionado en el gráfico. */
export interface ChartSelection {
  index: number;
  label: string;
}

/**
 * Envoltorio reutilizable de Chart.js.
 *
 * - Recibe etiquetas y series por `input()` y se actualiza solo al cambiar.
 * - Emite `pointSelected` al pulsar una barra/sector (el padre decide qué hacer).
 * - Destruye la instancia de Chart.js en `ngOnDestroy` para no dejar fugas de memoria.
 * - Incluye una tabla oculta con los mismos datos para lectores de pantalla.
 */
@Component({
  selector: 'app-chart',
  template: `
    <figure>
      <figcaption>{{ title() }}</figcaption>
      <div class="canvas-box" [class.round]="type() === 'doughnut'">
        <canvas #canvas role="img" [attr.aria-label]="title() + '. Los datos están en la tabla siguiente.'"></canvas>
      </div>
      <table class="sr-only">
        <caption>{{ title() }}</caption>
        <thead>
          <tr>
            <th scope="col">Elemento</th>
            @for (serie of series(); track serie.label) {
              <th scope="col">{{ serie.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (label of labels(); track $index; let i = $index) {
            <tr>
              <th scope="row">{{ label }}</th>
              @for (serie of series(); track serie.label) {
                <td>{{ serie.data[i] }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </figure>
  `,
  styles: `
    :host { display: block; }
    figure { margin: 0; }
    figcaption { margin-bottom: 8px; font-weight: 600; }
    .canvas-box { position: relative; height: 280px; }
    .canvas-box.round { max-width: 340px; margin: 0 auto; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements OnDestroy {
  /** Tipo de gráfico. */
  readonly type = input<Extract<ChartType, 'bar' | 'doughnut' | 'line'>>('bar');
  /** Título visible y accesible. */
  readonly title = input.required<string>();
  /** Etiquetas del eje X / sectores. */
  readonly labels = input.required<string[]>();
  /** Series de datos. */
  readonly series = input.required<ChartSeries[]>();

  /** Se emite al pulsar un elemento del gráfico. */
  readonly pointSelected = output<ChartSelection>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    afterNextRender(() => this.create());

    // Actualiza los datos sin recrear el gráfico.
    effect(() => {
      const labels = this.labels();
      const series = this.series();
      if (!this.chart) {
        return;
      }
      this.chart.data.labels = labels;
      this.chart.data.datasets = this.datasets(series);
      this.chart.update();
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private create(): void {
    const type = this.type();
    const textColor = getComputedStyle(document.body).getPropertyValue('--ion-text-color').trim() || '#222';
    this.chart = new Chart(this.canvas().nativeElement, {
      type,
      data: { labels: this.labels(), datasets: this.datasets(this.series()) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        color: textColor,
        plugins: { legend: { display: type === 'doughnut' || this.series().length > 1, position: 'bottom' } },
        scales:
          type === 'doughnut'
            ? {}
            : {
                x: { ticks: { color: textColor } },
                y: { beginAtZero: true, ticks: { color: textColor, precision: 0 } },
              },
        onClick: (_event, elements) => {
          const index = elements[0]?.index;
          if (index !== undefined) {
            this.pointSelected.emit({ index, label: this.labels()[index] });
          }
        },
      },
    });
  }

  private datasets(series: ChartSeries[]) {
    const type = this.type();
    return series.map((serie, i) => ({
      label: serie.label,
      data: serie.data,
      backgroundColor:
        type === 'doughnut'
          ? this.labels().map((_, j) => CHART_COLORS[j % CHART_COLORS.length])
          : CHART_COLORS[i] + (type === 'line' ? '33' : ''),
      borderColor: type === 'line' ? CHART_COLORS[i] : undefined,
      fill: type === 'line',
      tension: 0.3,
    }));
  }
}
