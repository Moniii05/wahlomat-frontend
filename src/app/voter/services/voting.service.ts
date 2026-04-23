import { Injectable } from '@angular/core';
import { MatchingRequest } from '../models/matching-request';
import { AnswerOption } from '../../shared/models/answer-option';

interface SavedAnswer {
  questionId: number;
  selectedOption: AnswerOption; //number (0,1,2,3,4,-1)
  isWeighted: boolean;
  timestamp: Date;
  expiresAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class VotingService {
  private readonly STORAGE_KEY = 'voter_answers';
  private readonly STORAGE_VERSION = '1.0';
  private readonly VERSION_KEY = 'voter_storage_version';
  private readonly EXPIRY_HOURS = 2;

  constructor() {
    this.initStorage(); //beim starten aufrufen
  }

  private initStorage(): void {
    const storedVersion = localStorage.getItem(this.VERSION_KEY);
    
    if (storedVersion !== this.STORAGE_VERSION) {
      console.log('Version mismatch - clearing storage');
      this.clearAllAnswers();
      localStorage.setItem(this.VERSION_KEY, this.STORAGE_VERSION);
    }
  }

  //frage überspringen entfernt -> da nicht mehr gespeichert
   private isValidAnswerOption(value: any): value is AnswerOption {
    // Wenn String → zu Number parsen
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    
    // Prüfe ob es eine der gültigen Zahlen ist
    const validValues = [
      AnswerOption.STIMME_VOLL_ZU,              // 4
      AnswerOption.STIMME_ZU,                   // 3
      AnswerOption.NEUTRAL,                     // 2
      AnswerOption.STIMME_NICHT_ZU,             // 1
      AnswerOption.STIMME_UEBERHAUPT_NICHT_ZU,  // 0
     // AnswerOption.FRAGE_UEBERSPRINGEN          // -1
    ];
    
    return validValues.includes(numValue);
  }


 /**
   * Speichert eine Antwort im localStorage
   */
  saveAnswer(request: MatchingRequest): void {
    const answers = this.getAllAnswers();
    console.log('BEFORE SAVE - Existing answers:', answers.length); 
    
    const answer: SavedAnswer = {
      questionId: request.questionId,
      selectedOption: request.selectedOption, // Speichert als number 
      isWeighted: request.isWeighted,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.EXPIRY_HOURS * 60 * 60 * 1000) // = 2h
    };

    // Ersetze existierende Antwort oder füge neue hinzu
    const index = answers.findIndex(a => a.questionId === request.questionId);
    if (index !== -1) {
      answers[index] = answer;
    } else {
      answers.push(answer);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(answers));
    console.log('AFTER SAVE - Total answers:', answers.length);
    console.log('Saved to localStorage:', answer);
  }

  /**
   * Holt eine gespeicherte Antwort für eine bestimmte Frage
   */
  getAnswer(questionId: number): SavedAnswer | null {
    const answers = this.getAllAnswers();
    return answers.find(a => a.questionId === questionId) || null;
  }

  /**
   * Holt alle gespeicherten Antworten
   */
  getAllAnswers(): SavedAnswer[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      const now = new Date();

      const valid = parsed.filter((answer: any) => {
        if (!answer.expiresAt) {
          console.warn('Antwort ohne expiresAt gefunden, wird gelöscht'); 
          return false; //alte Daten löschen
        }
        return new Date(answer.expiresAt) > now;
      });

      // Speichere gefilterte Liste zurück
      if (valid.length !== parsed.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(valid));
      }

      return valid
        .filter((answer: any) => {
          const isValid = answer.selectedOption !== undefined && this.isValidAnswerOption(answer.selectedOption);
          
          if (!isValid) {
            console.warn('Ungültige AnswerOption gefunden:', answer.selectedOption);
          }
          return isValid;
        })
        .map((answer: any) => ({
          questionId: answer.questionId,
          selectedOption: typeof answer.selectedOption === 'string' ? parseInt(answer.selectedOption, 10) : answer.selectedOption,
          isWeighted: answer.isWeighted ?? false,
          timestamp: new Date(answer.timestamp),
          expiresAt: answer.expiresAt ? new Date(answer.expiresAt) : undefined
        }));
    } catch (error) { 
      console.error('Fehler beim Parsen der Antworten:', error);
      return [];
    }
  }

  //bereinigt antworten mit ungültigen question-ids
  cleanInvalidAnswers(validQuestionIds: number[]): void {
    const answers = this.getAllAnswers();
    console.log('CLEANUP - Before:', answers); 
    console.log('Valid Question IDs:', validQuestionIds); 
    const cleaned = answers.filter(a => validQuestionIds.includes(a.questionId));

    console.log('CLEANUP - After:', cleaned); 
    
    if (cleaned.length !== answers.length) {
      console.log(`${answers.length - cleaned.length} ungültige Antworten gelöscht`);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleaned));
    }
  }

  
   clearAllAnswers(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.VERSION_KEY); // !
  }

  /**
   * Berechnet den Fortschritt (0-100%)
   */
  getProgress(totalQuestions: number): number {
    if (!totalQuestions || totalQuestions <= 0) return 0;

    const answers = this.getAllAnswers();
  
  // KEINE ID-Validierung mehr nötig!
  // cleanInvalidAnswers() sorgt bereits dafür, dass nur Antworten zu existierenden Fragen im Storage sind

    if (answers.length === 0) return 0;
    
    //Max 100%
    return Math.min(
      Math.round((answers.length / totalQuestions) * 100),
      100
    );
  }

  /**
   * Zählt beantwortete Fragen （ohne "frage überspringen"）
   */
  getAnsweredCount(): number {
    return this.getAllAnswers().length;
  }

  /**
   * Prüft ob eine Frage beantwortet wurde
   */
  hasAnswered(questionId: number): boolean {     
    return this.getAnswer(questionId) !== null;
  }

  /**
   * Löscht eine einzelne Antwort
   */
  deleteAnswer(questionId: number): void {
    const answers = this.getAllAnswers();
    const filtered = answers.filter(a => a.questionId !== questionId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }


  /**
   * Exportiert Antworten für Matching-Berechnung
   */
  getMatchingRequests(): MatchingRequest[] {
    return this.getAllAnswers().map(answer => ({
      questionId: answer.questionId,
      selectedOption: answer.selectedOption,
      isWeighted: answer.isWeighted
    }));
  }

  /**
   * Prüft ob alle Fragen beantwortet wurden
   */
  isComplete(totalQuestions: number): boolean {
    if (!totalQuestions || totalQuestions <= 0) return false;
    const answers = this.getAllAnswers();

    return answers.length === totalQuestions;
  }
}