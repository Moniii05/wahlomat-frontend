import { Observable, tap } from "rxjs";
import { Question } from "../models/question";
import { Injectable, WritableSignal, signal } from "@angular/core";
import { BackendService } from "./backend.service";

/**
 * Shared QuestionService (für Candidates, Wählende und Admin)
 * Zweck: Lesen von Fragen für
 */


@Injectable({
  providedIn: 'root'
})
export class QuestionService {

  private basePath = '/questions';

  constructor(private backend: BackendService) {}

  allQuestions: WritableSignal<Question[]> = signal([]);

  // POST /api/questions - Neue Frage anlegen
  createQuestion(newQuestion: String): Observable<Question> {
    return this.backend.post<Question>(this.basePath, newQuestion).pipe(
      tap((createdQuestion) => {
        // Signal hier aktualisieren
        this.allQuestions.update(currentQuestions => [...currentQuestions, createdQuestion]);
      })
    );
  }


  // GET /api/questions - Alle öffentlichen Fragen
  getAllQuestions(): Observable<Question[]> {
    let response = this.backend.get<Question[]>(this.basePath);
    // Befüllen des Signals mit den geladenen Fragen
    response.subscribe(questions => {
      this.allQuestions.set(questions);
    });
    return response;
  }

  // GET /api/questions/{questionId} - Einzelne Frage laden
  getQuestionById(questionId: number): Observable<Question> {
    return this.backend.getOne<Question>(this.basePath, questionId);
  }


  // DELETE /api/questions/{questionId} - einzelne Frage löschen
  deleteQuestion(questionId: number): Observable<void> {
    return this.backend.delete<void>(this.basePath + `/${questionId}`).pipe(
      tap(() => {
        // Signal hier aktualisieren
        this.allQuestions.update(currentQuestions =>
          currentQuestions.filter(q => q.questionId !== questionId)
        );
      })
    );
  }

}
