import {Component, inject, OnInit, signal, WritableSignal} from '@angular/core';
import { QuestionService } from '../../shared/services/question.service';
import { Question } from '../../shared/interfaces/question';
import {AnswerService} from '../../candidate/answer/services/answer.service';
import { candidateManagementService } from '../../shared/services/candidateManagement.service';
import {TranslocoModule} from '@jsverse/transloco';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [TranslocoModule],
  templateUrl: './question-management.component.html',
  styleUrl: './question-management.component.css'
})

export class QuestionManagementComponent implements OnInit{
  private questionService = inject(QuestionService);
  private answerService = inject(AnswerService);
  private candidateManagementService = inject(candidateManagementService);

  questions: WritableSignal<Question[]> = signal([]);

  // Speichern der QuestionId für Lösch-Dialog
  currentQuestionId: number | null = null;

  // Anzahl aller Fragen zur ausgewählten Aussage
  existingAnswersCount: number = 0;

  // Anzahl aller Kandidierenden
  candidateCount: number = 0;

  // Anzeigen des Bereichs zur Aussagenerstellung
  showAddQuestionArea: boolean = false;

  ngOnInit(): void {
    this.loadQuestions();
    this.loadCandidateCount();
  }

  loadQuestions(): void {
    this.questionService.getAllQuestions().subscribe({
      next: () => {
        // Signal mit allen Fragen setzen
        this.questions = this.questionService.allQuestions;
        // Lade für jede Frage die Anzahl der Antworten
        this.loadAnswerCounts();
      },
      error: (error) => console.error('Error loading questions:', error)
    });
  }

  loadAnswerCounts(): void {
    const questions = this.questions();
    questions.forEach(question => {
      this.answerService.getAnswersByQuestion(question.questionId).subscribe({
        next: (answers) => {
          // Aktualisiere die Frage mit der Antwort-Anzahl
          const updatedQuestions = this.questions().map(q =>
            q.questionId === question.questionId
              ? { ...q, answersCount: answers.length }
              : q
          );
          this.questions.set(updatedQuestions);
        },
        error: (error) => {
          console.error('Error loading answers count:', error);
          // Setze -1 als Fehlerwert
          const updatedQuestions = this.questions().map(q =>
            q.questionId === question.questionId
              ? { ...q, answersCount: -1 }
              : q
          );
          this.questions.set(updatedQuestions);
        }
      });
    });
  }

  loadCandidateCount(): void {
    this.candidateManagementService.listRegistered().subscribe({
      next: (candidates) => {
        this.candidateCount = candidates.length;
      },
      error: (error) => console.error('Error loading candidate count:', error)
    })
  }


  startAddQuestion(): void {
    this.showAddQuestionArea = true;
  }

  cancelAddQuestion(): void {
    this.showAddQuestionArea = false;
  }

  addQuestion(newQuestion: String): void {
    this.questionService.createQuestion(newQuestion).subscribe({
      next: () => {
        this.showAddQuestionArea = false;
        console.log("Question sucessfully saved: " + newQuestion);
        },
      error: (error) => console.error('Error adding question:', error),
    });
  }

  openDeleteDialog(questionId: number): void {
    this.currentQuestionId = questionId;

    // Anzahl der Antworten für die ausgewählte Frage in Variable speichern
    const question = this.questions().find(q => q.questionId === questionId);
    this.existingAnswersCount = question?.answersCount || 0;
  }

  confirmDelete(): void {
    if(this.currentQuestionId !== null) {
      this.questionService.deleteQuestion(this.currentQuestionId).subscribe({
        next: () => {
          console.log("Question successfully deleted");
          this.currentQuestionId = null;
        },
        error: (error) => console.error('Error deleting question:', error)
      });
    }
  }

}
