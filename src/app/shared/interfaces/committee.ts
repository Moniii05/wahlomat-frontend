// Gremium, in dem man kandidieren kann
export interface Committee {
  committeeId: string;   // technischer Schlüssel, z.B. "FSR1"
  committeeName: string;   // Anzeigename, z.B. "Fachschaftsrat"
  FACULTY: number | null;
}
 // null = fachbereichsunabhängig (AS, StuPa, Kur)
  // Zahl = nur für diesen Fachbereich sichtbar
