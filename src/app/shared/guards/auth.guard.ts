
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard zum Schutz von Routen, die einen eingeloggten User erfordern
 * Leitet nicht-eingeloggte User zum Login um
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // User ist eingeloggt → Zugriff erlaubt
  }

  // User ist nicht eingeloggt → zum Login umleiten
  console.log('AuthGuard: User not logged in, redirecting to login');
  router.navigate(['/login'], { 
    queryParams: { returnUrl: state.url } // Optional: Rücksprung-URL speichern
  });
  return false;
};