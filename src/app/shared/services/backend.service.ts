// Generischer Service, der HTTP-Anfragen an das Backend weiterleitet und dabei Authentifizierungs-Header hinzufügt.

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class BackendService {
  apiURL = 'http://localhost:8080/api';


  constructor(private http: HttpClient) {}
  
  // GET Request
  get<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value as string);
        }
      });
    }
    return this.http.get<T>(`${this.apiURL}${endpoint}`, { params: httpParams });
  }
  
  // GET One
  getOne<T>(endpoint: string, id: number | string): Observable<T> {
    return this.http.get<T>(`${this.apiURL}${endpoint}/${id}`);
  }
  
  // POST Request
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiURL}${endpoint}`, body);
  }
  
  // PUT Request
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiURL}${endpoint}`, body);
  }
  
  // PATCH Request
  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.apiURL}${endpoint}`, body);
  }
  
  // DELETE Request
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiURL}${endpoint}`);
  }
}
