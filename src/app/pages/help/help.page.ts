import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonBackButton, IonTitle, IonContent, IonAccordionGroup,
  IonAccordion, IonItem, IonLabel,
} from '@ionic/angular';
import { AuthStore } from '../../core/auth/auth.store';

/** Sección del manual de usuario. */
interface HelpSection {
  id: string;
  title: string;
  /** Rol al que aplica (todos si no se indica). */
  adminOnly?: boolean;
  paragraphs: string[];
  steps?: string[];
}

/** Contenido del manual de usuario (también en `docs/MANUAL_USUARIO.md`). */
export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'acceso',
    title: 'Acceso y roles',
    paragraphs: [
      'La aplicación tiene dos roles: Administrador y Usuario estándar. Las cuentas nuevas creadas desde «Crear cuenta» son siempre de usuario estándar; el rol de administrador lo asigna el responsable del sistema.',
      'Si intentas abrir una sección que no corresponde a tu rol verás la página «Acceso denegado». Los permisos también se comprueban en el servidor, por lo que no se pueden saltar desde el navegador.',
    ],
    steps: [
      'Escribe tu correo y contraseña en la pantalla «Iniciar sesión».',
      'Marca «Recordar mi correo» si usas tu propio dispositivo.',
      'Pulsa «Entrar». Los administradores llegan al Panel de control; los usuarios, a Productos.',
      'Para salir, abre el menú lateral y pulsa «Cerrar sesión».',
    ],
  },
  {
    id: 'registro',
    title: 'Crear una cuenta',
    paragraphs: [
      'Mientras escribes el correo, la aplicación comprueba en el servidor si ya está registrado y te lo indica debajo del campo.',
      'La contraseña debe tener al menos 8 caracteres e incluir letras y números.',
    ],
  },
  {
    id: 'productos',
    title: 'Consultar el inventario',
    paragraphs: [
      'En «Productos» verás todo el inventario. Usa el buscador para filtrar por cualquier dato (SKU, nombre, categoría…); no distingue mayúsculas ni tildes.',
      'Pulsa el nombre de una columna para ordenar; vuelve a pulsar para invertir el orden. Los productos con stock igual o inferior al mínimo aparecen marcados como «Stock bajo».',
      'En el móvil, cada producto se muestra como una tarjeta. Desliza hacia abajo para actualizar.',
    ],
  },
  {
    id: 'gestion',
    title: 'Alta, edición y baja de productos',
    adminOnly: true,
    paragraphs: ['Solo el administrador ve los botones «Nuevo producto», editar (lápiz) y eliminar (papelera).'],
    steps: [
      'Pulsa «Nuevo producto» o el icono de lápiz de un producto.',
      'Rellena el SKU con el formato ABC-123. La aplicación comprueba que no esté repetido.',
      'Indica nombre, categoría, stock actual, stock mínimo y precio, y pulsa «Crear producto» o «Guardar cambios».',
      'Para eliminar, pulsa la papelera y confirma. La eliminación no se puede deshacer.',
    ],
  },
  {
    id: 'movimientos',
    title: 'Registrar entradas, salidas y notas',
    paragraphs: [
      'La sección «Movimientos» funciona en tiempo real: los movimientos de otros usuarios aparecen al instante sin recargar la página.',
      'Una entrada suma unidades al stock y una salida las resta. El servidor rechaza las salidas si no hay stock suficiente. Las notas sirven para dejar avisos y no modifican el stock.',
    ],
    steps: [
      'Elige el tipo: Entrada, Salida o Nota.',
      'Selecciona el producto y la cantidad (no aplica a las notas).',
      'Añade un comentario si lo necesitas y pulsa «Registrar».',
    ],
  },
  {
    id: 'panel',
    title: 'Panel de control',
    adminOnly: true,
    paragraphs: [
      'Muestra los indicadores principales (productos, unidades, valor del inventario y productos con stock bajo) y gráficos por categoría y de los últimos 7 días.',
      'Usa el selector «Categoría» para filtrar todo el panel al instante. También puedes pulsar una barra o un sector del gráfico para filtrar por esa categoría; si vuelves a pulsarlo, se quita el filtro.',
      'Pulsa la tarjeta «Stock bajo» para ir a la tabla de productos que hay que reponer.',
    ],
  },
  {
    id: 'informes',
    title: 'Exportar informes (PDF y CSV)',
    paragraphs: [
      'En Productos, Movimientos y Panel de control encontrarás los botones «Exportar CSV» y «Exportar PDF».',
      'En Productos se exporta exactamente lo que ves en la tabla, con el filtro del buscador aplicado. El CSV se abre directamente en Excel o LibreOffice.',
    ],
  },
  {
    id: 'accesibilidad',
    title: 'Accesibilidad y uso con teclado',
    paragraphs: [
      'Toda la aplicación se puede usar con el teclado: Tab para avanzar, Mayús+Tab para retroceder, Intro o Espacio para activar. Al pulsar Tab por primera vez aparece el enlace «Saltar al contenido principal».',
      'Los gráficos incluyen una tabla equivalente para lectores de pantalla y los mensajes de error y de estado se anuncian automáticamente.',
      'Puedes ampliar el texto con el zoom del navegador o del sistema sin que se pierda contenido. La aplicación respeta el modo oscuro del sistema.',
    ],
  },
];

/** Manual de usuario integrado en la aplicación (sistema de ayuda). */
@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonBackButton, IonTitle, IonContent,
    IonAccordionGroup, IonAccordion, IonItem, IonLabel,
  ],
})
export class HelpPage {
  protected readonly auth = inject(AuthStore);
  protected readonly sections = HELP_SECTIONS;
}
