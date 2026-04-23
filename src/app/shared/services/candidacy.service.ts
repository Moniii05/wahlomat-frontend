import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendService } from './backend.service';
import { Candidacy, CandidacyCreate } from '../interfaces/candidacy';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CandidacyService {

  // Basis-Pfad für alle Kandidatur-Endpunkte
  private readonly base = '/candidacies';

  constructor(private backend: BackendService,
              private auth: AuthService
  ) {}

 private get userId(): number {
    const id = this.auth.getUserId();
    if (id == null) {
      throw new Error('Kein eingeloggter User');
    }
    return id;
  }

  // alle Kandidaturen des aktuellen Users laden
  listCandidacies(): Observable<Candidacy[]> {
    return this.backend.get<Candidacy[]>(`${this.base}/user/${this.userId}`);
  }

  // alle Kandidaturen für eine bestimmte Liste laden
  getCandidaciesByList(listId: number): Observable<Candidacy[]> {
     return this.backend.get<Candidacy[]>(`${this.base}/list/${listId}`);
  }

  // neue Kandidatur im Backend anlegen
 createCandidacy(payload: CandidacyCreate): Observable<Candidacy> {
    return this.backend.post<Candidacy>(`${this.base}/user/${this.userId}`, payload);
  }
  

  // bestehende Kandidatur aktualisieren
  updateCandidacy(candidacyId: number, payload: CandidacyCreate): Observable<void> {
     return this.backend.put<void>(`${this.base}/${candidacyId}`, payload);
  }

  // Kandidatur löschen
  deleteCandidacy(candidacyId: number): Observable<void> {
    return this.backend.delete<void>(`${this.base}/${candidacyId}`);
  }
}
