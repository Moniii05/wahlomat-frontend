import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http'; // HttpHandlerFn importieren
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment.development';

/**
 * HTTP Interceptor für JWT-Token
 * Fügt automatisch das Bearer-Token zu allen ausgehenden HTTP-Requests hinzu
 * Behandelt 401 (Unauthorized) und 403 (Forbidden) Errors
 */


export const jwtInterceptor: HttpInterceptorFn = (req, next: HttpHandlerFn) => { // Typ hinzufügen
   if (!environment.jwtEnabled) {
    return next(req);  // Interceptor deaktiviert
  }
  
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const isAuthEndpoint = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');

  // Wenn ein Token vorhanden ist, klone den Request und füge Authorization-Header hinzu
  let authReq = req;
  if (token && !isAuthEndpoint) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

   return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      //login-fehler nicht im interceptor behandeln
      if (isAuthEndpoint) {
        console.log('Login/Register failed - handled by component');
        return throwError(() => error);  // Weiterwerfen an Component
      }
      
      // nur für geschützte endpunkte: 401 Unauthorized: Token ungültig oder abgelaufen
      if (error.status === 401) {
        console.log('JWT Interceptor: 401 Unauthorized - Token invalid/expired');
        
        // User ausloggen und zum Login umleiten
        authService.logout();
        router.navigate(['/login'], {
          queryParams: { error: 'session_expired' }
        });
      }

      // 403 Forbidden: Keine Berechtigung für diese Aktion
      if (error.status === 403) {
        console.error('JWT Interceptor: 403 Forbidden - Access denied');

        alert('Du hast keine Berechtigung für diese Aktion.');
        
        // User auf seine Standard-Seite umleiten
        const user = authService.user();
        if (user?.role === 'ADMIN') {
          router.navigate(['/admin/candidates']);
        } else if (user?.role === 'CANDIDATE') {
          router.navigate(['/candidate/profile']);
        } else {
          router.navigate(['/login']);
        }
      }

      // Error weiterwerfen für weitere Behandlung in Components
      return throwError(() => error);
    })
  );
};