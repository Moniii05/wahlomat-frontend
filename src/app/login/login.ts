// Login-Komponente für sowohl Kandidaten als auch Admins

import { Component, inject } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { AuthService } from '../shared/services/auth.service';
import {Router, ActivatedRoute, RouterModule} from '@angular/router';
import { CommonModule } from '@angular/common';
import {TranslocoModule} from '@jsverse/transloco';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslocoModule,
    RouterModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})

export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup;
  errorMessage: string | null = null;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Prüfe ob User bereits eingeloggt ist
    if (this.authService.isLoggedIn()) {
      const defaultRoute = this.authService.getDefaultRoute();
      this.router.navigate([defaultRoute]);
    }

    // Prüfe auf Error-Parameter (z.B. session_expired)
    this.route.queryParams.subscribe(params => {
      if (params['error'] === 'session_expired') {
        this.errorMessage = 'Deine Session ist abgelaufen. Bitte melde dich erneut an.';
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.errorMessage = null;

    const credentials = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.loginUser(credentials).subscribe({
      next: (response) => {
        console.log('Login successful:', response);

        // Hole returnUrl aus Query Params (falls vorhanden)
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];

        // Wenn returnUrl vorhanden und erlaubt, dorthin navigieren
        if (returnUrl && this.isAllowedRoute(returnUrl, response.role)) {
          this.router.navigate([returnUrl]);
        } else {
          // Sonst: Zur Standard-Route für die Rolle
          this.redirectByRole(response.role);
        }

      },
      error: (error) => {
        console.error('Login failed:', error);

        // Backend ErrorResponse auswerten
        if (error.status === 401) {
          // Falsches Passwort
          this.errorMessage = 'Ungültige E-Mail oder Passwort.';
        } else if (error.status === 0) {
          // Backend nicht erreichbar
          this.errorMessage = 'Server nicht erreichbar. Bitte versuche es später erneut.';
        } else if (error.error?.message) {
          // Backend-Fehlermeldung
          this.errorMessage = error.error.message;
        } else {
          // Fallback
          this.errorMessage = 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.';
        }
      }
    });
  }

  /**
   * Leitet User basierend auf seiner Rolle weiter
   */
  private redirectByRole(role: string): void {
    if (role === 'ADMIN') {
      this.router.navigate(['/admin/candidates']);
    } else if (role === 'CANDIDATE') {
      this.router.navigate(['/candidate/profile']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  /**
   * Prüft ob eine Route für die gegebene Rolle erlaubt ist
   */
  private isAllowedRoute(route: string, role: string): boolean {
    if (role === 'ADMIN') {
      return route.startsWith('/admin');
    } else if (role === 'CANDIDATE') {
      return route.startsWith('/candidate');
    }
    return false;
  }
}





