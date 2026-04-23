import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendService } from '../../shared/services/backend.service';
import { MatchingRequest } from '../../voter/models/matching-request';
import { CandidateMatchingResult } from '../models/candidate-matching-result';
import { QuestionWithAnswerResponse } from '../../candidate/answer/models/answer';

@Injectable({
  providedIn: 'root'
})
export class ResultsService {

  constructor(private backend: BackendService) {}

 
// ruft POST /api/candidate-profiles/matching/{committeeId}
  getResults(
    committeeId: string,
    voterAnswers: MatchingRequest[]
  ): Observable<CandidateMatchingResult[]> {
    const endpoint = `/candidate-profiles/matching/${committeeId}`;
    return this.backend.post<CandidateMatchingResult[]>(endpoint, voterAnswers);
  }

  getCandidateAnswers(candidateId: number): Observable<QuestionWithAnswerResponse[]> {
    const endpoint = `/candidate-profiles/${candidateId}/questions`;
    return this.backend.get<QuestionWithAnswerResponse[]>(endpoint);
  }  
}
