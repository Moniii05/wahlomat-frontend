// Frontend-View auf das Kandidatenprofil eines Users
export interface CandidateProfile {
  firstname: string;
  lastname: string;
  facultyId: number;  // ausgewählter Fachbereich
  aboutMe?: string| null; // optionaler Beschreibungstext
}
