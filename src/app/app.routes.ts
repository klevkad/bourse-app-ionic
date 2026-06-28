// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login.page').then(m => m.LoginPage),
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      { path: 'home',      loadComponent: () => import('./dashboard/home.page').then(m => m.HomePage) },
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.page').then(m => m.DashboardPage) },
      { path: 'trading',   loadComponent: () => import('./trading/trading.page').then(m => m.TradingPage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
