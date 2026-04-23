import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { QuestionWithAnswerResponse, CandidateAnswerRequest, CandidateAnswerResponse} from '../models/answer';
import { BackendService } from '../../../shared/services/backend.service';
import { AuthService } from '../../../shared/services/auth.service';



@Injectable({
  providedIn: 'root'
})

export class AnswerService {

  constructor(
    private backend: BackendService,
    private auth: AuthService
  ) {}

  private get userId(): number {
    const id = this.auth.getUserId();
    if (id == null) {
      throw new Error('Kein eingeloggter User');
    }
    return id;
  }

  /**
   * GET /api/candidate-profiles/{userId}/questions
   * Lädt alle Fragen MIT bereits gespeicherten Antworten des Users
   */
  getQuestionsWithAnswers(): Observable<QuestionWithAnswerResponse[]> {
    return this.backend.get<QuestionWithAnswerResponse[]>(
      `/candidate-profiles/${this.userId}/questions`
    );
  }

  // GET /api/candidate-profiles/answers/{questionId}
  // Lädt alle Antworten zu einer bestimmten Frage (unabhängig vom User)
  getAnswersByQuestion(questionId: number): Observable<CandidateAnswerResponse[]> {
    return this.backend.get<CandidateAnswerResponse[]>(
      `/candidate-profiles/answers/${questionId}`
    );
  }

  /**
   * PATCH /api/candidate-profiles/{userId}/answers/{questionId}
   * Erstellt ODER updated eine einzelne Antwort (Upsert)
   *
   * Verwende dies für:
   * - Auto-Save während Fragebogen-Ausfüllung
   * - Einzelne Antwort ändern
   */
  upsertAnswer(
    questionId: number,
    request: CandidateAnswerRequest
  ): Observable<CandidateAnswerResponse> {
    return this.backend.patch<CandidateAnswerResponse>(
      `/candidate-profiles/${this.userId}/answers/${questionId}`,
      request
    );
  }

  /**
   * DELETE /api/candidate-profiles/{userId}/answers/{answerId}
   * Löscht eine Antwort
   */
  deleteAnswer(answerId: number): Observable<void> {
    return this.backend.delete<void>(
      `/candidate-profiles/${this.userId}/answers/${answerId}`
    );
  }
}


