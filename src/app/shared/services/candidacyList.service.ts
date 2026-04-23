import {Injectable, signal, WritableSignal} from '@angular/core';
import {Observable, map, tap} from 'rxjs';
import { BackendService } from './backend.service';
import { CandidacyList } from '../interfaces/candidacyList';

//service für CandidacyList, ruft generischen BE service auf
@Injectable({ providedIn: 'root' })
export class CandidacyListService {

  constructor(private backend: BackendService) {}


  lists: WritableSignal<CandidacyList[]> = signal([]);

  // alle Listen (aus der DB) für die Dropdowns laden
  getLists(): Observable<CandidacyList[]> {
    const listsFromBackend = this.backend.get<CandidacyList[]>('/lists')
    // Befüllen des Signals mit den geladenen Listen
    listsFromBackend.subscribe(lists => {
      this.lists.set(lists);
    });
    return listsFromBackend;
  }

  // alle Listen eines Gremiums zurückgeben
  getListsByCommittee(committeeId: string): Observable<CandidacyList[]> {
    return this.backend.get<CandidacyList[]>(`/lists/${committeeId}`);
  }

  // neue CandidacyList anlegen
  createCandidacyList(newList: Partial<CandidacyList>): Observable<CandidacyList> {//newList enthält nicht alle Eigenschaft von CandidacyList Objekt
    return this.backend.post<CandidacyList>('/lists', newList).pipe(
      tap(createdList => {
        this.lists.update(currentLists => [...currentLists, createdList]);//Writebale Signal wird aktualisert
      })
    );
  }


  // Löschen einer CandidacyList
  deleteCandidacyList(listId:  number): Observable <any> {
    return this.backend.delete(`/lists/${listId}`);

  }

}
