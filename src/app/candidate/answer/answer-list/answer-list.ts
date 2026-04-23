import { QuestionWithAnswerResponse, CandidateAnswerRequest} from '../models/answer';
import { AnswerOption } from '../../../shared/models/answer-option';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AnswerService } from '../services/answer.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import {TranslocoModule} from '@jsverse/transloco';

@Component({
  selector: 'app-answer-list',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    TranslocoModule],
  templateUrl: './answer-list.html',
  styleUrl: './answer-list.css'
})

export class AnswerList implements OnInit{
  questions: QuestionWithAnswerResponse[] = [];
  answerOptions: AnswerOption[] = [
    AnswerOption.STIMME_VOLL_ZU,  //4
    AnswerOption.STIMME_ZU,    //3
    AnswerOption.NEUTRAL,      //2
    AnswerOption.STIMME_NICHT_ZU, //1
    AnswerOption.STIMME_UEBERHAUPT_NICHT_ZU //0
  ]

  selectedAnswers = new Map<number, AnswerOption>();
  isLoading: boolean = false;
  saveMessage: string = '';


  constructor(
    private answerService: AnswerService,
    private authService: AuthService,
    private router: Router

  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadQuestions();  // Service holt userId selbst
  }


  /**
   * Lädt alle Fragen mit bereits gespeicherten Antworten vom Backend
   */
  loadQuestions(): void {
    this.isLoading = true;

    this.answerService.getQuestionsWithAnswers().subscribe({
      next: (data: QuestionWithAnswerResponse[]) => {
        this.questions = data;

       // Bereits beantwortete Fragen in Map speichern
       data.forEach(q => {
       if (q.selectedOption !== null && q.selectedOption !== undefined) {
        const normalized = this.normalizeToAnswerOption(q.selectedOption);
        this.selectedAnswers.set(q.questionId, normalized);
        }
       });

        this.isLoading = false;
        console.log('Questions loaded:', data);
      },
      error: (error) => {
        console.error('Error loading questions:', error);
        this.isLoading = false;

        if(error.status === 401 || error.status === 403) {
          this.router.navigate(['/login']);
        } else {
          this.saveMessage = 'Fehler beim Laden der Fragen';
        }
      }
    });
  }


  /**
   * Wird aufgerufen, wenn User eine Antwort auswählt/abwählt
   * Speichert sofort (Auto-Save)
   */
  onAnswerChange(questionId: number, option: AnswerOption): void {
    const current = this.selectedAnswers.get(questionId);

    // Toggle-Logik: Gleiche Option nochmal → Abwählen
    if (current === option) {
      this.selectedAnswers.delete(questionId);
      console.log('Antwort abgewählt:', questionId);

      this.deleteAnswerFromBackend(questionId);
    } else {
      // Neue Option auswählen
      this.selectedAnswers.set(questionId, option);
      console.log('Antwort geändert:', { questionId, selectedOption: option });

      // Sofort speichern (Auto-Save)
      this.saveAnswerImmediately(questionId, option);
    }
  }

  /**
   * Speichert eine einzelne Antwort sofort (Auto-Save)
   */
  private saveAnswerImmediately(questionId: number, selectedOption: AnswerOption): void {

    const request: CandidateAnswerRequest = {
      selectedOption: selectedOption
    };

    this.answerService.upsertAnswer(questionId, request).subscribe({
      next: (response) => {
        console.log('Answer auto-saved:', response);

        const question = this.questions.find(q => q.questionId === questionId);
        if(question) {
          question.candidateAnswerId = response.candidateAnswerId;
          question.selectedOption = response.selectedOption;
        }
      },
      error: (error) => {
        console.error('Error auto-saving:', error);
        this.saveMessage = 'Fehler beim Speichern';
      }
    });
  }

  /**
 * Wird vom "Speichern"-Button aufgerufen
 */
saveAnswers(): void {
  // 1. Validierung: Mindestens eine Antwort?
  if (this.selectedAnswers.size === 0) {
    this.saveMessage = 'Bitte wähle mindestens eine Antwort aus.';
    return;
  }

  // 2. Alle Fragen beantwortet?
  if (this.selectedAnswers.size === this.questions.length) {
    // Alles bereits durch Auto-Save gespeichert!
    this.saveMessage = 'Herzlichen Dank für dein Engagement! Deine Antworten sind vollständig. Wir freuen uns auf deine Teilnahme an der Wahl!';
    return;
  }

  // 3. Nicht alle beantwortet → Modal wird durch data-bs-toggle geöffnet
  // User muss im Modal bestätigen: "Trotzdem speichern"
}


