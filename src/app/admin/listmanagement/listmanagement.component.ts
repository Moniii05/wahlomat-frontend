import {Component, inject, OnInit} from '@angular/core';
import {CandidacyListService} from '../../shared/services/candidacyList.service';
import {StaticDataService} from '../../shared/services/static-data.service';
import {Committee} from '../../shared/interfaces/committee';
import {CandidacyList} from '../../shared/interfaces/candidacyList';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Candidacy} from '../../shared/interfaces/candidacy';
import {CandidacyService} from '../../shared/services/candidacy.service';
import {TranslocoModule} from '@jsverse/transloco';

//Komponente für admin, um Listen zu verwalten
@Component({
  selector: 'app-listmanagement',
  imports: [ReactiveFormsModule,
  TranslocoModule],
  templateUrl: './listmanagement.component.html',
  styleUrl: './listmanagement.component.css'
})
export class ListmanagementComponent implements OnInit{
  private listService = inject(CandidacyListService);
  private committeeService = inject(StaticDataService);
  private candidacyService = inject(CandidacyService);

  // für Modal Dialog löschen
  currentListId: number | null = null;
  currentCommitteeId: string | null = null;
  candidaciesForList: Candidacy[] = [];
  candidaciesCount: number = 0;

  allCommittees: Committee[] = []; // Array, um die Daten aus dem Observable zu speichern
  listsPerCommittee: { [committeeId: string]: CandidacyList[] } = {}; // Objekt zur Speicherung der Listen pro Gremium, ähnlich einer Map

  // Zum Erstellen eines neuen Listen-Eintrags
  addingNewList = false; //um Sichtbarkeit für Button "Liste hinzufügen" zu verwalten
  newList = { number: 0, listName: '', committeeId: '' };
  // Fehlermeldung für Listen-Duplikate
  duplicateError: string | null = null;

  // abbonieren des Lifecycle Hooks mithilfe von ngOnInit
  ngOnInit(): void {
    this.loadCommittees()
     this.loadAllLists(); // zum Aktualisieren der Listen
  }

  // alle Gremien laden und Aufruf zum Laden der Listen
  loadCommittees() {
    this.committeeService.getCommittees().subscribe(committees => {
      this.allCommittees = committees;
      // Lade Listen für alle Committees
      this.loadAllLists();
    });
  }

  // alle Listen pro Gremium laden und in listsPerCommittee speichern
  loadAllLists() {
    this.allCommittees.forEach(committee => {
      this.listService.getListsByCommittee(committee.committeeId)
        .subscribe(lists => {
          this.listsPerCommittee[committee.committeeId] = lists;
        });
    });
  }

  // alle Listen eines Gremiums übergeben
  getListsForCommittee(committeeId: string): CandidacyList[] {
    return this.listsPerCommittee[committeeId] || [];
  }


  // CandidacyList anlegen
  startAddList(): void {
    this.addingNewList = true;
    this.listForm.reset(); // leeren der Felder vom Formular
  }

  listForm = new FormGroup({
    numberControl : new FormControl<number>(1, [Validators.required, Validators.min(1)]), //Formularfeld muss ausgefüllt sein, Zahlen ab 1 -->  min(1)im html ebenfalls hinterlegt
    nameControl: new FormControl<string>('', Validators.required)
  });

  // um eine neu angelegte Liste zu speichern -> Werte aus der html
  saveNewList(committeeId: string): void {
    const values = this.listForm.value;

    // newList Objekt mit Werten füllen
    this.newList.number = values.numberControl || 0;
    this.newList.listName = values.nameControl || '';
    this.newList.committeeId = committeeId || '';

    // Überprüfung auf Duplikate (gleiche Listennummer)
    const existingList = this.listsPerCommittee[committeeId]?.find(
      list => list.number === this.newList.number
    );

    if (existingList) {
      // Fehlermeldung setzen statt alert()
      if (existingList.number === this.newList.number && existingList.listName === this.newList.listName) {
        this.duplicateError = 'Eine Liste mit dieser Nummer und diesem Namen existiert bereits.';
      } else if (existingList.number === this.newList.number) {
        this.duplicateError = `Liste ${existingList.number} existiert bereits.`;
      } return;
    }

    // Fehlermeldung zurücksetzen
    this.duplicateError = null;

    // Service-Aufruf zum Erstellen der neuen Liste + Aktualisierung der lokalen Listen
    this.listService.createCandidacyList(this.newList).subscribe(createdList => {
        console.log('Created List: ', createdList);

         // sicherstellen, dass das Array vorhanden ist, bevor `push` verwendet wird
      if (!this.listsPerCommittee[committeeId]) {
        this.listsPerCommittee[committeeId] = [];
      }
        this.listsPerCommittee[committeeId].push(createdList);

    this.addingNewList = false;
    this.listForm.reset();
    });
  }


  // Abbrechen bei neuem Listeneintrag
  cancelAddNewList(): void {
    this.addingNewList = false;
  }

    // Methode, um IDs zu setzen, um sie im Modal verfügbar zu machen
setListToDelete(listId: number, committeeId: string): void {
    this.currentListId = listId;
    this.currentCommitteeId = committeeId;

    this.candidacyService.getCandidaciesByList(listId).subscribe(candidacies => {
      this.candidaciesForList = candidacies;
      this.candidaciesCount = candidacies.length;
  });
  }

  // Modal Dialog

  // Check, ob Kandidaturen für die Liste existieren
  existingCandidacies(): number {
    if (this.currentListId != null) {
      this.candidacyService.getCandidaciesByList(this.currentListId).subscribe(candidacies => {
        this.candidaciesForList = candidacies;
      });
    }
    return this.candidaciesForList.length;
  }

  // Bestätigung und löschen der CandidacyList
  confirmDelete(): void {
    if (this.currentListId != null && this.currentCommitteeId != null) {
      this.listService.deleteCandidacyList(this.currentListId).subscribe({
        next: response => {
          console.log('CandidacyList erfolgreich gelöscht', response);

          this.listsPerCommittee[this.currentCommitteeId!] =
            this.listsPerCommittee[this.currentCommitteeId!].filter(list => list.listId !== this.currentListId);
          // Reset der aktuell ausgewählten IDs
          this.currentListId = null;
          this.currentCommitteeId = null;
        },
        error: error => {
          console.error('Fehler beim Löschen der CandidacyList', error);
          alert('Fehler: ' + (error.message || error.statusText));
        }
      });
    }
  }
}




