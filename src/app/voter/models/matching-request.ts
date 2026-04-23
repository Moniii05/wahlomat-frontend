import { AnswerOption } from '../../shared/models/answer-option';

export interface MatchingRequest {
  questionId: number;
  selectedOption: AnswerOption; 
  isWeighted: boolean;
}