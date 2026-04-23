// Einzelne Kandidatur eines Users für ein bestimmtes Gremium + Liste
export interface Candidacy {
  candidacyId?: number | null;   // DB-ID, bei neuen Kandidaturen noch null
  committeeId: string;  // z.B. "FSR1", "FBR3", "AS" ...
  listId: number ;         // ID der gewählten Liste
}

// request dto POST/PUT
export interface CandidacyCreate {
  committeeId: string;
  listId: number;
}
