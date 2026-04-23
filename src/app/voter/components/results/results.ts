import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResultsService } from '../../../shared/services/results.service';
import { VotingService } from '../../services/voting.service';
import { CandidateMatchingResult } from '../../../shared/models/candidate-matching-result';
import { MatchingRequest } from '../../models/matching-request';
import { QuestionWithAnswerResponse } from '../../../candidate/answer/models/answer';
import { AnswerOption } from '../../../shared/models/answer-option';
import { HttpClient } from '@angular/common/http';
import {TranslocoModule} from '@jsverse/transloco';


// Auswahl FB (Dropdown)
interface FacultyOption {
  id: number | null;
  label: string;
}

// Auswahl Gremium
interface CommitteeOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './results.html',
  styleUrls: ['./results.css']
})
export class ResultsComponent implements OnInit {

  // Filter FB
  facultyId: number | null = null;
  facultyOptions: FacultyOption[] = [
    { id: 1, label: 'Fachbereich 1' },
    { id: 2, label: 'Fachbereich 2' },
    { id: 3, label: 'Fachbereich 3' },
    { id: 4, label: 'Fachbereich 4' },
    { id: 5, label: 'Fachbereich 5' }
  ];

  // Filter gremien
  committees: CommitteeOption[] = [
    { id: 'FSR',   label: 'Fachschaftsrat' },
    { id: 'FBR',   label: 'Fachbereichsrat' },
    { id: 'STUPA', label: 'Studierendenparlament' },
    { id: 'AS',    label: 'Akademischer Senat' },
    { id: 'KUR',   label: 'Kuratorium' }
  ];

  // default
  activeCommitteeId: string = 'FSR';


  candidateLimitOptions: number[] = [3, 5, 10, 15];
  candidateLimit: number = 5;

  // Ergebnisse BE
  results: CandidateMatchingResult[] = [];


  loading = false;
  errorMessage = '';

  // id von Kandidat dessen "über mich" aufgeklappt ist
  expandedAboutId: number | null = null;

  expandedAnswersId: number | null = null;

  // Cache für jeden Kandidaten geladenenen Antworten
  candidateAnswers: { [candidateId: number]: QuestionWithAnswerResponse[] } = {};

  // Id von Kandidat, für den Antworten geladen werden
  loadingAnswersFor: number | null = null;

  constructor(
    private resultsService: ResultsService,
    private votingService: VotingService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // wenn FB + Gremium gewählt --> laden
  }



  onFacultyChange(): void {
    // wenn FB geändert --> neu berechnen für aktives Gremium
    this.loadResultsForActiveCommittee();
  }

  setActiveCommittee(committeeId: string): void {
    this.activeCommitteeId = committeeId;
    this.loadResultsForActiveCommittee();
  }


   // Ermittelt die "echte" committeeId, die ans Backend gesendet wird.
   //  activeCommitteeId = "FSR", facultyId = 3  →  "FSR3"
  private buildEffectiveCommitteeId(): string | null {
    const baseId = this.activeCommitteeId;

    // FB abhängig
    const facultyBased: string[] = ['FSR', 'FBR'];

    if (facultyBased.includes(baseId)) {
      if (!this.facultyId) {
        this.errorMessage = 'Bitte wähle zuerst einen Fachbereich.';
        return null;
      }
      return `${baseId}${this.facultyId}`;
    }

    // nicht FB abhängig
    return baseId;
  }



  // Ergebnisse laden
  private loadResultsForActiveCommittee(): void {
    this.errorMessage = '';

    // Antworten von Wähler aus VotingService (localStorage)
    const answers: MatchingRequest[] = this.votingService.getMatchingRequests();

    if (!answers || answers.length === 0) {
      this.results = [];
      this.errorMessage =
        'Es wurden noch keine Antworten gespeichert. Bitte zuerst die Fragen beantworten.';
      return;
    }

    const committeeId = this.buildEffectiveCommitteeId();
    if (!committeeId) {
      this.results = [];
      return;
    }

    this.loading = true;

    this.resultsService.getResults(committeeId, answers)
      .subscribe({
        next: (data: CandidateMatchingResult[]) => {
          this.results = data;
          this.loading = false;

          // bei Neuladen--> Cache+aufgeklappte Bereiche zurücksetzen
          this.candidateAnswers = {};
          this.expandedAboutId = null;
          this.expandedAnswersId = null;
        },
        error: (err) => {
          console.error('Fehler beim Laden der Ergebnisse:', err);
          this.errorMessage = 'Die Matching-Ergebnisse konnten nicht geladen werden.';
          this.loading = false;
        }
      });
  }



  // Auf-/Zuklappen
  toggleAbout(candidate: CandidateMatchingResult): void {
    this.expandedAboutId =
      this.expandedAboutId === candidate.candidateId ? null : candidate.candidateId;
  }

