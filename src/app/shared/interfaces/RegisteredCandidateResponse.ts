//Entspricht Backend DTO, null Werte -> falls noch kein Profil dazu existiert
export interface RegisteredCandidateResponse {
  userId: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  facultyId: number | null;
}
