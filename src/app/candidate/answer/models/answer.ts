import { AnswerOption } from '../../../shared/models/answer-option';

export interface Answer {
  candidateAnswerId?: number;
  userId: number;
  questionId: number;
  selectedOption: AnswerOption;
}

export interface QuestionWithAnswerResponse {
  questionId: number;
  questionText: string;
  selectedOption: AnswerOption | string | null;
  candidateAnswerId: number | null;
}

// Request DTO (für PUT/POST - was Backend beim Speichern erwartet)
export interface CandidateAnswerRequest {
  selectedOption: AnswerOption;
}

// Response DTO (was Backend zurückgibt bei GET)
export interface CandidateAnswerResponse {
  candidateAnswerId: number;
  questionId: number;
  selectedOption: AnswerOption;
}
