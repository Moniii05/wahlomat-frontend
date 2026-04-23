// question-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuestionService } from '../../../shared/services/question.service';
import { VotingService } from '../../services/voting.service';
import { Question } from '../../../shared/models/question';
import { AnswerOption } from '../../../shared/models/answer-option';
import { MatchingRequest } from '../../models/matching-request';
import { HttpErrorResponse } from '@angular/common/http';
import {TranslocoModule} from '@jsverse/transloco';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './question-list.html',
  styleUrls: ['./question-list.css']
})

export class QuestionListComponent implements OnInit {
  questions: Question[] = [];
  currentIndex = 0;
  loading = false;
  selectedOption: AnswerOption | null = null;
  isWeighted = false;

  readonly AnswerOption = AnswerOption;

  constructor(
    private questionService: QuestionService,
    private votingService: VotingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('ngOnInit - Questions:', this.questions.length);
    this.loadQuestions();
  }

  loadQuestions(): void {
    this.loading = true;
    console.log('loadQuestions START - Questions:', this.questions.length);

    this.questionService.getAllQuestions().subscribe({
      next: (data: Question[]) => {
        console.log('Data received:', data);
        console.log('Data length:', data.length);
        this.questions = data;
        console.log('this.questions:', this.questions);
        console.log('this.questions.length:', this.questions.length);

        if (this.questions.length > 0) {
          const validQuestionIds = this.questions.map(q => q.questionId);
          this.votingService.cleanInvalidAnswers(validQuestionIds);

          console.log('Valid Question IDs:', validQuestionIds);
          console.log('Answers after cleanup:', this.votingService.getAllAnswers());
        }

        this.loading = false;
        this.loadSavedAnswer();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Fehler beim Laden:', err);
        this.loading = false;
      }
    });
  }


  loadSavedAnswer(): void {
    if (!this.currentQuestion) return;

    const saved = this.votingService.getAnswer(this.currentQuestion.questionId);
    if (saved) {
      this.selectedOption = saved.selectedOption;
      this.isWeighted = saved.isWeighted;
    } else {
      this.selectedOption = null;  //null = eindeutig "nichts ausgewählt", 0 ist falsy in js
      this.isWeighted = false;
    }
  }

  /**
   * Wählt eine Antwort aus oder wählt sie ab (Toggle)
   */
  selectAnswer(option: AnswerOption): void {
    if (this.selectedOption === option) {
      // Gleiche Option nochmal → Abwählen
      this.selectedOption = null;
      this.isWeighted = false;

      if(this.currentQuestion) {
        this.votingService.deleteAnswer(this.currentQuestion.questionId);
        console.log('Antwort gelöscht für Frage:', this.currentQuestion.questionId);
      }
    } else {
      // Neue Option auswählen
      this.selectedOption = option;
    }
  }

  /**
   * Behandelt sowohl "Weiter" als auch "Überspringen"
   */
  handleNextOrSkip(): void {
    if (this.selectedOption) {
      // Antwort gewählt → Speichern & Weiter
      this.saveAndNext();
    } else {
      // Keine Antwort → Überspringen
      this.skipQuestion();
    }
  }

  saveAndNext(): void {
    if (!this.currentQuestion) {
    console.error('FEHLER: Keine currentQuestion!');
    return;
    }

    console.log('saveAndNext() called with:', {
    questionId: this.currentQuestion.questionId,
    selectedOption: this.selectedOption,
    isWeighted: this.isWeighted
   });

    const request: MatchingRequest = {
      questionId: this.currentQuestion.questionId,
      selectedOption: this.selectedOption!,  // ! weil wir wissen es ist gesetzt
      isWeighted: this.isWeighted   //checkbox gesetzt
    };

    this.votingService.saveAnswer(request);

    if (this.currentIndex < this.questions.length - 1) {
      this.nextQuestion();
    } else {
      // Letzte Frage → zu Results
      this.router.navigate(['/voter/results']);
    }
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.loadSavedAnswer();
    }
  }

  previousQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.loadSavedAnswer();
    }
  }

  skipQuestion(): void {
    // "überspringen" wird NICHT gespeichert

    if (this.currentIndex < this.questions.length - 1) {
      this.nextQuestion();
    } else {
      this.router.navigate(['/voter/results']);
    }
  }

  get currentQuestion(): Question | null {
    return this.questions[this.currentIndex] || null;
  }

  get progress(): number {

    const total = this.questions.length;
    const answers = this.votingService.getAllAnswers();
    const prog = this.votingService.getProgress(total);
    console.log('=== PROGRESS DEBUG ===');
    console.log('Total Questions:', total);
    console.log('Saved Answers:', answers);
    console.log('Saved Answers Count:', answers.length);
    console.log('Progress:', prog);
    console.log('Current Question ID:', this.currentQuestion?.questionId);
    console.log('==================');
    return prog;
    //return this.votingService.getProgress(this.questions.length); production mode: nur one line
  }

  get progressText(): string {
    return `Aussage ${this.currentIndex + 1} von ${this.questions.length}`;
  }

  get canGoBack(): boolean {
    return this.currentIndex > 0;
  }
}
