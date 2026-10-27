import { Type } from '@angular/core';
import { Route } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { SettingsComponent } from './features/settings/settings.component';

function route(path: string): Route {
  return routes.find((item) => item.path === path) as Route;
}

async function load(path: string): Promise<Type<unknown>> {
  return (await route(path).loadComponent?.()) as Type<unknown>;
}

describe('routes', () => {
  it('opens the dashboard by default', () => {
    expect(route('')).toMatchObject({ redirectTo: 'dashboard', pathMatch: 'full' });
  });

  it('titles each page', () => {
    expect(route('dashboard').title).toBe('Dashboard');
    expect(route('settings').title).toBe('Settings');
  });

  it('lazy-loads the dashboard page', async () => {
    expect(await load('dashboard')).toBe(DashboardComponent);
  });

  it('lazy-loads the settings page', async () => {
    expect(await load('settings')).toBe(SettingsComponent);
  });
});
