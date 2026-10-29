# Manual de usuario · Gestión DI

Gestión DI es una aplicación web multiplataforma (PWA) para controlar el inventario de un almacén: productos, niveles de stock y movimientos de entrada y salida. Funciona en el móvil, la tableta y el ordenador, y se puede instalar como una app.

> Este manual también está dentro de la aplicación, en el menú **Ayuda**.

## Índice

1. [Acceso y roles](#1-acceso-y-roles)
2. [Crear una cuenta](#2-crear-una-cuenta)
3. [Consultar el inventario](#3-consultar-el-inventario)
4. [Alta, edición y baja de productos (administrador)](#4-alta-edición-y-baja-de-productos-administrador)
5. [Registrar movimientos](#5-registrar-movimientos)
6. [Panel de control (administrador)](#6-panel-de-control-administrador)
7. [Exportar informes PDF y CSV](#7-exportar-informes-pdf-y-csv)
8. [Accesibilidad y uso con teclado](#8-accesibilidad-y-uso-con-teclado)
9. [Instalar la aplicación](#9-instalar-la-aplicación)
10. [Preguntas frecuentes](#10-preguntas-frecuentes)

---

## 1. Acceso y roles

| Función | Usuario estándar | Administrador |
| --- | :---: | :---: |
| Consultar productos y buscar | ✅ | ✅ |
| Registrar entradas, salidas y notas | ✅ | ✅ |
| Exportar informes PDF/CSV | ✅ | ✅ |
| Crear, editar y eliminar productos | — | ✅ |
| Eliminar movimientos | — | ✅ |
| Panel de control (gráficos e indicadores) | — | ✅ |

**Para entrar:**

1. Escribe tu correo y contraseña en **Iniciar sesión**.
2. Si usas tu propio dispositivo, puedes marcar **Recordar mi correo**.
3. Pulsa **Entrar**. Los administradores llegan al *Panel de control* y los usuarios estándar a *Productos*.
4. Para salir, abre el menú lateral (☰ en el móvil) y pulsa **Cerrar sesión**.

Si intentas abrir una sección que no corresponde a tu rol, verás la página **Acceso denegado**. Los permisos también se comprueban en el servidor (Row Level Security de Supabase), así que no se pueden saltar desde el navegador.

## 2. Crear una cuenta

1. En la pantalla de inicio de sesión, pulsa **Crear una cuenta**.
2. Escribe tu nombre completo y tu correo. Mientras escribes, la aplicación comprueba en el servidor si el correo ya está registrado («✓ Correo disponible»).
3. Elige una contraseña de al menos 8 caracteres, con letras y números, y repítela.
4. Pulsa **Crear cuenta**. Si el sistema pide confirmar el correo, abre el mensaje que recibirás y luego inicia sesión.

Las cuentas nuevas son siempre de **usuario estándar**. El rol de administrador lo asigna el responsable del sistema.

## 3. Consultar el inventario

En **Productos** verás el inventario completo.

- **Buscador:** filtra por cualquier dato (SKU, nombre, categoría, etc.). No distingue mayúsculas ni tildes («raton» encuentra «Ratón»).
- **Ordenar:** pulsa el nombre de una columna. Si vuelves a pulsarla, se invierte el orden.
- **Stock bajo:** los productos cuyo stock es igual o inferior al mínimo aparecen marcados en rojo con la etiqueta «Stock bajo».
- **Paginación:** usa las flechas de la parte inferior para cambiar de página.
- **Móvil:** cada producto se muestra como una tarjeta. Desliza hacia abajo para actualizar.

## 4. Alta, edición y baja de productos (administrador)

1. Pulsa **Nuevo producto**, o el icono del lápiz ✏️ de un producto para editarlo.
2. Rellena el **SKU** con el formato `ABC-123` (tres letras, guion y de 3 a 5 números). La aplicación comprueba al momento que no esté repetido.
3. Completa el nombre, la categoría, el stock actual, el stock mínimo y el precio.
4. Pulsa **Crear producto** o **Guardar cambios**.
5. Para eliminar un producto, pulsa la papelera 🗑️ y confirma. Esta acción **no se puede deshacer**.

## 5. Registrar movimientos

La sección **Movimientos** funciona **en tiempo real**: lo que registra cualquier usuario aparece al instante en las pantallas de todos, sin recargar. El indicador «Conectado en tiempo real» confirma que la conexión está activa.

| Tipo | Efecto en el stock |
| --- | --- |
| **Entrada** | Suma la cantidad al stock del producto |
| **Salida** | Resta la cantidad. Se rechaza si no hay stock suficiente |
| **Nota** | No modifica el stock; sirve para dejar avisos |

1. Elige el tipo de movimiento.
2. Selecciona el producto y la cantidad (no aplica a las notas).
3. Añade un comentario si lo necesitas y pulsa **Registrar**.

## 6. Panel de control (administrador)

- **Indicadores:** número de productos, unidades en stock, valor del inventario y productos con stock bajo. Pulsa la tarjeta **Stock bajo** para ir a la lista de productos que hay que reponer.
- **Filtro por categoría:** el selector **Categoría** actualiza al instante los indicadores, los gráficos y la tabla.
- **Gráficos interactivos:** pulsa una barra o un sector para filtrar por esa categoría. Si vuelves a pulsarlo, se quita el filtro.
- **Evolución semanal:** el gráfico de líneas muestra las entradas y salidas de los últimos 7 días.
- Todo el panel se actualiza solo cuando alguien registra un movimiento.

## 7. Exportar informes PDF y CSV

En **Productos**, **Movimientos** y **Panel de control** tienes los botones **Exportar CSV** y **Exportar PDF**.

- En Productos se exporta exactamente lo que ves en la tabla, con el filtro del buscador aplicado.
- El **CSV** usa punto y coma como separador y se abre directamente en Excel o LibreOffice, con las tildes bien.
- El **PDF** incluye cabecera, fecha de generación, tabla con formato y número de página.

## 8. Accesibilidad y uso con teclado

- **Teclado:** `Tab` avanza, `Mayús + Tab` retrocede e `Intro` o `Espacio` activan. Al pulsar `Tab` por primera vez aparece **Saltar al contenido principal**.
- **Lectores de pantalla:** los gráficos tienen una tabla equivalente oculta, y los errores y avisos se anuncian automáticamente.
- **Zoom:** puedes ampliar el texto con el zoom del navegador o del sistema sin perder contenido.
- **Modo oscuro:** la aplicación sigue el tema del sistema y mantiene el contraste.

## 9. Instalar la aplicación

- **Android / Chrome:** menú ⋮ → *Instalar aplicación*.
- **iPhone / Safari:** botón *Compartir* → *Añadir a pantalla de inicio*.
- **Escritorio (Chrome / Edge):** icono de instalar en la barra de direcciones.

## 10. Preguntas frecuentes

**No puedo registrar una salida.** No hay stock suficiente de ese producto. Registra antes una entrada o revisa la cantidad.

**No veo el Panel de control ni los botones de edición.** Tu cuenta es de usuario estándar. Pide al administrador que cambie tu rol si lo necesitas.

**Me ha sacado de la aplicación.** La sesión caduca por seguridad. Vuelve a iniciar sesión.

**¿Los datos son reales?** No. Todos los productos y movimientos de la demostración son **datos sintéticos** y no contienen información personal real.
