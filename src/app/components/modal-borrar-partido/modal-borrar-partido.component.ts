import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Partido } from '../../interfaces/Partido.interface';

interface PartidoConPago extends Partido {
  precio?: number;
  importePagado?: number;
  totalPagado?: number;
  paypalPayerEmail?: string;
  payerEmail?: string;
  emailPagador?: string;
  emailPago?: string;
  email?: string;
}

@Component({
  selector: 'app-modal-borrar-partido',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-borrar-partido.component.html',
  styleUrls: ['./modal-borrar-partido.component.scss'],
})
export class ModalBorrarPartidoComponent {
  @Input() isOpen = false;
  @Input() loading = false;
  @Input() partido: Partido | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.loading) {
      this.cancel.emit();
    }
  }

  onCancel(): void {
    if (!this.loading) {
      this.cancel.emit();
    }
  }

  onConfirm(): void {
    if (!this.loading) {
      this.confirm.emit();
    }
  }

  getImporteReembolso(partido: Partido): string {
    const match = partido as PartidoConPago;

    const importe =
      Number(match.precio) ||
      Number(match.importePagado) ||
      Number(match.totalPagado) ||
      0;

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(importe);
  }

  getEmailPago(partido: Partido): string {
    const match = partido as PartidoConPago;

    return (
      match.paypalPayerEmail ||
      match.payerEmail ||
      match.emailPagador ||
      match.emailPago ||
      match.email ||
      'Cuenta de PayPal utilizada para el pago'
    );
  }
}