  toggleAnswers(candidate: CandidateMatchingResult): void {
    const id = candidate.candidateId;

    // wenn bereits geöffnet → zuklappen
    if (this.expandedAnswersId === id) {
      this.expandedAnswersId = null;
      return;
    }

    // jetzt Kandidaten öffnen
    this.expandedAnswersId = id;

    // wenn Antworten noch nicht geladen → via Service holen
    if (!this.candidateAnswers[id]) {
      this.loadingAnswersFor = id;

      this.resultsService.getCandidateAnswers(id)
        .subscribe({
          next: (data: QuestionWithAnswerResponse[]) => {
            this.candidateAnswers[id] = data;
            if (this.loadingAnswersFor === id) {
              this.loadingAnswersFor = null;
            }
          },
          error: (err) => {
            console.error('Fehler beim Laden der Kandidaten-Antworten:', err);
            if (this.loadingAnswersFor === id) {
              this.loadingAnswersFor = null;
            }
          }
        });
    }
  }


  // Helfer
  getCommitteeLabelForUi(id: string): string {
    const found = this.committees.find(c => c.id === id);
    return found ? found.label : id;
  }

  // mappt AnswerOption-Enum auf lesbaren Text
  mapAnswerOption(option: AnswerOption | string | null): string {
    if (option === null || option === undefined) {
      return 'Keine Antwort';
    }

    // 1. Fall: BE schickt String
    if (typeof option === 'string') {
      switch (option) {
        case 'STIMME_VOLL_ZU':
          return 'Stimme voll zu';
        case 'STIMME_ZU':
          return 'Stimme zu';
        case 'NEUTRAL':
          return 'Neutral';
        case 'STIMME_NICHT_ZU':
          return 'Stimme nicht zu';
        case 'STIMME_UEBERHAUPT_NICHT_ZU':
          return 'Stimme überhaupt nicht zu';
        case 'FRAGE_UEBERSPRINGEN':
          return 'Frage übersprungen';
        default:
          return 'Keine Antwort';
      }
    }

    // 2. Fall: numerischer Enum-Wert aus Voter-Antworten
    switch (option as AnswerOption) {
      case AnswerOption.STIMME_VOLL_ZU:
        return 'Stimme voll zu';
      case AnswerOption.STIMME_ZU:
        return 'Stimme zu';
      case AnswerOption.NEUTRAL:
        return 'Neutral';
      case AnswerOption.STIMME_NICHT_ZU:
        return 'Stimme nicht zu';
      case AnswerOption.STIMME_UEBERHAUPT_NICHT_ZU:
        return 'Stimme überhaupt nicht zu';
      case AnswerOption.FRAGE_UEBERSPRINGEN:
        return 'Frage übersprungen';
      default:
        return 'Keine Antwort';
    }
  }


  get visibleResults(): CandidateMatchingResult[] {
    let base = this.results;

    // Nur bei FB-abhängigen Gremien nach facultyId filtern
    const facultyBasedCommittees = ['FSR', 'FBR'];

    if (this.facultyId !== null && facultyBasedCommittees.includes(this.activeCommitteeId)) {
      base = base.filter(candidate => candidate.facultyId === this.facultyId);
    }

    // nur gewünschte Anzahl anzeigen
    return base.slice(0, this.candidateLimit);
  }



  printResults(): void {
    window.print();
  }

  downloadResult(): void {
    if (this.visibleResults.length === 0) {
      alert('Es gibt noch kein Ergebnis zum Herunterladen.');
      return;
    }

    const facultyLabel = this.getFacultyLabel();
    const committeeLabel = this.getCommitteeLabelForUi(this.activeCommitteeId);

    const voterExportData = {
      facultyLabel,
      committeeLabel,
      generatedAt: new Date().toLocaleString('de-DE'),
      candidates: this.visibleResults.map(c => ({
        firstName: c.firstname,
        lastName: c.lastname,
        listNumber: c.listNumber,
        listName: c.listName,
        aboutMe: c.aboutMe,
        matchingPercentage: Math.round(c.matchingPercentage)
      }))
    };

    const json = encodeURIComponent(JSON.stringify(voterExportData));

    // lokal:
    const backendBaseUrl = 'http://localhost:8080';
    // per environment wenn deployed
    const url = `${backendBaseUrl}/export/result?data=${json}`;

    this.http.post(
      `${backendBaseUrl}/export/result`,
      voterExportData,
      { responseType: 'text' }      // erwarten HTML als String
    ).subscribe({
      next: (html: string) => {
        // neues Fenster öffnen + HTML reinschreiben
        const popup = window.open('', '_blank');
        if (popup) {
          popup.document.open();
          popup.document.write(html);
          popup.document.close();
        } else {
          console.error('Popup konnte nicht geöffnet werden');
          alert('Das Ergebnis konnte nicht in einem neuen Fenster geöffnet werden.');
        }
      },
      error: (err) => {
        console.error('Fehler beim Generieren des Exports', err);
        alert('Das Ergebnis konnte nicht exportiert werden.');
      }
    });
  }

  getFacultyLabel(): string {
    if (this.facultyId === null) {
      // falls jemand ohne Auswahl exportiert
      return 'Kein Fachbereich ausgewählt';
    }
    const found = this.facultyOptions.find(f => f.id === this.facultyId);
    return found ? found.label : `Fachbereich ${this.facultyId}`;
  }

  selectFaculty(event: Event, id: number | null): void {
    event.preventDefault();
    this.facultyId = id;
    this.onFacultyChange();
  }


}
