
import { Routes } from '@angular/router';
import { adminGuard } from './shared/guards/admin.guard';
import { authGuard } from './shared/guards/auth.guard';
import {Login} from './login/login';
import {Impressum} from './impressum/impressum';
import {AboutElections} from './about-elections/about-elections';
import {HomeComponent} from './home/home.component';
import {CandidatesManagementComponent} from './admin/candidates-management/candidates-management.component';
import {ListmanagementComponent} from './admin/listmanagement/listmanagement.component';
import {RegisterComponent} from './register/register.component';
import {QuestionManagementComponent} from './admin/question-management/question-management.component';
import { candidateGuard } from './shared/guards/candidate.guard';
import {QuestionListComponent} from './voter/components/question-list/question-list';
import {ResultsComponent} from './voter/components/results/results';
import {Profile} from './candidate/profile/profile';
import {PageNotFoundComponent} from './layout/page-not-found/page-not-found.component';
import {AnswerList} from './candidate/answer/answer-list/answer-list';

export const routes: Routes = [

  // ========== PUBLIC ROUTES ==========
  { path: '', redirectTo: 'home', pathMatch: 'full' },   //root redirect
  { path: 'home', component: HomeComponent}, //public routes (ohne guard)
  { path: 'login', component: Login},
  { path: 'impressum', component: Impressum},
  { path: 'about-elections', component: AboutElections},
  { path: 'candidate-registration', component: RegisterComponent},

  // ========== VOTER ROUTES (Wählende) ==========
  {
    path: 'voter/questions',
    component: QuestionListComponent
  },
  {
    path: 'voter/results',
    component: ResultsComponent,
  },
  {
    path: 'voter',
    redirectTo: 'voter/questions',
    pathMatch: 'full'
  },




   // ========== CANDIDATE ROUTES (geschützt) ==========
  {
    path: 'candidate',
    canActivate: [authGuard, candidateGuard],
    children: [
      {
        path: 'profile',
        component: Profile
      },
      {
        path: 'answer-list',
        component: AnswerList
      },
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full'
      }
    ]
  },

   // ========== ADMIN ROUTES (geschützt) ==========
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: 'candidates',
        component: CandidatesManagementComponent
      },
      {
        path: 'lists',
        component: ListmanagementComponent
      },
      {
        path: 'questions',
        component: QuestionManagementComponent
      },
      {
        path:'',
        redirectTo: 'candidates',
        pathMatch:'full'
      }
     ]
    },



  // ========== FALLBACK ==========
  { path: '**',
    component: PageNotFoundComponent
  }


];
