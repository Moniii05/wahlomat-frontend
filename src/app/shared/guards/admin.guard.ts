
// admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard zum Schutz von Admin-Routen
 * Leitet Nicht-Admins zur Candidate-Seite um
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Erst prüfen ob überhaupt eingeloggt
  if (!authService.isLoggedIn()) {
    console.log('AdminGuard: User not logged in, redirecting to login');
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Dann prüfen ob Admin
  if (authService.isUserAdmin()) {
    return true; // User ist Admin → Zugriff erlaubt
  }

  // User ist kein Admin → zu Candidate-Bereich umleiten
  console.log('AdminGuard: User is not admin, redirecting to candidate profile');
  router.navigate(['/candidate/profile']);
  return false;
};