import { Component, inject } from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../shared/services/auth.service';
import {TranslocoModule} from '@jsverse/transloco';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    TranslocoModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  authService = inject(AuthService);
  router = inject(Router);

  // Signals aus AuthService nutzen
  isLoggedIn = this.authService.loggedIn;
  isAdmin = this.authService.isAdmin;
  user = this.authService.user;



  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
