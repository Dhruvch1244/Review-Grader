import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home-redirect/home-redirect.component').then((m) => m.HomeRedirectComponent),
  },
  {
    path: 'setup',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/setup/setup.component').then((m) => m.SetupComponent),
  },
  {
    path: 'scoring',
    loadComponent: () => import('./pages/scoring-home/scoring-home.component').then((m) => m.ScoringHomeComponent),
  },
  {
    path: 'reviews',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/review-sections/review-sections.component').then((m) => m.ReviewSectionsComponent),
  },
  {
    path: 'reviewers',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/reviewers/reviewers.component').then((m) => m.ReviewersComponent),
  },
  {
    path: 'normalize',
    loadComponent: () => import('./pages/normalize/normalize.component').then((m) => m.NormalizeComponent),
  },
  {
    path: 'merge',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/merge/merge.component').then((m) => m.MergeComponent),
  },
  {
    path: 'database',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/db-viewer/db-viewer.component').then((m) => m.DbViewerComponent),
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
