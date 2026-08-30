import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

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

  async compartir(): Promise<void> {
    if (!this.inviteLink) {
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: 'Invitación a un partido',
          text: 'Únete a mi partido en JoinMatch',
          url: this.inviteLink,
          dialogTitle: 'Invitar al partido',
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: 'Invitación a un partido',
          text: 'Únete a mi partido en JoinMatch',
          url: this.inviteLink,
        });
        return;
      }

      await this.copiarAlPortapapeles();
    } catch (error) {
      const esCancelacionUsuario =
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.message === 'Share canceled');

      if (esCancelacionUsuario) {
        return;
      }

      console.error('[STEP-FOUR] Error compartiendo el enlace:', error);
      await this.copiarAlPortapapeles();
    }
  }

  private async copiarAlPortapapeles(): Promise<void> {
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
