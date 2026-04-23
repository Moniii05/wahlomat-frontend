import { Component, computed, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service';
import {TranslocoService, TranslocoModule} from '@jsverse/transloco';
import { filter } from 'rxjs/operators';


@Component({
  selector: 'app-navbar',
  imports: [
    RouterLinkActive,
    NgForOf,
    RouterLink,
    NgIf,
    TranslocoModule
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {

  private authService = inject(AuthService);
  private translocoService = inject(TranslocoService);
  private router = inject(Router);

  isHomeRoute: boolean = false;
  isVoterResultsRoute: boolean = false;

  isCandidateProfileRoute = false;
  isCandidateAnswersRoute = false;

  isAdminQuestionsRoute = false;
  isAdminCandidatesRoute = false;
  isAdminListsRoute = false;

  showAudioIcon: boolean = false;

  private homeAudio = new Audio('/assets/audio/home/home-info.wav');
  private resultsAudio = new Audio('/assets/audio/voter/ergebnisseite.wav');

  private candidateProfileAudio = new Audio('/assets/audio/candidate/candidate-profilepage.wav');
  private candidateAnswersAudio = new Audio('/assets/audio/candidate/candidate-aussagen.wav');

  private adminQuestionsAudio = new Audio('/assets/audio/admin/admin-aussagen.wav');
  private adminCandidatesAudio = new Audio('/assets/audio/admin/admin-kandidatenverwaltung.wav');
  private adminListsAudio = new Audio('/assets/audio/admin/admin-listen.wav');


  private currentUrl = '';

  // Kandidaten-Links
  candidateLinks = [
    { key: 'profile', path: '/candidate/profile' },
    { key: 'statements', path: '/candidate/answer-list' },
  ];

  // Admin-Links
  adminLinks = [
    { key: 'questionManagement', path: '/admin/questions' },
    { key: 'candidateManagement', path: '/admin/candidates' },
    { key: 'listManagement', path: '/admin/lists' },
  ];

  //Nutzung AuthService für Rollen-Check
  role = computed(() => {
    const user = this.authService.user();
    if (!user) return null;
    return user.role === 'ADMIN' ? 'admin' : 'candidate';
  });

  //login-Check für (Un)Sichtbarkeit
  loggedIn = computed(() => !!this.authService.user());

  isDarkMode = false;
  currentLang = 'de'; // Default language

  ngOnInit() {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkMode = savedTheme === 'dark';
    } else {
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyTheme();

    this.setRouteState(this.router.url);

    // bei Navigation
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.setRouteState(e.urlAfterRedirects || e.url);
      });



    // Sprache aus localStorage laden oder Default verwenden
    const savedLang = localStorage.getItem('lang') || 'de';
    this.currentLang = savedLang;
    this.translocoService.setActiveLang(savedLang);
  }

  private setRouteState(url: string) {
    const cleanUrl = (url || '').split('?')[0].split('#')[0];

    // wenn Seite wechselt --> audio stoppen
    if (cleanUrl !== this.currentUrl) {
      this.stopAllAudios();
      this.currentUrl = cleanUrl;
    }


     // Public
     this.isHomeRoute = (cleanUrl === '/home' || cleanUrl === '/');
     this.isVoterResultsRoute = cleanUrl.startsWith('/voter/results');

     // Candidate
     this.isCandidateProfileRoute = cleanUrl.startsWith('/candidate/profile');
     this.isCandidateAnswersRoute = cleanUrl.startsWith('/candidate/answer-list');

     // Admin
     this.isAdminQuestionsRoute = cleanUrl.startsWith('/admin/questions');
     this.isAdminCandidatesRoute = cleanUrl.startsWith('/admin/candidates');
     this.isAdminListsRoute = cleanUrl.startsWith('/admin/lists');

     const isLogged = this.loggedIn();
     const isCandidate = isLogged && this.role() === 'candidate';
     const isAdmin = isLogged && this.role() === 'admin';

     // Sichtbarkeit Icon:
     // wenn NICHT eingeloggt + auf Home/Results
     const publicAudio = !isLogged && (this.isHomeRoute || this.isVoterResultsRoute);

     // nur wenn Kandidat eingeloggt und auf seinen Seiten
     const candidateAudio = isCandidate && (this.isCandidateProfileRoute || this.isCandidateAnswersRoute);

     //nur wenn Admin eingeloggt und auf seinen Seiten
     const adminAudio = isAdmin && (this.isAdminQuestionsRoute || this.isAdminCandidatesRoute || this.isAdminListsRoute);

     this.showAudioIcon = publicAudio || candidateAudio || adminAudio;
   }

   playPageAudio(): void {
     if (!this.showAudioIcon) return;

     const isLogged = this.loggedIn();
     const role = this.role();

     // public wähler
     if (!isLogged) {
       if (this.isHomeRoute) {
         this.stopAllAudios();
         this.homeAudio.currentTime = 0;
         this.homeAudio.play().catch(err => console.error('Home-Audio Fehler:', err));
         return;
       }

       if (this.isVoterResultsRoute) {
         this.stopAllAudios();
         this.resultsAudio.currentTime = 0;
         this.resultsAudio.play().catch(err => console.error('Results-Audio Fehler:', err));
         return;
       }

       return;
     }

     // kandidat
     if (role === 'candidate') {
       if (this.isCandidateProfileRoute) {
         this.stopAllAudios();
         this.candidateProfileAudio.currentTime = 0;
         this.candidateProfileAudio.play().catch(err => console.error('Candidate Profile Audio Fehler:', err));
         return;
       }

       if (this.isCandidateAnswersRoute) {
         this.stopAllAudios();
         this.candidateAnswersAudio.currentTime = 0;
         this.candidateAnswersAudio.play().catch(err => console.error('Candidate Aussagen Audio Fehler:', err));
         return;
       }

       return;
     }

     // admin
     if (role === 'admin') {
       if (this.isAdminQuestionsRoute) {
         this.stopAllAudios();
         this.adminQuestionsAudio.currentTime = 0;
         this.adminQuestionsAudio.play().catch(err => console.error('Admin Aussagen Audio Fehler:', err));
         return;
       }

       if (this.isAdminCandidatesRoute) {
         this.stopAllAudios();
         this.adminCandidatesAudio.currentTime = 0;
         this.adminCandidatesAudio.play().catch(err => console.error('Admin Kandidatenverwaltung Audio Fehler:', err));
         return;
       }

       if (this.isAdminListsRoute) {
         this.stopAllAudios();
         this.adminListsAudio.currentTime = 0;
         this.adminListsAudio.play().catch(err => console.error('Admin Listen Audio Fehler:', err));
         return;
       }
     }
   }

   private stopAllAudios() {
     [
       this.homeAudio,
       this.resultsAudio,
       this.candidateProfileAudio,
       this.candidateAnswersAudio,
       this.adminQuestionsAudio,
       this.adminCandidatesAudio,
       this.adminListsAudio
     ].forEach(a => {
       a.pause();
       a.currentTime = 0;
     });
   }


  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  toggleLanguage() {
    const newLang = this.currentLang === 'de' ? 'en' : 'de';
    this.currentLang = newLang;
    this.translocoService.setActiveLang(newLang);
    localStorage.setItem('lang', newLang);
  }

  private applyTheme() {
    if (this.isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  logout() {
    this.authService.logout();
  }

}
