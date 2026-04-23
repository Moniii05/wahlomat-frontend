import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendService } from './backend.service';
import {InviteCandidateRequest} from '../interfaces/InviteCandidateRequest';
import {InviteCandidateResponse} from '../interfaces/InviteCandidateResponse';
import {RegisteredCandidateResponse} from '../interfaces/RegisteredCandidateResponse';
import { CandidateProfile } from '../interfaces/candidate-profile';
import { Candidacy, CandidacyCreate } from '../interfaces/candidacy';
import { Committee } from '../interfaces/committee';
import { CandidacyList } from '../interfaces/candidacyList';

@Injectable({ providedIn: 'root' })
export class candidateManagementService {
  private readonly base = '/admin/candidates';

  constructor(private backend: BackendService) {}

  //Einladung verschicken
  invite(email: string): Observable<InviteCandidateResponse> {
    const body: InviteCandidateRequest = { email };
    return this.backend.post<InviteCandidateResponse>(this.base, body);
  }

  bulkInvite(emails: string[]): Observable<{
    totalRequested: number;
    totalUnique: number;
    sent: { email: string; status: 'SENT';   reason?: string }[];
    skipped: { email: string; status: 'SKIPPED'; reason?: string }[];
    failed: { email: string; status: 'FAILED';  reason?: string }[];
  }> {
    return this.backend.post<any>(`${this.base}/bulk`, { emails });
  }

  //alle registrierten Kandidaten laden (für eine Liste)
  listRegistered(): Observable<RegisteredCandidateResponse[]> {
    return this.backend.get<RegisteredCandidateResponse[]>(this.base);
  }

  listInvites(): Observable<InviteCandidateResponse[]> {
    return this.backend.get<InviteCandidateResponse[]>(`${this.base}/invites`);
  }

  //registrierten Kandidaten löschen
  deleteCandidate(userId: number): Observable<void> {
    return this.backend.delete<void>(`${this.base}/${userId}`);
  }

  //alle registrierten Kandidaten löschen
  deleteAll(): Observable<void> {
    return this.backend.delete<void>(this.base);
  }

  //--------------------------US KANDIDATENVERWALTUNG-----------------------------

  getCandidateProfile(userId: number): Observable<CandidateProfile> {
    return this.backend.get<CandidateProfile>(`/candidate-profiles/${userId}`);
  }

  updateCandidateProfile(
    userId: number, body: CandidateProfile): Observable<void> {
    return this.backend.put<void>(`/candidate-profiles/${userId}`, body);
  }

  listCandidaciesByUser(userId: number): Observable<Candidacy[]> {
    return this.backend.get<Candidacy[]>(`/candidacies/user/${userId}`);
  }

  createCandidacy(
    userId: number,body: CandidacyCreate): Observable<Candidacy> {
    return this.backend.post<Candidacy>(`/candidacies/user/${userId}`, body);
  }

  updateCandidacy(
    candidacyId: number, body: CandidacyCreate): Observable<void> {
    return this.backend.put<void>(`/candidacies/${candidacyId}`, body);
  }

  deleteCandidacy(candidacyId: number): Observable<void> {
    return this.backend.delete<void>(`/candidacies/${candidacyId}`);
  }


getCommittees(): Observable<Committee[]> {
  return this.backend.get<Committee[]>(`/lookups/committees`);
}

getAllLists(): Observable<CandidacyList[]> {
  return this.backend.get<CandidacyList[]>(`/lists`);
}

}
