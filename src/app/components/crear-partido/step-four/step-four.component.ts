import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-step-four',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-four.component.html',
  styleUrls: ['./step-four.component.scss'],
})
export class StepFourComponent implements OnDestroy {
  @Input() inviteLink = '';

  @Output() volverAlInicio = new EventEmitter<void>();

  linkCopied = false;

  private copyFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  async copyInvite(): Promise<void> {
    if (!this.inviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.inviteLink);

      this.linkCopied = true;

      if (this.copyFeedbackTimeout) {
        clearTimeout(this.copyFeedbackTimeout);
      }

      this.copyFeedbackTimeout = setTimeout(() => {
        this.linkCopied = false;
      }, 3000);
    } catch (error) {
      console.error('[STEP-FOUR] Error copiando el enlace:', error);

      this.linkCopied = false;
    }
  }

  goHome(): void {
    this.volverAlInicio.emit();
  }

  ngOnDestroy(): void {
    if (this.copyFeedbackTimeout) {
      clearTimeout(this.copyFeedbackTimeout);
    }
  }
}
