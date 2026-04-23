// Service zur Verwaltung der Authentifizierung und Autorisierung von Benutzern (Login, Logout, Registrierung, Rollenprüfung)

import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import {Observable, Subject, tap} from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User } from '../interfaces/user';
import { AuthResponse } from '../interfaces/auth-response';
import { BackendService } from './backend.service';



@Injectable({
  providedIn: 'root'
})
export class AuthService {

private tokenKey = 'token';
private userKey = 'user';


private backendservice = inject (BackendService)
private http = inject(HttpClient);

baseUrl = this.backendservice.apiURL+ '/auth';

   // Signals für reaktive State-Verwaltung
  private currentUser: WritableSignal<User | null> = signal(null);
  private currentToken: WritableSignal<string | null> = signal(null);

  // Computed Signals für UI
  loggedIn: Signal<boolean> = computed(() => !!this.currentUser() && !!this.currentToken());
  isAdmin: Signal<boolean> = computed(() => this.currentUser()?.role === 'ADMIN');
  user: Signal<User | null> = computed(() => this.currentUser());

  constructor() {
    // Bei Initialisierung: User und Token aus localStorage laden
    this.loadUserFromStorage();
  }


  /**
   * Lädt User und Token aus localStorage (z.B. nach Seiten-Reload)
   */
  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');

    if (token && userJson) {
      try {
        const user: User = JSON.parse(userJson);
        this.currentToken.set(token);
        this.currentUser.set(user);
        console.log('User from storage loaded:', user.email);
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
        this.clearStorage();
      }
    }
  }


   /**
   * Speichert User und Token in localStorage UND Signals
   */
  setUser(token: string, email: string, role: string, userId?: number): void {
    const user: User = {
      id: userId?.toString() || '',
      email: email,
      password: '',
      role: role as 'ADMIN' | 'CANDIDATE'
    };

    // In Signals speichern
    this.currentToken.set(token);
    this.currentUser.set(user);

    // In localStorage speichern (für Seiten-Reload)
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));

    console.log('User set:', email, 'Role:', role, 'UserId:', userId);
  }

  /**
   * Löscht User und Token (Logout)
   */
  unsetUser(): void {
    this.currentToken.set(null);
    this.currentUser.set(null);
    this.clearStorage();
    console.log('User logged out');
  }

   /**
   * Löscht localStorage
   */
  private clearStorage(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

   /**
   * Gibt das aktuelle Token zurück (für BackendService/Interceptor)
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUserId(): number | null {
    // Zuerst: Versuche userId aus User-Object (localStorage)
    const user = this.currentUser();
    if (user?.id && user.id !== '') {
      return parseInt(user.id, 10);
    }

    // Fallback: Versuche userId aus JWT Token zu decodieren
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.sub; // 'sub' ist Standard JWT claim für userId
    } catch (e) {
      console.error('Error decoding JWT token:', e);
      return null;
    }
  }

  /**
 * Gibt die Rolle des aktuellen Users zurück  ////
 */
getUserRole(): 'ADMIN' | 'CANDIDATE' | null {
  const user = this.currentUser();
  return user?.role || null;
}

/**
 * Gibt die Standard-Route für den aktuellen User zurück   ////
 */
getDefaultRoute(): string {
  const role = this.getUserRole();
  if (role === 'ADMIN') {
    return '/admin/candidates';
  } else if (role === 'CANDIDATE') {
    return '/candidate/profile';
  }
  return '/login';
}



   /**
   * Login-Anfrage ans Backend
   */
  loginUser(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.baseUrl + '/login', credentials).pipe(
      tap((response: AuthResponse) => {
        // Bei erfolgreichem Login: Token, User UND userId speichern
        const userId = this.extractUserIdFromToken(response.token);
        this.setUser(response.token, response.email, response.role, userId);
      })
    );
  }

  private extractUserIdFromToken(token: string): number | undefined {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.sub;
    } catch (e) {
      console.error('Error extracting userId from token:', e);
      return undefined;
    }
  }



  /**
   * Prüft ob ein User eingeloggt ist
   */
  isLoggedIn(): boolean {
    return this.loggedIn();
  }

  /**
   * Prüft ob der eingeloggte User ein Admin ist (wenn false -> ist ein Candidate)
   */
  isUserAdmin(): boolean {
    return this.isAdmin();
  }


  /**
   * Registrierung eines neuen Users (nur für Admins) wird diese Methode jemals genutzt ?
   */
  registerUser(email: string): Observable<any> {
    return this.http.post(this.baseUrl + '/register', { email });
  }

  /**
   * Registrierung einer neuen Kandidat:in nach versandter Mail Einladung
   * nach Pfadangabe
   * Methode muss noch angepasst werden nach Erweiterung CandidcyList -> bisher nur eine Kandidatur
   *   */

  registerCandidate(firstname: string,
                    lastname: string,
                    facultyId: number,
                    aboutMe: string,
                    password: string,
                    email: string,
                    candidacies: { committeeId: string; listId: number }[]
  ):
    Observable<any> { return this.http.post(this.baseUrl + '/register', {firstname, lastname,
      facultyId,aboutMe,password,email,candidacies } );

  }


  /**
   * Logout: User abmelden und zum Login zurück
   */
  logout(): void {
    this.unsetUser();
  }

  // Passwort ändern (für eingeloggten User)
  changePassword(dto: { currentPassword: string, newPassword: string }): Observable<any> {
    return this.http.put(this.baseUrl + '/change-password', dto);
  }

}
