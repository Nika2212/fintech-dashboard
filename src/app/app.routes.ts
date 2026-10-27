import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  { path: 'dashboard', title: 'Dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'settings', title: 'Settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
];
