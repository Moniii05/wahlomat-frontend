import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendService } from './backend.service';
import { Faculty } from '../interfaces/faculty';
import { Committee } from '../interfaces/committee';

@Injectable({ providedIn: 'root' })
export class StaticDataService {

  constructor(private backend: BackendService) {}

  // Fachbereiche vom Backend holen
  getFaculties(): Observable<Faculty[]> {
    return this.backend.get<Faculty[]>('/lookups/faculties');
  }

  // Gremien vom Backend holen
  getCommittees(): Observable<Committee[]> {
    return this.backend.get<Committee[]>('/lookups/committees');
  }
}
