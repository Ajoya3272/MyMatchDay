import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Partido } from '../../interfaces/Partido.interface';

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
}
