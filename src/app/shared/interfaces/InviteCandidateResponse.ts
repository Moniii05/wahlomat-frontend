//Form der Antwort, die vom Backend erwartet wird, bei Invite
export interface InviteCandidateResponse {
  id: number;
  email: string;
  status: string;         //InviteStatus wie invited, registered oder expired
  invitedAt: string;      //Datum als String (da invites ablaufen können)
  registeredUserId: number | null;
}
