import { AuthService } from './auth.service';

//backlog erstmal
describe('AuthService', () => {
  let service: AuthService;

  it('sollte Token speichern nach Login');
  it('sollte isLoggedIn() true zurückgeben wenn Token vorhanden');
  it('sollte isLoggedIn() false zurückgeben wenn kein Token');
  it('sollte isUserAdmin() richtig prüfen für ADMIN role');
  it('sollte isUserAdmin() false zurückgeben für CANDIDATE role');
  it('sollte Token löschen bei logout()');
  it('sollte User-Daten aus Token dekodieren können');
});
