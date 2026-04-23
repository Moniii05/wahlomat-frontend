import {Component, inject, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf} from '@angular/common';
import {candidateManagementService} from "../../shared/services/candidateManagement.service";
import {RegisteredCandidateResponse} from '../../shared/interfaces/RegisteredCandidateResponse';

import { CandidateProfile } from '../../shared/interfaces/candidate-profile';
import { Candidacy, CandidacyCreate } from '../../shared/interfaces/candidacy';

import { Committee } from '../../shared/interfaces/committee';
import { CandidacyList } from '../../shared/interfaces/candidacyList'; 
import { InviteCandidateResponse } from '../../shared/interfaces/InviteCandidateResponse';
import {TranslocoModule} from '@jsverse/transloco';

@Component({
  selector: 'app-candidates-management',
  imports: [
    FormsModule,
    NgForOf,
    NgIf,
    TranslocoModule
  ],
  templateUrl: './candidates-management.html',
  styleUrl: './candidates-management.component.css'
})
export class CandidatesManagementComponent implements OnInit {
  email: string = "";
                        

  bulkInfoMessage: string = "";       
  bulkErrorMessage: string = "";      
  bulkSent:    {email:string; status:'SENT';    reason?: string}[] = [];  
  bulkSkipped: {email:string; status:'SKIPPED'; reason?: string}[] = [];  
  bulkFailed:  {email:string; status:'FAILED';  reason?: string}[] = [];  
  bulkMaxPerBatch = 500;              
  bulkSending = false; 
  bulkSuccessCount = 0;
  bulkFailedCount = 0;
  bulkFailedEmails: string[] = [];
                          
  searchTerm: string = ""; // searchbar

  inviteErrorMessage: string = "";
  inviteSuccessMessage: string = "";

  profileErrorMessage: string = "";
  profileSuccessMessage: string = "";
  
  candidacyErrorMessage: string = "";
  candidacySuccessMessage: string = "";

  listErrorMessage: string = "";
  listSuccessMessage: string = "";

  showInvites: boolean = true;
  invitedCandidates: InviteCandidateResponse[] = [];
  inviteListErrorMessage: string = "";


  showList: boolean = true; //Toggle für die Liste
  registeredCandidatesList: RegisteredCandidateResponse[] = []; //für die Liste aller registrierten Kandidaten aus dem Backend
  thisCandidateDelete: any = null; //zum Speichern der zu löschenden Person

  committees: Committee[] = [];
  allLists: CandidacyList[] = [];
  listsForNewCandidacy: CandidacyList[] = []; // list gefiltert je nach gremium

  regExp: RegExp = /^([^\s@]+@student\.htw-berlin\.de|s0[1-9]{6}@htw-berlin\.de)$/i; //RegExp test, ob es eine HTW Mail
  private candidateManagementService = inject(candidateManagementService); //Injektion von candidateManagementService für Backend Aufrufe

  // trimmt, lowercasen, Duplikate entfernen
  private parseBulk(text: string): string[] {
    if (!text) return [];
    const tokens = text.split(/[\s,;]+/g).map(s => s.trim()).filter(Boolean);
    const lower = tokens.map(e => e.toLowerCase());
    return Array.from(new Set(lower));
  }

