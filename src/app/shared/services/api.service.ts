import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export const API_URL = 'https://bourse-app-backend.onrender.com';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ── Auth ────────────────────────────────────────────────
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${API_URL}/users/login`, { email, password });
  }

  // ── Portefeuille ────────────────────────────────────────
  getTransactions(portefeuilleId: number): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/portefeuille/${portefeuilleId}/transactions`);
  }

  // ── Actions ─────────────────────────────────────────────
  getActions(): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/actions/`);
  }

  getAllTransactions(): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/transactions/`);
  }

  // ── Trading ─────────────────────────────────────────────
  postTransaction(data: any): Observable<any> {
    return this.http.post(`${API_URL}/transactions/`, data);
  }
}
