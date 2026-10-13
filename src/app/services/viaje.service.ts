import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ViajeResponse } from '../models/viaje.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ViajeService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getViaje(id: number | string): Observable<ViajeResponse> {
    return this.http.get<ViajeResponse>(`${this.baseUrl}/viajes-inmersion/${id}`);
  }

  getZipUrl(id: number | string): string {
    return `${this.baseUrl}/viajes-inmersion/${id}/zip`;
  }
}
