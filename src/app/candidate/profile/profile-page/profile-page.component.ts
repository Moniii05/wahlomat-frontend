import { Component, OnInit, inject, signal } from '@angular/core';// OnInit = erlaubt Code auszuführen, sobald die Seite geladen wird
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs'; // forkJoin = mehrere Backend-Anfragen parallel ausführen // of = künstliches Observable erzeugen
import { switchMap } from 'rxjs/operators';

// Services
import { StaticDataService } from '../../../shared/services/static-data.service';
import { CandidacyListService } from '../../../shared/services/candidacyList.service';
import { CandidateProfileService } from '../../../shared/services/candidate-profile.service';
import { CandidacyService } from '../../../shared/services/candidacy.service';


// Models
import { CandidateProfile } from '../../../shared/interfaces/candidate-profile';
import { Candidacy } from '../../../shared/interfaces/candidacy';
import { Faculty } from '../../../shared/interfaces/faculty';
import { Committee } from '../../../shared/interfaces/committee';
import { CandidacyList } from '../../../shared/interfaces/candidacyList';
import {AuthService} from '../../../shared/services/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.css']
})

export class ProfilePageComponent implements OnInit {
    // FormBuilder + Services injecten // Angular erstellt diese Objekte automatisch
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private profileApi = inject(CandidateProfileService);
  private candidacyApi = inject(CandidacyService);
  private staticApi = inject(StaticDataService);
  private listApi = inject(CandidacyListService);

    // einfache UI-Statusvariablen

  loading = signal(false);
  savingAll = signal(false);
  errorMsg = signal<string | null>(null);
  infoMsg = signal<string | null>(null);
  editMode = signal(false); // Toggle für Bearbeitungsmodus (standardmäßig read-only)

  // Formular-Gruppe für das Kandidatenprofil
  profileForm = this.fb.group({
    firstname: ['', Validators.required],
    lastname:  ['', Validators.required],
    facultyId: [1, Validators.required],
    aboutMe:   ['',Validators.maxLength(500)]
  });

