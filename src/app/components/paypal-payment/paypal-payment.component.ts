import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { environment } from '../../../enviroments/enviroment';

declare const paypal: any;

export interface PagoCompletado {
  orderId: string;
  payerId: string;
}

let paypalSdkPromise: Promise<void> | null = null;

function cargarSdkPaypal(): Promise<void> {
  if (paypalSdkPromise) {
    return paypalSdkPromise;
  }

  paypalSdkPromise = new Promise((resolve, reject) => {
    if (typeof paypal !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${environment.paypalClientId}&currency=EUR&intent=capture`;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('No se pudo cargar el SDK de PayPal'));
    document.body.appendChild(script);
  });

  return paypalSdkPromise;
}

@Component({
  selector: 'app-paypal-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paypal-payment.component.html',
  styleUrls: ['./paypal-payment.component.scss'],
})
export class PaypalPaymentComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) amount!: number;
  @Input({ required: true }) payeeEmail!: string;

  @Output() pagoCompletado = new EventEmitter<PagoCompletado>();
  @Output() pagoError = new EventEmitter<void>();

  @ViewChild('paypalContainer', { static: true })
  paypalContainer!: ElementRef<HTMLDivElement>;

  cargando = true;
  error = false;

  private botones: any = null;

  async ngAfterViewInit(): Promise<void> {
    try {
      await cargarSdkPaypal();
      this.renderizarBotones();
      this.cargando = false;
    } catch (error) {
      console.error('[PAYPAL-PAYMENT] Error cargando el SDK:', error);
      this.cargando = false;
      this.error = true;
    }
  }

  ngOnDestroy(): void {
    if (this.botones?.close) {
      this.botones.close();
    }
  }

  get precioFormateado(): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(this.amount);
  }

  private renderizarBotones(): void {
    this.botones = paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'pill',
        label: 'pay',
      },
      createOrder: (_data: unknown, actions: any) => {
        return actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                value: this.amount.toFixed(2),
                currency_code: 'EUR',
              },
              payee: {
                email_address: this.payeeEmail,
              },
            },
          ],
        });
      },
      onApprove: async (_data: unknown, actions: any) => {
        const order = await actions.order.capture();

        this.pagoCompletado.emit({
          orderId: order.id,
          payerId: order.payer?.payer_id ?? '',
        });
      },
      onError: (error: unknown) => {
        console.error('[PAYPAL-PAYMENT] Error en el pago:', error);
        this.pagoError.emit();
      },
    });

    this.botones.render(this.paypalContainer.nativeElement);
  }
}
