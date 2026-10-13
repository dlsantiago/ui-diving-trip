import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ViajeResponse } from '../models/viaje.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ViajeService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getViaje(id: number | string, password?: string): Observable<ViajeResponse> {
    let headers = new HttpHeaders();
    if (password) {
      headers = headers.set('X-Password', password);
    }
    return this.http.get<ViajeResponse>(`${this.baseUrl}/viajes-inmersion/${id}`, { headers });
  }

  getZipUrl(id: number | string, password?: string): string {
    const pwdParam = password ? `?password=${encodeURIComponent(password)}` : '';
    return `${this.baseUrl}/viajes-inmersion/${id}/zip${pwdParam}`;
  }
}
