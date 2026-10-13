import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { ViajeService } from './services/viaje.service';
import { ViajeResponse } from './models/viaje.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private viajeService = inject(ViajeService);

  inputId: string = '';
  inputPassword: string = '';
  currentPassword: string = '';
  viajeId: number | null = null;
  viaje: ViajeResponse | null = null;

  isLoading: boolean = false;
  errorMessage: string | null = null;
  isExpired: boolean = false;
  isUnauthorized: boolean = false;

  // Countdown timer
  tiempoRestante: string = '';
  private timerSub?: Subscription;
  private querySub?: Subscription;

  // Lightbox / Modal
  selectedPhoto: string | null = null;
  allPhotos: string[] = [];
  currentPhotoIndex: number = 0;

  ngOnInit(): void {
    this.querySub = this.route.queryParams.subscribe(params => {
      const idParam = params['id'];
      const pwdParam = params['password'] || params['pwd'];

      if (idParam) {
        const idNum = Number(idParam);
        if (!isNaN(idNum) && idNum > 0) {
          this.inputId = String(idNum);
          this.viajeId = idNum;

          if (pwdParam) {
            this.inputPassword = String(pwdParam);
            this.currentPassword = String(pwdParam);
            this.cargarViaje(idNum, this.currentPassword);
          } else {
            // Prompt for password if not provided in URL
            this.viaje = null;
            this.isLoading = false;
            this.errorMessage = null;
          }
          return;
        }
      }
      // If no valid ID param is found, show full search prompt
      this.viaje = null;
      this.viajeId = null;
      this.inputPassword = '';
      this.currentPassword = '';
      this.isLoading = false;
      this.errorMessage = null;
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.querySub?.unsubscribe();
  }

  buscarViaje(): void {
    const trimmedId = this.inputId.trim();
    if (!trimmedId) {
      this.errorMessage = 'Por favor, introduce el ID del viaje.';
      return;
    }
    const id = Number(trimmedId);
    if (isNaN(id) || id <= 0) {
      this.errorMessage = 'Por favor, introduce un número de ID válido.';
      return;
    }

    const trimmedPwd = this.inputPassword.trim();
    if (!trimmedPwd) {
      this.errorMessage = 'Por favor, introduce la contraseña de acceso al viaje.';
      return;
    }

    this.viajeId = id;
    this.cargarViaje(id, trimmedPwd);
  }

  resetearBusqueda(): void {
    this.viaje = null;
    this.viajeId = null;
    this.inputId = '';
    this.inputPassword = '';
    this.currentPassword = '';
    this.errorMessage = null;
    this.isExpired = false;
    this.isUnauthorized = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: null, password: null, pwd: null },
      queryParamsHandling: 'merge'
    });
  }

  cargarViaje(id: number, password?: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.isExpired = false;
    this.isUnauthorized = false;
    this.viaje = null;

    this.viajeService.getViaje(id, password).subscribe({
      next: (data) => {
        this.viaje = data;
        this.currentPassword = password || '';
        this.isLoading = false;
        this.recolectarFotos(data);
        this.iniciarCuentaAtras(data.expiraEn);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.isUnauthorized = true;
          this.errorMessage = 'Contraseña incorrecta. Por favor, verifica la clave del viaje.';
        } else if (err.status === 404) {
          this.isExpired = true;
          this.errorMessage = 'El viaje no existe o el enlace ha caducado (más de 48 horas transcurridas).';
        } else if (err.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor backend. Comprueba que el servicio esté corriendo.';
        } else {
          this.errorMessage = `Error al recuperar el viaje: ${err.message || 'Error desconocido'}`;
        }
      }
    });
  }

  getZipUrl(): string {
    if (!this.viajeId) return '#';
    return this.viajeService.getZipUrl(this.viajeId, this.currentPassword);
  }

  getTotalFotos(): number {
    if (!this.viaje) return 0;
    let count = (this.viaje.fotosViaje || []).length;
    for (const inm of (this.viaje.inmersiones || [])) {
      count += (inm.fotosInmersion || []).length;
    }
    return count;
  }

  private recolectarFotos(data: ViajeResponse): void {
    const list: string[] = [];
    if (data.fotosViaje) {
      list.push(...data.fotosViaje);
    }
    if (data.inmersiones) {
      for (const inm of data.inmersiones) {
        if (inm.fotosInmersion) {
          list.push(...inm.fotosInmersion);
        }
      }
    }
    this.allPhotos = list;
  }

  private iniciarCuentaAtras(expiraEnIso: string): void {
    this.timerSub?.unsubscribe();
    const expDate = new Date(expiraEnIso).getTime();

    const actualizar = () => {
      const ahora = new Date().getTime();
      const diff = expDate - ahora;

      if (diff <= 0) {
        this.tiempoRestante = 'Expirado';
        this.isExpired = true;
        this.timerSub?.unsubscribe();
      } else {
        const horas = Math.floor(diff / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diff % (1000 * 60)) / 1000);
        this.tiempoRestante = `${horas}h ${minutos}m ${segundos}s`;
      }
    };

    actualizar();
    this.timerSub = interval(1000).subscribe(() => actualizar());
  }

  // Lightbox functions
  abrirLightbox(url: string): void {
    const idx = this.allPhotos.indexOf(url);
    this.currentPhotoIndex = idx >= 0 ? idx : 0;
    this.selectedPhoto = url;
  }

  cerrarLightbox(): void {
    this.selectedPhoto = null;
  }

  fotoSiguiente(e: Event): void {
    e.stopPropagation();
    if (this.allPhotos.length === 0) return;
    this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.allPhotos.length;
    this.selectedPhoto = this.allPhotos[this.currentPhotoIndex];
  }

  fotoAnterior(e: Event): void {
    e.stopPropagation();
    if (this.allPhotos.length === 0) return;
    this.currentPhotoIndex = (this.currentPhotoIndex - 1 + this.allPhotos.length) % this.allPhotos.length;
    this.selectedPhoto = this.allPhotos[this.currentPhotoIndex];
  }
}
