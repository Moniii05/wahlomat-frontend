import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendService } from './backend.service';
import { CandidateProfile } from '../interfaces/candidate-profile';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CandidateProfileService {
  // Basis-Pfad für alle Profil-Endpunkte im Backend
  private readonly base = '/candidate-profiles';

  constructor(private backend: BackendService,
              private auth: AuthService
  ) {}

private get userId(): number {
    const id = this.auth.getUserId();
    if (id == null) {
      throw new Error('Kein eingeloggter User (userId ist null)');
    }
    return id;
  }

  // aktuelles Kandidatenprofil vom Backend holen
  getProfile(): Observable<CandidateProfile> {
   return this.backend.getOne<CandidateProfile>(this.base, this.userId);
  }

  // Profil speichern / überschreiben
  saveProfile(dto: CandidateProfile): Observable<void> {
     return this.backend.put<void>(`${this.base}/${this.userId}`, dto);
  }

}
