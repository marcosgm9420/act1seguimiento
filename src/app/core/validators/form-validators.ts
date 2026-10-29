import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl, AsyncValidatorFn, FormControlStatus, StatusChangeEvent, ValidationErrors, ValidatorFn,
} from '@angular/forms';
import { catchError, filter, first, map, Observable, of, switchMap, timer } from 'rxjs';

/**
 * Estado de un control como signal (VALID, INVALID, PENDING…), para mostrar en la
 * vista el progreso de una validación asíncrona.
 *
 * Usa `control.events` en lugar de `statusChanges`, porque este último no emite
 * cuando la validación asíncrona termina tras un cambio hecho con `emitEvent: false`
 * (por ejemplo, al cargar los datos en el formulario), y la vista se quedaría en PENDING.
 * Debe llamarse en un contexto de inyección (inicializador de campo o constructor).
 */
export function controlStatus(control: AbstractControl): Signal<FormControlStatus> {
  return toSignal(
    control.events.pipe(
      filter((event): event is StatusChangeEvent => event instanceof StatusChangeEvent),
      map(() => control.status),
    ),
    { initialValue: control.status },
  );
}

/** Espera tras la última pulsación antes de consultar al servidor. */
const DEBOUNCE_MS = 400;

/**
 * Crea un validador asíncrono que consulta un servicio para saber si un valor ya existe.
 * Espera {@link DEBOUNCE_MS} ms (debounce) y cancela las consultas anteriores.
 * Si el servidor falla no bloquea el formulario (el servidor volverá a validar al guardar).
 *
 * @param exists función que devuelve `true` si el valor ya está en uso.
 * @param errorKey nombre del error que se añade al control.
 */
export function uniqueValueValidator(
  exists: (value: string) => Observable<boolean>,
  errorKey: string,
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return of(null);
    }
    return timer(DEBOUNCE_MS).pipe(
      switchMap(() => exists(value)),
      map((taken) => (taken ? { [errorKey]: true } : null)),
      catchError(() => of(null)),
      first(),
    );
  };
}

/** Validador de grupo: los dos campos indicados deben coincidir. */
export function matchFieldsValidator(field: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(field)?.value;
    const b = group.get(confirmField)?.value;
    return a && b && a !== b ? { fieldsMismatch: true } : null;
  };
}

/** Contraseña con al menos 8 caracteres, una letra y un número. */
export const strongPasswordValidator: ValidatorFn = (control) => {
  const value = String(control.value ?? '');
  if (!value) {
    return null;
  }
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value) ? null : { weakPassword: true };
};
