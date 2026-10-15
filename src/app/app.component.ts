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

  inputId: string | number = '';
  inputPassword: string = '';
  currentPassword: string = '';
  viajeId: number | null = null;
  viaje: ViajeResponse | null = null;

  isLoading: boolean = false;
  errorMessage: string | null = null;
  isExpired: boolean = false;
  isUnauthorized: boolean = false;
  isIdFromUrl: boolean = false;

  // Countdown timer
  tiempoRestante: string = '';
  private timerSub?: Subscription;
  private querySub?: Subscription;

  // Lightbox / Modal (fotos + vídeos unificados)
  selectedMedia: string | null = null;
  allPhotos: string[] = [];   // solo fotos, para el lightbox de imágenes
  allVideos: string[] = [];   // solo vídeos
  allMedia: string[] = [];    // fotos + vídeos mezclados en orden de aparición
  currentMediaIndex: number = 0;
  currentPhotoIndex: number = 0; // mantenido por compatibilidad

  ngOnInit(): void {
    this.querySub = this.route.queryParams.subscribe(params => {
      const detectedId = this.detectarIdDeUrl(params);
      const pwdParam = params['password'] || params['pwd'];

      if (detectedId) {
        this.isIdFromUrl = true;
        this.inputId = String(detectedId);
        this.viajeId = detectedId;

        if (pwdParam) {
          this.inputPassword = String(pwdParam);
          this.currentPassword = String(pwdParam);
          this.cargarViaje(detectedId, this.currentPassword);
        } else {
          // Si el ID está en la URL pero no la contraseña, mostramos solo el campo de contraseña
          this.viaje = null;
          this.isLoading = false;
          this.errorMessage = null;
        }
        return;
      }

      // Si no se encuentra un ID en la URL, mostrar el formulario completo
      this.isIdFromUrl = false;
      this.viaje = null;
      this.viajeId = null;
      this.inputId = '';
      this.inputPassword = '';
      this.currentPassword = '';
      this.isLoading = false;
      this.errorMessage = null;
    });
  }

  private detectarIdDeUrl(params: any): number | null {
    // 1. Comprobar query params (?id=1, ?trip=1, ?viaje=1)
    const qId = params['id'] || params['trip'] || params['viaje'];
    if (qId) {
      const num = Number(qId);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }

    // 2. Comprobar segmentos del path (/1, /viaje/1, /viajes-inmersion/1)
    const pathname = window.location.pathname || '';
    const segments = pathname.split('/').filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const num = Number(segments[i]);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }

    return null;
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.querySub?.unsubscribe();
  }

  buscarViaje(): void {
    const rawId = String(this.inputId ?? '').trim();
    if (!rawId) {
      this.errorMessage = 'Por favor, introduce el ID del viaje.';
      return;
    }
    const id = Number(rawId);
    if (isNaN(id) || id <= 0) {
      this.errorMessage = 'Por favor, introduce un número de ID válido.';
      return;
    }

    const trimmedPwd = String(this.inputPassword ?? '').trim();
    if (!trimmedPwd) {
      this.errorMessage = 'Por favor, introduce la contraseña de acceso al viaje.';
      return;
    }

    this.viajeId = id;
    this.cargarViaje(id, trimmedPwd);
  }

  cambiarIdManual(): void {
    this.isIdFromUrl = false;
    this.viaje = null;
    this.viajeId = null;
    this.inputId = '';
    this.inputPassword = '';
    this.currentPassword = '';
    this.errorMessage = null;
    this.isExpired = false;
    this.isUnauthorized = false;
    this.router.navigate(['/'], { queryParams: {} });
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
    this.isIdFromUrl = false;
    this.router.navigate(['/'], { queryParams: {} });
  }

  cargarViaje(id: number, password?: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.isExpired = false;
    this.isUnauthorized = false;
    this.viaje = null;

    this.viajeService.getViaje(id, password).subscribe({
      next: (data) => {
        if (data.inmersiones && data.inmersiones.length > 0) {
          data.inmersiones.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        }
        this.viaje = data;
        this.currentPassword = password || '';
        this.isLoading = false;
        this.recolectarMedia(data);
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

  getTotalVideos(): number {
    if (!this.viaje) return 0;
    let count = (this.viaje.videosViaje || []).length;
    for (const inm of (this.viaje.inmersiones || [])) {
      count += (inm.videosInmersion || []).length;
    }
    return count;
  }

  getTotalMedia(): number {
    return this.getTotalFotos() + this.getTotalVideos();
  }

  private recolectarMedia(data: ViajeResponse): void {
    const fotos: string[] = [];
    const videos: string[] = [];
    const media: string[] = [];

    if (data.fotosViaje) {
      fotos.push(...data.fotosViaje);
      media.push(...data.fotosViaje);
    }
    if (data.videosViaje) {
      videos.push(...data.videosViaje);
      media.push(...data.videosViaje);
    }
    if (data.inmersiones) {
      for (const inm of data.inmersiones) {
        if (inm.fotosInmersion) {
          fotos.push(...inm.fotosInmersion);
          media.push(...inm.fotosInmersion);
        }
        if (inm.videosInmersion) {
          videos.push(...inm.videosInmersion);
          media.push(...inm.videosInmersion);
        }
      }
    }
    this.allPhotos = fotos;
    this.allVideos = videos;
    this.allMedia = media;
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
    const idx = this.allMedia.indexOf(url);
    this.currentMediaIndex = idx >= 0 ? idx : 0;
    this.currentPhotoIndex = this.currentMediaIndex;
    this.selectedMedia = url;
  }

  cerrarLightbox(): void {
    this.selectedMedia = null;
  }

  isVideo(url: string | null): boolean {
    if (!url) return false;
    return this.allVideos.includes(url);
  }

  mediaSiguiente(e: Event): void {
    e.stopPropagation();
    if (this.allMedia.length === 0) return;
    this.currentMediaIndex = (this.currentMediaIndex + 1) % this.allMedia.length;
    this.currentPhotoIndex = this.currentMediaIndex;
    this.selectedMedia = this.allMedia[this.currentMediaIndex];
  }

  mediaAnterior(e: Event): void {
    e.stopPropagation();
    if (this.allMedia.length === 0) return;
    this.currentMediaIndex = (this.currentMediaIndex - 1 + this.allMedia.length) % this.allMedia.length;
    this.currentPhotoIndex = this.currentMediaIndex;
    this.selectedMedia = this.allMedia[this.currentMediaIndex];
  }

  /** @deprecated use mediaSiguiente */
  fotoSiguiente(e: Event): void { this.mediaSiguiente(e); }
  /** @deprecated use mediaAnterior */
  fotoAnterior(e: Event): void { this.mediaAnterior(e); }
}
