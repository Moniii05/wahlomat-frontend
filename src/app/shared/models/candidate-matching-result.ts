export interface CandidateMatchingResult {
  candidateId: number;
  firstname: string;
  lastname: string;

  facultyId: number | null;
  aboutMe: string | null;

  listId: number | null;
  listNumber: number | null;
  listName: string | null;

  committeeId: string;
  matchingPercentage: number;
}