  // validierung druch bestehende regExp
  private partitionValidInvalid(emails: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const e of emails) {
      if (this.regExp.test(e)) valid.push(e); else invalid.push(e);
    }
    return { valid, invalid };
  }

    // SEARCHBAR
    // gefilterte Kandidatenliste für UI 
    get filteredRegisteredCandidates(): RegisteredCandidateResponse[] {
      // wenn kein Suchbegriff --> komplette Liste 
      if (!this.searchTerm || !this.searchTerm.trim()) {
        return this.registeredCandidatesList;
      }
  
      const term = this.searchTerm.trim().toLowerCase();
  
      return this.registeredCandidatesList.filter(candidate => {
        const first = (candidate.firstname || "").toLowerCase();
        const last = (candidate.lastname || "").toLowerCase();
        const email = (candidate.email || "").toLowerCase();
        const fullName = (first + " " + last).trim();
  
        return (
          first.includes(term) ||
          last.includes(term) ||
          fullName.includes(term) ||
          email.includes(term)
        );
      });
    }

    loadInvites(): void {
      this.inviteListErrorMessage = "";
    
      this.candidateManagementService.listInvites().subscribe({
        next: invites => {
          this.invitedCandidates = (invites || []).sort((a, b) =>
            (a.email || '').localeCompare((b.email || ''), undefined, { sensitivity: 'base' })
          );
        },
        error: err => {
          console.error("Invites konnten nicht geladen werden", err);
          this.inviteListErrorMessage = "Einladungen konnten nicht geladen werden.";
          this.invitedCandidates = [];
        }
      });
    }
    
    toggleInvites(): void {
      this.showInvites = !this.showInvites;
    }
    
  

  // US KANDIDATENVERWALTUNG
  selectedCandidate: RegisteredCandidateResponse | null = null; // aktuell ausgewählter kandidat aus liste
  profileForm: CandidateProfile | null = null;  // bearbeitbare kopie von Kandidatenprofil
  candidacies: Candidacy[] = [];  // Kandidaturen des ausgewählten kandidaten
  isEditingProfile: boolean = false; // toggle: profileFelder schreibbar/readonly 

  // formularmodell für neue Kandidatur (Request-DTO -> CandidacyCreate)
  newCandidacy: CandidacyCreate = {
    committeeId: '',
    listId: 0
  };


