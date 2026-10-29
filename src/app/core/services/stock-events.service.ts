import { inject, Injectable } from '@angular/core';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Observable, shareReplay } from 'rxjs';
import { StockEvent, StockEventDoc } from '../../models';
import { SupabaseService } from '../supabase/supabase.service';

interface StockEventRow {
  id: string;
  doc: StockEventDoc;
  created_at: string;
}

function mapEvent(row: StockEventRow): StockEvent {
  return { id: row.id, doc: row.doc, createdAt: row.created_at };
}

/** Número máximo de documentos que se mantienen en memoria. */
const MAX_EVENTS = 200;

/**
 * Servicio de la colección **documental (NoSQL)** `stock_events`.
 *
 * Cada movimiento es un documento JSONB. `events$` funciona como un *listener*
 * en tiempo real (similar a `onSnapshot` de Firestore): emite la lista inicial y
 * una nueva lista cada vez que otro usuario añade o borra un documento.
 */
@Injectable({ providedIn: 'root' })
export class StockEventsService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Flujo compartido con los últimos movimientos (más recientes primero).
   * La suscripción al canal Realtime se cierra al no quedar suscriptores.
   */
  readonly events$: Observable<StockEvent[]> = new Observable<StockEvent[]>((subscriber) => {
    let events: StockEvent[] = [];

    const channel = this.supabase
      .channel('stock-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_events' },
        (payload: RealtimePostgresChangesPayload<StockEventRow>) => {
          if (payload.eventType === 'INSERT') {
            const added = mapEvent(payload.new);
            events = [added, ...events.filter((e) => e.id !== added.id)].slice(0, MAX_EVENTS);
          } else if (payload.eventType === 'DELETE') {
            const removedId = (payload.old as Partial<StockEventRow>).id;
            events = events.filter((e) => e.id !== removedId);
          }
          subscriber.next(events);
        },
      )
      .subscribe();

    this.supabase
      .from('stock_events')
      .select('id, doc, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_EVENTS)
      .then(({ data, error }) => {
        if (error) {
          subscriber.error(new Error('No se han podido cargar los movimientos.'));
          return;
        }
        const known = new Set(events.map((e) => e.id));
        events = [...events, ...(data as StockEventRow[]).map(mapEvent).filter((e) => !known.has(e.id))];
        subscriber.next(events);
      });

    return () => {
      void this.supabase.removeChannel(channel);
    };
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  /**
   * Añade un movimiento. El trigger de la base de datos actualiza el stock del
   * producto y rechaza la operación si no hay stock suficiente.
   */
  async add(doc: StockEventDoc): Promise<void> {
    const { error } = await this.supabase.from('stock_events').insert({ doc });
    if (error) {
      throw new Error(this.translate(error.message));
    }
  }

  /** Elimina un movimiento (solo administradores, lo garantiza RLS). */
  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('stock_events').delete().eq('id', id);
    if (error) {
      throw new Error(this.translate(error.message));
    }
  }

  private translate(message: string): string {
    if (message.includes('row-level security')) {
      return 'No tienes permisos para realizar esta operación.';
    }
    return message || 'No se ha podido guardar el movimiento.';
  }
}
