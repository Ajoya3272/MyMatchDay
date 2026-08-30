import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PistaService } from '../../../services/pista.service';
import { UbicacionService } from '../../../services/ubicacion.service';
import { MiPerfilService } from '../../../services/mi-perfil.service';
import { Pista } from '../../../interfaces/Pista.interface';
import {
  MunicipioIne,
  ProvinciaIne,
} from '../../../interfaces/ubicacion.interface';

@Component({
  selector: 'app-step-one',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step-one.component.html',
  styleUrls: ['./step-one.component.scss'],
})
export class StepOneComponent implements OnInit {
  private pistaService = inject(PistaService);
  private ubicacionService = inject(UbicacionService);
  private miPerfilService = inject(MiPerfilService);

  @Output() pistaSeleccionadaChange = new EventEmitter<Pista>();

  pistas: Pista[] = [];
  provincias: ProvinciaIne[] = [];
  municipios: MunicipioIne[] = [];

  cargandoPistas = true;
  cargandoMunicipios = false;

  provinciaSeleccionadaId = '';
  municipioSeleccionadoId = '';

  otraUbicacionActiva = false;
  nombreOtraUbicacion = '';
  errorOtraUbicacion = '';

  ngOnInit(): void {
    this.cargarPistas();
    void this.inicializarProvincias();
  }

  private cargarPistas(): void {
    this.cargandoPistas = true;

    this.pistaService.obtenerPistas().subscribe({
      next: (pistas) => {
        this.pistas = pistas;
        this.cargandoPistas = false;
      },
      error: (error) => {
        console.error('[STEP-ONE] Error cargando pistas:', error);

        this.pistas = [];
        this.cargandoPistas = false;
      },
    });
  }

  private async inicializarProvincias(): Promise<void> {
    this.provincias = await this.ubicacionService.obtenerProvincias();

    await this.precargarUbicacionUsuario();
  }

  private async precargarUbicacionUsuario(): Promise<void> {
    try {
      const usuario = await firstValueFrom(this.miPerfilService.usuario$);

      const provinciaUsuario = usuario?.provincia?.trim();

      if (!provinciaUsuario) {
        return;
      }

      const provinciaEncontrada = this.provincias.find(
        (provincia) =>
          this.normalizar(provincia.nombre) ===
          this.normalizar(provinciaUsuario),
      );

      if (!provinciaEncontrada) {
        return;
      }

      await this.seleccionarProvincia(provinciaEncontrada.provincia_id);

      const localidadUsuario = usuario?.localidad?.trim();

      if (!localidadUsuario) {
        return;
      }

      const municipioEncontrado = this.municipios.find(
        (municipio) =>
          this.normalizar(municipio.nombre) ===
          this.normalizar(localidadUsuario),
      );

      if (municipioEncontrado) {
        this.seleccionarMunicipio(municipioEncontrado.municipio_id);
      }
    } catch (error) {
      console.error(
        '[STEP-ONE] Error precargando ubicación del usuario:',
        error,
      );
    }
  }

  async seleccionarProvincia(provinciaId: string): Promise<void> {
    this.provinciaSeleccionadaId = provinciaId;
    this.municipioSeleccionadoId = '';
    this.municipios = [];

    this.otraUbicacionActiva = false;
    this.nombreOtraUbicacion = '';
    this.errorOtraUbicacion = '';

    if (!provinciaId) {
      return;
    }

    this.cargandoMunicipios = true;

    this.municipios =
      await this.ubicacionService.obtenerMunicipiosDeProvincia(provinciaId);

    this.cargandoMunicipios = false;
  }

  seleccionarMunicipio(municipioId: string): void {
    this.municipioSeleccionadoId = municipioId;

    this.otraUbicacionActiva = false;
    this.nombreOtraUbicacion = '';
    this.errorOtraUbicacion = '';
  }

  get provinciaNombreSeleccionada(): string {
    return (
      this.provincias.find(
        (provincia) => provincia.provincia_id === this.provinciaSeleccionadaId,
      )?.nombre ?? ''
    );
  }

  get municipioNombreSeleccionado(): string {
    return (
      this.municipios.find(
        (municipio) => municipio.municipio_id === this.municipioSeleccionadoId,
      )?.nombre ?? ''
    );
  }

  get pistasEncontradas(): Pista[] {
    if (!this.provinciaSeleccionadaId || !this.municipioSeleccionadoId) {
      return [];
    }

    const provinciaSeleccionada = this.normalizar(
      this.provinciaNombreSeleccionada,
    );

    const municipioSeleccionado = this.normalizar(
      this.municipioNombreSeleccionado,
    );

    return this.pistas.filter((pista) => {
      const provinciaPista = this.normalizar(pista.provincia);

      const municipioPista = this.normalizar(pista.localidad);

      return (
        provinciaPista === provinciaSeleccionada &&
        municipioPista === municipioSeleccionado
      );
    });
  }

  private normalizar(texto?: string | null): string {
    return (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  seleccionarPista(pista: Pista): void {
    this.pistaSeleccionadaChange.emit(pista);
  }

  activarOtraUbicacion(): void {
    if (!this.provinciaSeleccionadaId || !this.municipioSeleccionadoId) {
      return;
    }

    this.otraUbicacionActiva = true;
    this.nombreOtraUbicacion = '';
    this.errorOtraUbicacion = '';
  }

  cancelarOtraUbicacion(): void {
    this.otraUbicacionActiva = false;
    this.nombreOtraUbicacion = '';
    this.errorOtraUbicacion = '';
  }

  continuarConOtraUbicacion(): void {
    const nombreUbicacion = this.nombreOtraUbicacion.trim();

    if (!nombreUbicacion) {
      this.errorOtraUbicacion =
        'Escribe el nombre de la pista, urbanización o ubicación.';
      return;
    }

    if (nombreUbicacion.length < 3) {
      this.errorOtraUbicacion = 'El nombre debe tener al menos 3 caracteres.';
      return;
    }

    if (nombreUbicacion.length > 100) {
      this.errorOtraUbicacion =
        'El nombre no puede superar los 100 caracteres.';
      return;
    }

    const pistaManual: Pista = {
      pistaId: `manual-${Date.now()}`,
      nombre: nombreUbicacion,
      localidad: this.municipioNombreSeleccionado,
      provincia: this.provinciaNombreSeleccionada,
    };

    this.pistaSeleccionadaChange.emit(pistaManual);
  }
}