//Toggle Logik für die Liste
toggleList(): void {
  this.showList = !this.showList;
}


  //löst bei Initialisierung das Laden der Liste aller registrierten Kandidaten aus
  ngOnInit() {
    this.loadRegisteredList();
    this.loadCommittees();
    this.loadAllLists();
    this.loadInvites();
  }

  //lädt Liste registrierter Kandidaten aus BE
  loadRegisteredList(): void {
    this.resetListMessages(); 
  
    this.candidateManagementService.listRegistered().subscribe({
      next: response => {
        this.registeredCandidatesList = response;
       // this.listErrorMessage = ""; 
      },
  
      error: err => {
        console.log("registrierte Kandidaten Liste konnte nicht geladen werden!", err);
        this.listErrorMessage = "Liste der registrierten Kandidaten konnte nicht geladen werden";
        this.registeredCandidatesList = []; // liste leeren, wenn Fehler
      }
    });
  }

  private loadCommittees(): void {
    this.candidateManagementService.getCommittees().subscribe({
      next: committees => {
        this.committees = committees;
        // falls vorher ein Fehlertext da war, löschen
        if (this.candidacyErrorMessage === 'Gremien konnten nicht geladen werden.') {
          this.candidacyErrorMessage = '';
        }
      },
      error: err => {
        console.error('Gremien konnten nicht geladen werden', err);
        this.candidacyErrorMessage = 'Gremien konnten nicht geladen werden.';
      }
    });
  }

  // Anzeigenamen für UI gremien
  getCommitteeLabelForUi(c: Committee): string {
    const id = c.committeeId;
  
    // FSR1, FSR2, ...
    if (id.startsWith('FSR')) {
      return 'Fachschaftsrat';
    }
  
    // FBR1, FBR2, ...
    if (id.startsWith('FBR')) {
      return 'Fachbereichsrat';
    }
  
    // gremien (ohne FB)
    switch (id) {
      case 'AS':
        return 'Akademischer Senat';
      case 'STUPA':
        return 'Studierendenparlament';
      case 'KUR':
        return 'Kuratorium';
      default:
        return c.committeeName || id;
    }
  }

  // nur gremien anzeigen passend zum FB 
  get committeesForSelectedCandidate(): Committee[] {
    if (!this.profileForm?.facultyId) {
      return this.committees;
    }
    const facultyId = this.profileForm.facultyId;
  
    return this.committees.filter(c =>
      c.FACULTY === null || c.FACULTY === facultyId
    );
  }
  



 
  private loadAllLists(): void {
    this.candidateManagementService.getAllLists().subscribe({
      next: lists => {
        this.allLists = lists;
        if (this.candidacyErrorMessage === 'Listen konnten nicht geladen werden.') {
          this.candidacyErrorMessage = '';
        }
      },
      error: err => {
        console.error('Listen konnten nicht geladen werden', err);
        this.candidacyErrorMessage = 'Listen konnten nicht geladen werden.';
      }
    });
  }

   

   // wenn gremium ausgewählt --> listen für genau dieses gremium filtern
   onNewCommitteeChange(): void {
    this.newCandidacy.listId = 0;
    this.listsForNewCandidacy = [];

    if (!this.newCandidacy.committeeId) {
      return;
    }

    this.listsForNewCandidacy = this.allLists.filter(
      list => list.committeeId === this.newCandidacy.committeeId
    );
  }




  //neue Email wird hinzugefügt
  newCandidate(): void {

    this.resetInviteMessages();
    this.resetBulkAll();

    if (!this.email || !this.email.trim()) return;

    const parsed = this.parseBulk(this.email);

    // bulk mails
    // bulk mails
if (parsed.length > 1) {
  const { valid, invalid } = this.partitionValidInvalid(parsed);

  // 1) Nur-ungültig: NICHT zum Server, nur rote Box mit *allen* invalid
  if (valid.length === 0) {
    this.bulkFailed = invalid.map(e => ({
      email: e,
      status: 'FAILED' as const,
      reason: 'invalid_format'
    }));
    this.bulkFailedCount  = this.bulkFailed.length;
    this.bulkFailedEmails = this.bulkFailed.map(x => x.email);
    this.bulkErrorMessage = "";          // keine zweite, redundante rote Box
    this.bulkSuccessCount = 0;           // sicherheitshalber
    this.email = "";
    return;
  }

  // 2) zu viele gültige
  if (valid.length > this.bulkMaxPerBatch) {
    this.bulkErrorMessage = `Maximal ${this.bulkMaxPerBatch} E-Mails pro Batch. Erkannt: ${valid.length}`;
    this.email = "";
    return;
  }

  // 3) Mix-Fall: erst valid zum Server, dann invalid lokal anhängen
  this.bulkSending = true;
  this.candidateManagementService.bulkInvite(valid).subscribe({
    next: (res) => {
      this.bulkSent    = res.sent    ?? [];
      this.bulkSkipped = res.skipped ?? [];

      const serverFailed  = res.failed ?? [];
      const clientInvalid = invalid.map(e => ({
        email: e,
        status: 'FAILED' as const,
        reason: 'invalid_format'
      }));

      // WICHTIG: Merge in *einem* Array ...
      this.bulkFailed = [...serverFailed, ...clientInvalid];

      // ... und daraus Zähler + Liste generieren
      this.bulkSuccessCount = this.bulkSent.length;
      this.bulkFailedCount  = this.bulkFailed.length;
      this.bulkFailedEmails = this.bulkFailed.map(x => x.email);

      this.email = "";
      this.loadRegisteredList();
      this.loadInvites();
    },
    error: () => {
      this.bulkErrorMessage = "Bulk Invite ist fehlgeschlagen.";
      this.email = "";
    },
    complete: () => { this.bulkSending = false; }
  });

  return;
}


    // einzel mail
    const single = parsed[0] ?? "";
    if (!this.regExp.test(single)) {
      this.inviteErrorMessage = "Das ist keine valide HTW Mail!";
      this.email = "";
      return;
    }

    this.candidateManagementService.invite(single).subscribe({
      next: (r) => {
        this.inviteSuccessMessage = `Erfolgreich ${r.email} eingeladen.`;
        this.email = "";
        this.loadRegisteredList();
        this.loadInvites();
      },
      error: () => {
        this.inviteErrorMessage = `Einladung ${single} ist fehlgeschlagen!`;
        this.email = "";
      }
    });
  }
  
    


  // nur Fehlgeschlagene erneut senden
  retryBulkFailed(): void {                                       
    if (!this.bulkFailed.length) return;
    const emails = this.bulkFailed.map(x => x.email);

    this.bulkSending = true;
    this.candidateManagementService.bulkInvite(emails).subscribe({
      next: (res) => {
        this.bulkSent    = [...this.bulkSent, ...(res.sent || [])];
        this.bulkSkipped = [...this.bulkSkipped, ...(res.skipped || [])];
        this.bulkFailed  = res.failed || [];

        this.bulkSuccessCount = this.bulkSent.length;
        this.bulkFailedCount  = this.bulkFailed.length;
        this.bulkFailedEmails = this.bulkFailed.map(x => x.email);

        this.loadInvites();
       this.loadRegisteredList();
      },
      error: (err) => {
        console.error("Retry fehlgeschlagen", err);
        this.bulkErrorMessage = "Retry fehlgeschlagen.";
      },
      complete: () => { this.bulkSending = false; }
    });
  }




  // Kandidat löschen
  deleteThisCandidate(candidate: RegisteredCandidateResponse) {
    this.resetInviteMessages();


    this.candidateManagementService.deleteCandidate(candidate.userId).subscribe({
      next: () => {
        this.loadRegisteredList(); //neuen Stand der Liste vom BE holen
        this.listSuccessMessage = `Kandidat:in ${candidate.email} wurde erfolgreich gelöscht.`;
      },
      error: err => {
        console.error("Kandidat:in deleteThisCandidate", err);
        this.listErrorMessage = `Löschen von ${candidate.email} ist fehlgeschlagen!`;
      }
    })
  }

  deleteAllCandidates() {
    this.resetInviteMessages();
    this.candidateManagementService.deleteAll().subscribe({
      next: () => {
        this.loadRegisteredList(); //neuen Stand der Liste vom BE holen
        this.listSuccessMessage = "Alle Kandidat:innen wurden gelöscht.";
      },
      error: err => {
        console.error("deleteAllCandidates ist fehlgeschlagen!", err);
        this.listErrorMessage = "Das Löschen aller Kandidat:innen ist fehlgeschlagen!";
      }


      }
    )
  }


  //Modal vor dem Löschen einer Person
  //die open-Methode speichert zu löschende Person
  openDeleteThisCandidate(candidate: any) {
    this.thisCandidateDelete = candidate;
  }
  confirmDeleteThisCandidate(){
    //Aufruf der Methode zum Löschen der gespeicherten Person
    this.deleteThisCandidate(this.thisCandidateDelete);
  }

 





  // US KANDIDATENVERWALTUNG
   // Hilfsfunktionen für Meldungen

   private resetInviteMessages(): void {
    this.inviteErrorMessage = "";
    this.inviteSuccessMessage = "";
  }

  private resetProfileMessages(): void {
    this.profileErrorMessage = "";
    this.profileSuccessMessage = "";
  }

  private resetCandidacyMessages(): void {
    this.candidacyErrorMessage = "";
    this.candidacySuccessMessage = "";
  }

  private resetListMessages(): void {
    this.listErrorMessage = "";
    this.listSuccessMessage = "";
  }
  

  private resetAllMessages(): void {
    this.resetInviteMessages();
    this.resetProfileMessages();
    this.resetCandidacyMessages();
    this.resetListMessages();
  }



   private resetBulkAll(): void {
    this.bulkInfoMessage = "";
    this.bulkErrorMessage = "";
    this.bulkSent = [];
    this.bulkSkipped = [];
    this.bulkFailed = [];
    this.bulkSuccessCount = 0;
    this.bulkFailedCount = 0;
    this.bulkFailedEmails = [];
    this.bulkSending = false;
}



  selectCandidate(candidate: RegisteredCandidateResponse): void {
    this.selectedCandidate = candidate;
    this.isEditingProfile = false; // start: nur lesen
    this.profileForm = null;
    this.candidacies = [];
    this.resetAllMessages();

    this.loadProfile(candidate.userId);
    this.loadCandidacies(candidate.userId);
  }

  
  // profil eines users laden GET 
  private loadProfile(userId: number): void {
    this.candidateManagementService.getCandidateProfile(userId).subscribe({
      next: profile => {
        // Kopie in profileForm legen 
        this.profileForm = {
          firstname: profile.firstname,
          lastname: profile.lastname,
          facultyId: profile.facultyId,
          aboutMe: profile.aboutMe
        };
      },
      error: err => {
        console.error("Profil konnte nicht geladen werden", err);
        this.profileErrorMessage = "Profil konnte nicht geladen werden.";
      }
    });
  }

  
  // Kandidaturen laden GET 
  private loadCandidacies(userId: number): void {
    this.candidateManagementService.listCandidaciesByUser(userId).subscribe({
      next: candidacies => {
        this.candidacies = candidacies;
      },
      error: err => {
        console.error("Kandidaturen konnten nicht geladen werden", err);
        this.candidacyErrorMessage = "Kandidaturen konnten nicht geladen werden.";
      }
    });
  }

  
   // Bearbeiten-Modus für Profil einschalten:
   // --> Felder im Template werden editierbar
  startEditProfile(): void {
    if (!this.selectedCandidate || !this.profileForm) return;
    this.isEditingProfile = true;
    this.resetProfileMessages();
  }

  
  // Bearbeiten-Modus abbrechen:
  // Profil neu von BE laden (damit alle Änderungen verworfen werden)
  cancelEditProfile(): void {
    if (!this.selectedCandidate) return;
    this.isEditingProfile = false;
    this.resetProfileMessages();
    this.loadProfile(this.selectedCandidate.userId);
  }

  
  // Profiländerungen speichern PUT
  saveProfileChanges(): void {
    if (!this.selectedCandidate || !this.profileForm) return;

    this.resetProfileMessages();

    this.candidateManagementService
      .updateCandidateProfile(this.selectedCandidate.userId, this.profileForm)
      .subscribe({
        next: () => {
          this.isEditingProfile = false;
          this.profileSuccessMessage = "Profil wurde erfolgreich gespeichert.";
          this.loadCandidacies(this.selectedCandidate!.userId);
          this.resetNewCandidacy();
          this.listsForNewCandidacy = [];
          this.loadRegisteredList();
        },
        error: err => {
          console.error("Profil konnte nicht gespeichert werden", err);
          this.profileErrorMessage = "Profil konnte nicht gespeichert werden.";
        }
      });
  }


  //  KANDIDATUREN bearbeiten

  // Vorlage für neue Kandidatur zurücksetzen
  resetNewCandidacy(): void {
    this.newCandidacy = {
      committeeId: '',
      listId: 0
    };
  }

  
  //neue Kandidatur anlegen POST
  addCandidacy(): void {
    if (!this.selectedCandidate) return;
    this.resetCandidacyMessages();

    // Validierung im FE:
    if (!this.newCandidacy.committeeId || !this.newCandidacy.listId) {
      this.candidacyErrorMessage = "Bitte Gremium (committeeId) und Liste (listId) ausfüllen.";
      return;
    }

    this.candidateManagementService
      .createCandidacy(this.selectedCandidate.userId, this.newCandidacy)
      .subscribe({
        next: created => {
          this.candidacySuccessMessage = "Kandidatur wurde angelegt.";
          this.resetNewCandidacy();
          this.loadCandidacies(this.selectedCandidate!.userId);
        },
        error: err => {
          console.error("Kandidatur konnte nicht angelegt werden", err);
          this.candidacyErrorMessage = "Kandidatur konnte nicht angelegt werden.";
        }
      });
  }

  
  // Kandidatur löschen DELETE 
  deleteCandidacyFromUser(c: Candidacy): void {
    if (!c.candidacyId) return;
    if (!this.selectedCandidate) return;

    this.resetCandidacyMessages();

    this.candidateManagementService.deleteCandidacy(c.candidacyId).subscribe({
      next: () => {
        this.candidacySuccessMessage = "Kandidatur wurde gelöscht.";
        this.loadCandidacies(this.selectedCandidate!.userId);
      },
      error: err => {
        console.error("Kandidatur konnte nicht gelöscht werden", err);
        this.candidacyErrorMessage = "Kandidatur konnte nicht gelöscht werden.";
      }
    });
  }

  // --------------------------------
  // gremium anhand ID schön anzeigen
getCommitteeLabelById(committeeId: string | null | undefined): string {
  if (!committeeId) {
    return '';
  }
  const c = this.committees.find(com => com.committeeId === committeeId);
  // wenn gremium gefunden, nutze bestehende Logik:
  return c ? this.getCommitteeLabelForUi(c) : committeeId;
}

// Liste anhand listId schön anzeigen
getListLabelById(listId: number | null | undefined): string {
  if (!listId) {
    return '';
  }

  const l = this.allLists.find(list => list.listId === listId);
  if (!l) {
    // Fallback: wenn nichts gefunden --> ID anzeigen
    return listId.toString();
  }
  return l.listName ? `${l.listName} (${l.number})` : `${l.number}`;
}

}
