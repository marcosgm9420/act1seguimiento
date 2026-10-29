/** Roles de la aplicación. */
export type Role = 'admin' | 'user';

/** Perfil del usuario autenticado (tabla `profiles`). */
export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

/** Categoría de producto (tabla relacional `categories`). */
export interface Category {
  id: number;
  name: string;
}

/** Producto del inventario (tabla relacional `products`). */
export interface Product {
  id: number;
  sku: string;
  name: string;
  categoryId: number;
  categoryName: string;
  stock: number;
  minStock: number;
  price: number;
  updatedAt: string;
}

/** Datos editables de un producto (alta y modificación). */
export type ProductInput = Pick<Product, 'sku' | 'name' | 'categoryId' | 'stock' | 'minStock' | 'price'>;

/** Tipo de movimiento de stock. */
export type StockEventType = 'entrada' | 'salida' | 'nota';

/** Documento NoSQL (JSONB) con un movimiento de stock. */
export interface StockEventDoc {
  type: StockEventType;
  sku?: string;
  quantity?: number;
  comment?: string;
  author: string;
}

/** Movimiento de stock tal y como se recibe de la colección `stock_events`. */
export interface StockEvent {
  id: string;
  doc: StockEventDoc;
  createdAt: string;
}

/** Definición de una columna para el componente de tabla de datos. */
export interface TableColumn<T> {
  /** Propiedad del objeto que se muestra. */
  key: keyof T & string;
  /** Texto de la cabecera. */
  label: string;
  /** Formateo opcional del valor para mostrarlo/exportarlo. */
  format?: (value: T[keyof T], row: T) => string;
  /** Alineación del contenido (por defecto a la izquierda). */
  align?: 'start' | 'end';
  /** Permite ordenar por esta columna (por defecto true). */
  sortable?: boolean;
}

/** Evento emitido por la tabla al pulsar una acción de fila. */
export interface RowAction<T> {
  action: 'edit' | 'delete' | 'select';
  row: T;
}
