import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard zum Schutz von Candidate-Routen
 * Leitet Nicht-Candidates (z.B. Admins) zur Admin-Seite um
 */
export const candidateGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Erst prüfen ob überhaupt eingeloggt
  if (!authService.isLoggedIn()) {
    console.log('CandidateGuard: User not logged in, redirecting to login');
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Dann prüfen ob Candidate (NICHT Admin)
  if (!authService.isUserAdmin()) {
    return true; // User ist Candidate → Zugriff erlaubt
  }

  // User ist Admin → zu Admin-Bereich umleiten
  console.log('CandidateGuard: User is admin, redirecting to admin area');
  router.navigate(['/admin/candidates']);
  return false;
};