  // Formular-Gruppe für Passwortänderung (alle Felder required)
  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
  }, {
    validators: this.passwordMatchValidator() // Custom Validator auf Gruppen-Ebene
  });

  // Liste aller Kandidaturen des Users
  // Signal, damit UI automatisch aktualisiert wird
  candidacies = signal<Candidacy[]>([]);
  private toDeleteIds = new Set<number>();
  // Controls für neue, noch nicht gespeicherte Kandidatur
  newCommitteeCtrl = new FormControl<string>('', { nonNullable: true }); // ausgewähltes Gremium (String-ID wie "FSR1")
  newListCtrl      = new FormControl<number>(0,   { nonNullable: true });// ausgewählte Liste (number-ID)

  // Dropdown-Daten
  faculties:  Faculty[] = [];

  committeesAll: Committee[] = []; //alle Gremien
  committees: Committee[] = [];    // nach FB gefiltert
  availableCommittees: Committee[] = []; // nach FB gefiltert UND ohne bereits verwendete Gremien

  listsAll:   CandidacyList[] = []; //alle Listen
  filteredLists: CandidacyList[] = []; //nach Gremium gefiltert


  // abbonieren des Lifecycle Hooks mithilfe von ngOnInit
  ngOnInit(): void {
    this.loadAll(); // Beim Laden der Seite: alle Daten vom Backend holen
    this.updateFormState(); // Initial State setzen (Read-Only)

    // Wenn Gremium gewählt wird: Listen filtern
    this.newCommitteeCtrl.valueChanges.subscribe(key => {
       this.applyListFilter(key);
    });

    // Wenn Fachbereich geändert wird : alles neu filtern + reset
    this.profileForm.controls.facultyId.valueChanges.subscribe(() => {
      this.applyCommitteeFilter();
      this.onFacultyChangedCleanup();
    });
  }

  // Lädt alle benötigten Daten parallel: FB,Gremien,Listen, Profil & Kandidaturen des Users

  private loadAll(): void {
  this.loading.set(true);
  this.errorMsg.set(null);
// Mehrere Backend-Anfragen parallel ausführen
  forkJoin({
    fac: this.staticApi.getFaculties(),
    com: this.staticApi.getCommittees(),
    lis: this.listApi.getLists(),
    profile: this.profileApi.getProfile(),
    cand: this.candidacyApi.listCandidacies()
  }).subscribe({
    next: ({ fac, com, lis, profile, cand }) => {
     // Dropdown-Daten setzen
      this.faculties = fac ?? [];
      this.listsAll  = lis ?? [];
      this.committeesAll = com ?? [];
      // Profil ins Formular einsetzen
      if (profile) {
        this.profileForm.patchValue(profile);
      }
      this.candidacies.set(cand ?? []);

      this.applyCommitteeFilter();
      this.applyListFilter(this.newCommitteeCtrl.value);
    },

    error: (err) => this.handleError(err),
    complete: () => this.loading.set(false)
  });
}

 // Filterung
  private applyCommitteeFilter(): void {
    const facultyId = Number (this.profileForm.controls.facultyId.value);

    // Nach Fachbereich filtern
    this.committees = this.committeesAll.filter(c =>
      c.FACULTY == null || c.FACULTY === facultyId
    );

    // Zusätzlich: bereits verwendete Gremien ausschließen
    this.updateAvailableCommittees();

    const selected = this.newCommitteeCtrl.value;
    if (selected && !this.availableCommittees.some(c => c.committeeId === selected)) {
      this.clearNewSelection();
      this.applyListFilter(null);
    }
  }

  // Berechnet Gremien, die noch nicht in candidacies() enthalten sind
  private updateAvailableCommittees(): void {
    const usedCommitteeIds = new Set(this.candidacies().map(c => c.committeeId));
    this.availableCommittees = this.committees.filter(c => !usedCommitteeIds.has(c.committeeId));
  }

  private applyListFilter(committeeId: string | null): void {
    this.filteredLists = committeeId
      ? this.listsAll.filter(l => l.committeeId === committeeId)
      : [];

    // falls aktuelle Liste nicht mehr passt → reset
    if (
      this.newListCtrl.value &&
      !this.filteredLists.some(l => l.listId === this.newListCtrl.value)
    ) {
      this.newListCtrl.setValue(0);
    }
  }

  // Wird aufgerufen, wenn der Fachbereich geändert wurde
 private onFacultyChangedCleanup(): void {
  this.clearNewSelection();
  this.applyListFilter(null);
  this.errorMsg.set(null);
  this.infoMsg.set(null);

  const allowedCommittees = new Set(this.committees.map(c => c.committeeId));

  const removed: Candidacy[] = [];
  this.candidacies.update(arr => {
    const keep: Candidacy[] = [];
    for (const c of arr) {
      if (allowedCommittees.has(c.committeeId)) keep.push(c);
      else removed.push(c);
    }
    return keep;
  });

  for (const c of removed) {
    if (c.candidacyId) this.toDeleteIds.add(c.candidacyId);
  }
}

  // Check ob beide Felder befüllt sind
  canStage(): boolean {
    return !!this.newCommitteeCtrl.value && !!this.newListCtrl.value;
  }


  // Helper zur Anzeige von Namen
  committeeName(key: string): string {
    return this.committees.find(c => c.committeeId === key)?.committeeName ?? key;
  }

  // Wandelt listId in Anzeigenamen um
  listName(id: number): string {
    const list = this.listsAll.find(l => l.listId === id);
    if (!list) return `#${id}`;
    return this.formatListName(list);
  }

  // Formatiert Listenname: "Liste {number}" oder "Liste {number}: {name}"
  formatListName(list: CandidacyList): string {
    if (!list.listName || list.listName.trim() === '') {
      return `Liste ${list.number}`;
    }
    return `Liste ${list.number}: ${list.listName}`;
  }

  // Aktiviert den Bearbeitungsmodus
  enterEditMode(): void {
    this.editMode.set(true);
    this.updateFormState();
    this.errorMsg.set(null);
    this.infoMsg.set(null);
  }

  // Bricht die Bearbeitung ab und wechselt zurück in den Read-Only-Modus
  cancelEdit(): void {
    this.editMode.set(false);
    this.updateFormState();
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    // Formular und Kandidaturen zurücksetzen (neu laden)
    this.loadAll();
    this.clearNewSelection();
    this.passwordForm.reset(); // Passwort-Formular zurücksetzen
  }

  // Aktiviert/Deaktiviert alle Formularfelder basierend auf editMode
  private updateFormState(): void {
    if (this.editMode()) {
      this.profileForm.enable();
      this.newCommitteeCtrl.enable();
      this.newListCtrl.enable();
    } else {
      this.profileForm.disable();
      this.newCommitteeCtrl.disable();
      this.newListCtrl.disable();
    }
  }

  // Custom Validator: Prüft, ob newPassword und confirmPassword übereinstimmen
  private passwordMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const newPwd = group.get('newPassword')?.value;
      const confirmPwd = group.get('confirmPassword')?.value;

      if (!newPwd || !confirmPwd) return null;

      return newPwd === confirmPwd ? null : { passwordMismatch: true };
    };
  }

  // Prüft, ob Passwort geändert werden soll
  private isPasswordChangeRequested(): boolean {
    const current = this.passwordForm.get('currentPassword')?.value;
    const newPwd = this.passwordForm.get('newPassword')?.value;
    const confirm = this.passwordForm.get('confirmPassword')?.value;

    return !!(current || newPwd || confirm);
  }


  // Dropdown-Auswahl zurücksetzen
  clearNewSelection() {
    this.newCommitteeCtrl.setValue('');
    this.newListCtrl.setValue(0);
  }


  //Fügt eine neue (noch nicht gespeicherte) Kandidatur zur Liste hinzu
  stageCandidacy(): void {
    if (!this.canStage()) return;
    const committeeId = this.newCommitteeCtrl.value!;
    const listId = Number(this.newListCtrl.value!);

    // Sicherheit: Liste muss zum Gremium gehören
    if (!this.filteredLists.some(l => l.listId === listId)) {
      this.errorMsg.set('Ungültige Liste für dieses Gremium.');
      return;
    }
    const staged: Candidacy = {
      candidacyId: null,
      committeeId,
      listId
    };
    this.candidacies.update(arr => [...arr, staged]); // Kandidatur zur Liste hinzufügen
    this.updateAvailableCommittees(); // Verfügbare Gremien neu berechnen
    this.clearNewSelection(); // Dropdowns zurücksetzen
  }

  //Entfernt eine Kandidatur visuell.
  //Falls sie schon gespeichert war → ID merken, damit die Löschung ans Backend geht.
  removeRow(c: Candidacy): void {
    this.candidacies.update(arr => arr.filter(x => x !== c));
    if (c.candidacyId) {
      this.toDeleteIds.add(c.candidacyId);
    }
    this.updateAvailableCommittees(); // Verfügbare Gremien neu berechnen
  }

  //Speichert: Profil, Neue Kandidaturen, Gelöschte Kandidaturen, Passwort (optional)

  saveAll(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.errorMsg.set('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    // Passwort-Validierung: Nur wenn mind. ein Feld ausgefüllt ist
    if (this.isPasswordChangeRequested()) {
      if (this.passwordForm.invalid) {
        this.passwordForm.markAllAsTouched();
        this.errorMsg.set('Bitte überprüfe die Passwort-Eingaben.');
        return;
      }
    }

    this.savingAll.set(true);
    this.errorMsg.set(null);

    const profileDto = this.profileForm.getRawValue() as CandidateProfile;
    const toCreate = this.candidacies().filter(c => !c.candidacyId);
    const toDelete = Array.from(this.toDeleteIds);

    // Profil speichern danach Kandidaturen speichern/löschen
    this.profileApi.saveProfile(profileDto).pipe(
       // Danach alle Kandidatur-Operationen ausführen
      switchMap(() => {
        const ops = [];

        for (const c of toCreate) {
          ops.push(this.candidacyApi.createCandidacy({ committeeId: c.committeeId, listId: c.listId }));
        }
        for (const id of toDelete) {
          ops.push(this.candidacyApi.deleteCandidacy(id));
        }

        return ops.length ? forkJoin(ops) : of(null);
      }),

       // Optional: Passwort ändern
      switchMap(() => {
        if (this.isPasswordChangeRequested()) {
          const passwordDto: ChangePasswordRequest = {
            currentPassword: this.passwordForm.value.currentPassword!,
            newPassword: this.passwordForm.value.newPassword!
          };
          return this.authService.changePassword(passwordDto);
        }
        return of(null);
      }),

       // Danach erneut die frischen Kandidaturen laden
      switchMap(() => this.candidacyApi.listCandidacies())
    ).subscribe({
      next: (fresh) => {
        this.candidacies.set(fresh ?? []);
        this.toDeleteIds.clear();

        // Erfolgsmeldung anpassen, je nachdem ob Passwort geändert wurde
        if (this.isPasswordChangeRequested()) {
          this.infoMsg.set('Profil, Kandidaturen und Passwort erfolgreich gespeichert.');
          this.passwordForm.reset();
        } else {
          this.infoMsg.set('Profil & Kandidaturen gespeichert.');
        }

        this.editMode.set(false); // Zurück in den Read-Only-Modus nach erfolgreichem Speichern
        this.updateFormState();
      },
      error: (err) => this.handleError(err),
      complete: () => this.savingAll.set(false)
    });
  }
  // Einheitliches Fehlerhandling
  private handleError(err: unknown) {
    console.error(err);
    const msg = (err as any)?.error?.message || (err as any)?.message || 'Unbekannter Fehler';
    this.errorMsg.set(msg);
  }

  trackById = (index: number, item: Candidacy) => item.candidacyId ?? index;
}

// DTO für Passwortänderung
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

