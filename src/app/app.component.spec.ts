import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { AuthStore } from './core/auth/auth.store';
import { Role } from './models';

/** AuthStore simulado con el rol indicado. */
function fakeAuth(role: Role | null) {
  const profile = signal(role ? { id: '1', email: 'test@gestiondi.test', fullName: 'Prueba', role } : null);
  return {
    profile,
    role: computed(() => profile()?.role ?? null),
    isAdmin: computed(() => profile()?.role === 'admin'),
    isAuthenticated: computed(() => profile() !== null),
    logout: vi.fn().mockResolvedValue(undefined),
    homeUrl: () => '/',
  };
}

async function render(role: Role | null) {
  await TestBed.configureTestingModule({
    imports: [AppComponent],
    providers: [provideRouter([]), { provide: AuthStore, useValue: fakeAuth(role) }],
  }).compileComponents();
  const fixture = TestBed.createComponent(AppComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('AppComponent', () => {
  it('se crea correctamente', async () => {
    const element = await render(null);
    expect(element).toBeTruthy();
  });

  it('muestra el Panel de control al administrador', async () => {
    const element = await render('admin');
    const labels = Array.from(element.querySelectorAll('#main-menu ion-label')).map((l) => l.innerHTML.replace(/<[^>]*>/g, '').trim());
    expect(labels).toEqual(['Panel de control', 'Productos', 'Movimientos', 'Ayuda']);
  });

  it('oculta el Panel de control al usuario estándar', async () => {
    const element = await render('user');
    const labels = Array.from(element.querySelectorAll('#main-menu ion-label')).map((l) => l.innerHTML.replace(/<[^>]*>/g, '').trim());
    expect(labels).toEqual(['Productos', 'Movimientos', 'Ayuda']);
  });

  it('incluye el enlace para saltar al contenido', async () => {
    const element = await render('user');
    expect(element.querySelector('.skip-link')?.textContent).toContain('Saltar al contenido');
  });
});
