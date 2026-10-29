import { FormControl, FormGroup } from '@angular/forms';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { matchFieldsValidator, strongPasswordValidator, uniqueValueValidator } from './form-validators';

describe('Validadores de formulario', () => {
  it('strongPasswordValidator exige 8 caracteres con letras y números', () => {
    expect(strongPasswordValidator(new FormControl('corta1'))).toEqual({ weakPassword: true });
    expect(strongPasswordValidator(new FormControl('sinnumeros'))).toEqual({ weakPassword: true });
    expect(strongPasswordValidator(new FormControl('Segura2026'))).toBeNull();
  });

  it('matchFieldsValidator detecta contraseñas distintas', () => {
    const group = new FormGroup(
      { password: new FormControl('Segura2026'), confirm: new FormControl('Otra2026') },
      { validators: matchFieldsValidator('password', 'confirm') },
    );
    expect(group.hasError('fieldsMismatch')).toBe(true);
    group.controls.confirm.setValue('Segura2026');
    expect(group.hasError('fieldsMismatch')).toBe(false);
  });

  it('uniqueValueValidator marca el error si el valor ya existe en el servidor', async () => {
    const validator = uniqueValueValidator((value) => of(value === 'ocupado@gestiondi.test'), 'emailTaken');
    const taken = await firstValueFrom(
      validator(new FormControl('ocupado@gestiondi.test')) as Observable<unknown>,
    );
    const free = await firstValueFrom(validator(new FormControl('libre@gestiondi.test')) as Observable<unknown>);
    expect(taken).toEqual({ emailTaken: true });
    expect(free).toBeNull();
  });

  it('uniqueValueValidator no bloquea el formulario si el servidor falla', async () => {
    const validator = uniqueValueValidator(() => throwError(() => new Error('sin red')), 'emailTaken');
    const result = await firstValueFrom(validator(new FormControl('x@gestiondi.test')) as Observable<unknown>);
    expect(result).toBeNull();
  });
});
