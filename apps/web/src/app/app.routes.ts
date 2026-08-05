import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/setup', pathMatch: 'full' },
  {
    path: 'setup',
    loadComponent: () => import('./pages/setup/setup.component').then((m) => m.SetupComponent),
  },
  {
    path: 'questions',
    loadComponent: () => import('./pages/questions/questions.component').then((m) => m.QuestionsComponent),
  },
  {
    path: 'normalize',
    loadComponent: () => import('./pages/normalize/normalize.component').then((m) => m.NormalizeComponent),
  },
  {
    path: 'merge',
    loadComponent: () => import('./pages/merge/merge.component').then((m) => m.MergeComponent),
  },
  {
    path: 'score/:classId',
    loadComponent: () => import('./pages/score/score.component').then((m) => m.ScoreComponent),
  },
  {
    path: 'stats/:classId',
    loadComponent: () => import('./pages/stats/stats.component').then((m) => m.StatsComponent),
  },
  {
    path: 'review/:classId/:reviewId/:teamId',
    loadComponent: () => import('./pages/review/review.component').then((m) => m.ReviewComponent),
  },
];
