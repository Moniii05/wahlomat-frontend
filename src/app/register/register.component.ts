
import {Component, OnInit, inject, signal} from '@angular/core';
import { NgClass, NgForOf, NgIf} from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl, AbstractControl, ValidationErrors, ValidatorFn, AbstractControlOptions } from '@angular/forms';
import { FormsModule } from '@angular/forms';

// Services
import { StaticDataService } from '../shared/services/static-data.service';
import { CandidacyListService } from '../shared/services/candidacyList.service';
import { AuthService } from '../shared/services/auth.service';

// Models
import { Candidacy } from '../shared/interfaces/candidacy';
import { Faculty } from '../shared/interfaces/faculty';
import { Committee } from '../shared/interfaces/committee';
import { CandidacyList } from '../shared/interfaces/candidacyList';
import {Router} from '@angular/router';
import {TranslocoModule} from '@jsverse/transloco';

@Component({
  selector: 'app-register',
  imports: [
    NgForOf,
    NgIf,
    ReactiveFormsModule,
    FormsModule,
    NgClass,
    TranslocoModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit{

  // FormBuilder + Services injecten
  private fb = inject(FormBuilder);
  private staticDataService = inject(StaticDataService);
  private listApi = inject(CandidacyListService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // UI-Statusvariablen
  showSuccessPopup = false;
  successMsg = "Deine Registrierung war erfolgreich! Weiterleitung an Login erfolgt automatisch.";
  failureMsg = "Das tut uns leid, deine Registrierung ist leider fehlgeschlagen :( Bitte versuche es erneut.";
  showFailurePopup = false;
   //RegExp test, ob es eine HTW Mail;
   emailPattern : RegExp = /^([^\s@]+@student\.htw-berlin\.de|s0[1-9]{6}@htw-berlin\.de)$/i;

  //Signals
  infoMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);
  candidaciesSignal = signal<Candidacy[]>([]);


  // FormGroup Definition, inkl. geschachteltem FormGroup für candidacies
  profileForm = this.fb.group({
    firstname: ['', Validators.required],
    lastname: ['', Validators.required],
    facultyName: [null, Validators.required],
    aboutMe: ['', Validators.maxLength(500)],
    password: ['', [Validators.required, Validators.minLength(6)]],
    password_bestaetigen: ['', Validators.required],
    email: ['', [Validators.required, this.htwEmailValidator()]], // Individuelle Email Validierung
    candidacies: this.fb.group({
      committee: ['', ],
      list: [0, ]
    })
  }, {
    validators: [this.mustMatch('password', 'password_bestaetigen'), this.candidaciesNotEmpty()]
  });


  // Zugriff auf die geschachtelten FormControlNames über Getter
  get committeeControl(): FormControl {
    return this.profileForm.get(['candidacies', 'committee']) as FormControl;
  }

  get listControl(): FormControl {
    return this.profileForm.get(['candidacies', 'list']) as FormControl;
  }

  // Datenarrays
  faculties: Faculty[] = [];
  committees: Committee[] = [];
  lists: CandidacyList[] = [];
  filteredList: CandidacyList[] = []; // Gremiengefilterte Listen
  availableCommittees: Committee[] = []; // Verfügbare Gremien für neue Kandidatur (ohne die bereits in candidacies genutzten)



  ngOnInit() {
    this.loadFaculties();
    this.loadLists();

    // Beobachten der Änderungen an der Fakultätsauswahl
    this.profileForm.get('facultyName')?.valueChanges.subscribe(() => this.updateCommittees());

    // Beobachten der Änderungen an der Committee-Auswahl, hier muss auf geschachtelte FormControl zugegriffen werden
    this.committeeControl.valueChanges.subscribe(committeeId => this.onCommitteeChange(committeeId));
  }

  // Methoden zum Laden der Daten aus dem Backend. console.log zur Kontrolle, diese müssen in subscribe Block um die asynchronen API Aufruf zu berücksichtigen

  private loadFaculties() {
    this.staticDataService.getFaculties().subscribe(faculties => {
      this.faculties = faculties;
      console.log ("faculties: ", this.faculties);
    });
  }

  private loadLists() {
    this.listApi.getLists().subscribe(lists => {
      this.lists = lists;
      console.log ("lists" , this.lists);
    });
  }

  private loadCommittees(facultyId: number) {
    this.staticDataService.getCommittees().subscribe(committees => {
      this.committees = committees.filter(c => c.FACULTY === facultyId || c.FACULTY === null);
      //console.log ("After Filtering according to FacultyId:", this.committees);
      this.updateAvailableCommittees();
    });
  }


// filtert die Gremien basierend auf der ausgewählten Fakultät(dynamisch durch Observable)
  private updateCommittees() {
    const facultyId = this.toNumberId(this.profileForm.get('facultyName')?.value);
    if (facultyId !== null) {
      this.loadCommittees(facultyId);
      this.removeCandidaciesOnFacultyChange();
    } else {
      this.committees = [];
      this.updateAvailableCommittees();
    }
  }


  // filtert die Listen basierend auf dem ausgewählten Committee(dynamisch durch Observable)
  // evtl in updateLists umbenennen um einheitlicher zu sein
  private onCommitteeChange(committeeId: string | null) {

    //console.log('Methode onCommitteeChange aufgerufen mit committeeId:', committeeId);
    if (committeeId) {
      this.filteredList = this.lists.filter(list => list.committeeId === committeeId);
      //console.log("lists filtered by committee: ", this.filteredList);
    } else {
      this.filteredList = [];
    }
  }

  // Methoden zum Verwalten der Kandidaturen


  // Fügt eine neue noch nicht gespeicherte Kandidatur visuell zur Liste hinzu candidacy als Signal
  public stageCandidacy() {
    const committeeId = this.committeeControl.value;
    const listId = this.listControl.value;

    if (listId !== null && this.canStage() && this.filteredList.some(l => l.listId === listId)) {
      const staged: Candidacy = { candidacyId: null, committeeId, listId };
      if (!this.candidaciesSignal().some(c => c.committeeId === committeeId)) {
        this.candidaciesSignal.update(arr => [...arr, staged]);
        this.clearNewSelection();
        this.updateAvailableCommittees();
      } else {
        this.errorMsg.set('Dieses Gremium ist bereits in einer Kandidatur.');
      }
    } else {
      this.errorMsg.set('Ungültige Liste für dieses Gremium.');
    }
  }

  // Aktieviert + Button wenn Felder committe und list befüllt sind(candidacies != null), Aufruf über Getter nötig(geschachtelte FormGroup)
  canStage(): boolean {
    const committeeValue = this.committeeControl.value;
    const listValue = this.listControl.value;
    return !!committeeValue && !!listValue && this.candidaciesSignal !== null;
  }

  // Entfernt eine Kandidatur visuell mit candidacies signal.
  public removeCandidacy(candidacy: Candidacy) {
    this.candidaciesSignal.update(arr => arr.filter(c => c !== candidacy));
    this.updateAvailableCommittees();
  }

  //Mehtode zum Entfernen von faculty spezifischen candidacies, falls faculty im Dropdown geändert wird
  private removeCandidaciesOnFacultyChange(){
    this.candidaciesSignal.update(arr =>
      arr.filter(c => !(c.committeeId.includes('FBR') || c.committeeId.includes('FSR'))));
    this.updateAvailableCommittees();
  }

  // Berechnet Gremien, die noch nicht in candidacies() enthalten sind mit candidacies als Signal
  private updateAvailableCommittees() {
    const usedCommitteeIds = new Set(this.candidaciesSignal().map((c: Candidacy) => c.committeeId));
    this.availableCommittees = this.committees.filter(c => !usedCommitteeIds.has(c.committeeId));
  }

  // Dropdown-Auswahl zurücksetzen
  private clearNewSelection() {
    this.committeeControl.setValue(null);
    this.listControl.setValue(null);
    this.filteredList = [];
  }


  //Helper Methoden zur Anzeige von Kandidaturen

  trackById(index: number, item: Candidacy): number | null {
    return item.candidacyId ?? index;
  }

  committeeName(committeeId: string): string {
    const committee = this.committees.find(c => c.committeeId === committeeId);
    return committee ? committee.committeeName : 'Unbekanntes Gremium';
  }

  listName(listId: number): string {
    const list = this.lists.find(l => l.listId === listId);
    //return list ? list.listName : 'Unbekannte Liste';
    if (!list) return `#${listId}`;
    return this.formatListName(list);
  }

  // Formatiert Listenname: "Liste {number}" oder "Liste {number}: {name}"
  formatListName(list: CandidacyList): string {
    if (!list.listName || list.listName.trim() === '') {
      return `Liste ${list.number}`;
    }
    return `Liste ${list.number}: ${list.listName}`;
  }

  private toNumberId(value: string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const numberValue = Number(value);
    return isNaN(numberValue) ? null : numberValue;
  }

// Validierungsmethoden


//Methode zur Validation der Passwortbestätigung
  private mustMatch(controlName: string, matchingControlName: string): ValidatorFn {
    return (formGroup): ValidationErrors | null => {
      const control = formGroup.get(controlName);
      const matchingControl = formGroup.get(matchingControlName);

      if (!control || !matchingControl) {
        return null;
      }

      if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
        return null;
      }

      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ mustMatch: true });
      } else {
        matchingControl.setErrors(null);
      }

      return null;
    };
  }

  // Methode, um zu überprüfen, dass mind. eine Kandidatur vorhanden ist
  candidaciesNotEmpty(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      // Prüfen, ob candidacies als Funktion benutzbar ist
      try {
        const candidaciesValue = this.candidaciesSignal(); // Greife auf das Signal als Funktion zu

        // Prüfe, ob das Signal nicht leer ist
        if (candidaciesValue.length === 0) {
          return { candidaciesEmpty: true };  // Rückgabe eines Fehlerobjekts
        }
      } catch (error) {
        console.error("Fehler beim Zugriff auf das Signal:", error);
        return { candidaciesError: 'Signalerror' };
      }

      return null;  // Für einen gültigen Zustand des Validators
    };
  }

  // Methode, die testet, ob das gängige HTW Mail Format eingehalten wurde
  htwEmailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Kein Wert vorhanden, keine Validierung anwendbar
      }

      const valid = this.emailPattern.test(control.value);
      return valid ? null : { htwEmail: true }; // Liefert 'null', wenn Validierung besteht oder sonst einen Validierungsfehler Errorcode 'htwEmail'
    };
  }

  //Methode zur Übergabe der Infos an das AuthService zur Registrierung
  //Registrieren Button wird erst enabled, wenn alle Pflichtfelder befüllt sind und mustMatch (password) geprüft hat

  public register() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
    } else {
      const profileFormData= this.profileForm.value
      console.log (profileFormData)

      const {password_bestaetigen, candidacies, ...registrationData } = this.profileForm.value;
      console.log(registrationData)

      const candidaciesArray = this.candidaciesSignal();
      console.log("Candidacies Array vor dem Aufruf des AuthService: ", candidaciesArray);

      this.authService.registerCandidate(
        registrationData.firstname!,
        registrationData.lastname!,
        registrationData.facultyName!,
        registrationData.aboutMe!,
        registrationData.password!,
        registrationData.email!,
        candidaciesArray
      ).subscribe({
        next: response => {
          console.log('Registrierung erfolgreich!', response);
        this.profileForm.reset();
        this.candidaciesSignal.set([]);

          // Erfolgsnachricht setzen
          this.showSuccessPopup = true;

          // Optional: Erfolgsnachricht zurücksetzen nach 3 Sekunden
          setTimeout(() => {
            this.showSuccessPopup = false;
            this.errorMsg.set(null);
            this.infoMsg.set(null);
            this.router.navigate(['/login']);
          }, 3000);
          },
        error: err => {
          console.error('Registrierung fehlgeschlagen', err);
          this.profileForm.reset();
          // Misserfolgsnachricht setzen
          this.showFailurePopup= true;

          // Optional: Erfolgsnachricht zurücksetzen nach 3 Sekunden
          setTimeout(() => {
            this.showFailurePopup = false;
            this.errorMsg.set(null);
            this.infoMsg.set(null);

          }, 3000);

        }
      });
    }
  }
//um Erfolgsnachricht zu schließen
  closePopup(): void {
    this.showSuccessPopup = false;
  }

  //um Misserfolgsnachricht zu schließen
  closeFailurePopup(): void{
    this.showFailurePopup = false;
  }

}

