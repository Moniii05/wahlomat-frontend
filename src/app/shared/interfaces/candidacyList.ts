// Liste innerhalb eines Gremiums (DB-Entität "lists")
export interface CandidacyList {
  listId: number; // Listen-ID aus der DB
  number: number; // Listennummer
  listName: string;  // Anzeigename im Dropdown
  committeeId?: string; // Referenz auf das Gremium
}