  /**
   * Prüft, ob eine Option für eine Frage ausgewählt ist
   */
  isSelected(questionId: number, option: AnswerOption): boolean {
    return this.selectedAnswers.get(questionId) === option;
  }


/**
 * Wird aufgerufen wenn User "Trotzdem speichern" im Modal klickt
 */
confirmSaveWithMissingAnswers(): void {
  //Alles bereits durch Auto-Save gespeichert
  this.saveMessage = 'Gespeichert! Noch nicht alle Fragen beantwortet.';
  this.closeModal();
}


  /**
   * Schließt das Bootstrap Modal
   */
  private closeModal(): void {
    const modalElement = document.getElementById('confirmModal');
    if (modalElement) {
      const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modalElement); //vereinfachern mit import br types
      modalInstance?.hide();
    }
  }

  private deleteAnswerFromBackend(questionId: number): void {

    // Finde die candidateAnswerId für diese Frage
    const question = this.questions.find(q => q.questionId === questionId);

    if (!question || !question.candidateAnswerId) {
      console.log('Keine gespeicherte Antwort gefunden zum Löschen');
      return;
    }

    const candidateAnswerId = question.candidateAnswerId;

    this.answerService.deleteAnswer(question.candidateAnswerId).subscribe({
      next: () => {
        console.log('Answer deleted from backend:', candidateAnswerId);

        //candidateAnswerId zurücksetzen
        question.candidateAnswerId = null;
        question.selectedOption = null;
      },
      error: (error) => {
      console.error('Error deleting answer:', error);
      this.saveMessage = 'Fehler beim Löschen';
    }  
    });
  }


  /**
   * Zeigt die Anzahl der beantworteten Fragen
   */
  getAnsweredCount(): number {
    return this.selectedAnswers.size;
  }


  getOptionLabel(option: AnswerOption | string | null): string {
    // 1. Null / undefined → kein Label
    if (option === null || option === undefined) {
      return 'Keine Antwort';
    }

    // 2. Wenn String (z. B. "STIMME_VOLL_ZU") → in Enum übersetzen
    if (typeof option === 'string') {
      const enumValue = (AnswerOption as any)[option];
      if (enumValue !== undefined) {
        option = enumValue as AnswerOption;
      } else {
        console.warn('Unbekannte AnswerOption in getOptionLabel:', option);
        return 'Keine Antwort';
      }
    }

    // 3. Ab hier behandeln wir nur noch echte Enum-Werte
    const labels: Record<AnswerOption, string> = {
      [AnswerOption.STIMME_VOLL_ZU]: 'Stimme voll zu',
      [AnswerOption.STIMME_ZU]: 'Stimme zu',
      [AnswerOption.NEUTRAL]: 'Neutral',
      [AnswerOption.STIMME_NICHT_ZU]: 'Stimme nicht zu',
      [AnswerOption.STIMME_UEBERHAUPT_NICHT_ZU]: 'Stimme überhaupt nicht zu',
      [AnswerOption.FRAGE_UEBERSPRINGEN]: 'Frage überspringen'
    };

    return labels[option as AnswerOption];
  }


  // für voter ergebnis anzeigen
  private normalizeToAnswerOption(option: AnswerOption | string | null): AnswerOption {
    // null/undefined --> sinnvoller default
    if (option === null || option === undefined) {
      return AnswerOption.NEUTRAL;
    }

    // BE schickt String, z. B. "STIMME_VOLL_ZU"
    if (typeof option === 'string') {
      const enumValue = (AnswerOption as any)[option];
      if (enumValue !== undefined) {
        return enumValue as AnswerOption;
      }
      console.warn('Unbekannte AnswerOption aus Backend:', option);
      return AnswerOption.NEUTRAL;
    }

    // fall bereits numerischer Enum-Wert
    return option;
  }
}



