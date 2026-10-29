import { Injectable } from '@angular/core';
import { TableColumn } from '../../models';

/** Opciones comunes de un informe. */
export interface ReportOptions<T> {
  /** Título del informe (aparece en el PDF). */
  title: string;
  /** Nombre del fichero sin extensión. */
  fileName: string;
  columns: TableColumn<T>[];
  rows: T[];
  /** Línea de resumen opcional bajo el título (ej. filtros aplicados). */
  subtitle?: string;
}

function cell<T>(column: TableColumn<T>, row: T): string {
  const value = row[column.key];
  return column.format ? column.format(value, row) : String(value ?? '');
}

/** Escapa un valor según RFC 4180 (comillas dobles y separadores). */
export function escapeCsv(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Genera el contenido CSV (separador `;` y BOM UTF-8 para que Excel en español
 * lo abra correctamente con tildes).
 */
export function buildCsv<T>(columns: TableColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => escapeCsv(c.label)).join(';');
  const lines = rows.map((row) => columns.map((c) => escapeCsv(cell(c, row))).join(';'));
  return '﻿' + [header, ...lines].join('\r\n');
}

/** Fecha y hora actual en formato español. */
function now(): string {
  return new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
}

/**
 * Exportación de informes tabulados en CSV y PDF.
 * jsPDF se carga bajo demanda (import dinámico) para no aumentar la carga inicial.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
  /** Descarga los datos como fichero CSV. */
  exportCsv<T>(options: ReportOptions<T>): void {
    const csv = buildCsv(options.columns, options.rows);
    this.download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${options.fileName}.csv`);
  }

  /** Genera y descarga un informe PDF con cabecera, tabla y numeración de páginas. */
  async exportPdf<T>(options: ReportOptions<T>): Promise<void> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabecera
    doc.setFillColor(17, 76, 168);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Gestión DI', 14, 14);
    doc.setFontSize(10);
    doc.text(`Generado el ${now()}`, pageWidth - 14, 14, { align: 'right' });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.text(options.title, 14, 32);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(options.subtitle ?? `${options.rows.length} registros`, 14, 38);

    autoTable(doc, {
      startY: 43,
      head: [options.columns.map((c) => c.label)],
      body: options.rows.map((row) => options.columns.map((c) => cell(c, row))),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [17, 76, 168], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [242, 245, 250] },
      columnStyles: Object.fromEntries(
        options.columns.map((c, i) => [i, { halign: c.align === 'end' ? 'right' : 'left' }]),
      ),
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text(
          `Página ${doc.getCurrentPageInfo().pageNumber} · Datos sintéticos de prueba`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' },
        );
      },
    });

    doc.save(`${options.fileName}.pdf`);
  }

  private download(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
