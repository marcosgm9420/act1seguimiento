import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Category, Product, ProductInput } from '../../models';
import { SupabaseService } from '../supabase/supabase.service';

/** Fila de `products` tal y como la devuelve PostgREST. */
interface ProductRow {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  stock: number;
  min_stock: number;
  price: number | string;
  updated_at: string;
  category: { name: string } | null;
}

const PRODUCT_SELECT = 'id,sku,name,category_id,stock,min_stock,price,updated_at,category:categories(name)';

/** Convierte una fila de la base de datos al modelo de la aplicación. */
export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.category?.name ?? 'Sin categoría',
    stock: row.stock,
    minStock: row.min_stock,
    price: Number(row.price),
    updatedAt: row.updated_at,
  };
}

function toRow(input: ProductInput) {
  return {
    sku: input.sku.trim().toUpperCase(),
    name: input.name.trim(),
    category_id: input.categoryId,
    stock: input.stock,
    min_stock: input.minStock,
    price: input.price,
  };
}

/**
 * Servicio de acceso a la base de datos **relacional (SQL)** de Supabase a través
 * de su API REST (PostgREST). Todas las operaciones son asíncronas y devuelven
 * `Observable` de RxJS; el JWT lo añade `supabaseInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(SupabaseService).restUrl;

  /** Lista todos los productos con el nombre de su categoría. */
  getProducts(): Observable<Product[]> {
    return this.http
      .get<ProductRow[]>(`${this.baseUrl}/products`, { params: { select: PRODUCT_SELECT, order: 'name.asc' } })
      .pipe(map((rows) => rows.map(mapProduct)));
  }

  /** Obtiene un producto por su id. */
  getProduct(id: number): Observable<Product> {
    return this.http
      .get<ProductRow[]>(`${this.baseUrl}/products`, { params: { select: PRODUCT_SELECT, id: `eq.${id}` } })
      .pipe(
        map((rows) => {
          if (!rows.length) {
            throw new Error('El producto no existe.');
          }
          return mapProduct(rows[0]);
        }),
      );
  }

  /** Lista las categorías ordenadas por nombre. */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`, {
      params: { select: 'id,name', order: 'name.asc' },
    });
  }

  /** Crea un producto (solo administradores, lo garantiza RLS). */
  createProduct(input: ProductInput): Observable<Product> {
    return this.http
      .post<ProductRow[]>(`${this.baseUrl}/products`, toRow(input), {
        params: { select: PRODUCT_SELECT },
        headers: { Prefer: 'return=representation' },
      })
      .pipe(map((rows) => mapProduct(rows[0])));
  }

  /** Actualiza un producto (solo administradores). */
  updateProduct(id: number, input: ProductInput): Observable<Product> {
    return this.http
      .patch<ProductRow[]>(`${this.baseUrl}/products`, toRow(input), {
        params: { select: PRODUCT_SELECT, id: `eq.${id}` },
        headers: { Prefer: 'return=representation' },
      })
      .pipe(
        map((rows) => {
          if (!rows.length) {
            throw new Error('No tienes permisos para modificar este producto.');
          }
          return mapProduct(rows[0]);
        }),
      );
  }

  /** Elimina un producto (solo administradores). */
  deleteProduct(id: number): Observable<void> {
    return this.http
      .delete<unknown[]>(`${this.baseUrl}/products`, {
        params: { id: `eq.${id}`, select: 'id' },
        headers: { Prefer: 'return=representation' },
      })
      .pipe(
        map((rows) => {
          if (!rows.length) {
            throw new Error('No se ha podido eliminar el producto (¿tienes permisos?).');
          }
        }),
      );
  }

  /**
   * Comprueba si ya existe un producto con ese SKU (validación asíncrona).
   * @param excludeId id del producto que se está editando, para no compararlo consigo mismo.
   */
  skuExists(sku: string, excludeId?: number | null): Observable<boolean> {
    const params: Record<string, string> = { select: 'id', sku: `eq.${sku.trim().toUpperCase()}`, limit: '1' };
    if (excludeId) {
      params['id'] = `neq.${excludeId}`;
    }
    return this.http.get<unknown[]>(`${this.baseUrl}/products`, { params }).pipe(map((rows) => rows.length > 0));
  }

  /** Comprueba si un correo ya está registrado (función RPC `email_exists`). */
  emailExists(email: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/rpc/email_exists`, { p_email: email });
  }
}
