import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../shared/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>🏠 Accueil</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="logout()">
            <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- Bonjour -->
      <div class="welcome-card">
        <div class="avatar">{{ initial() }}</div>
        <div>
          <h2>Bonjour, <strong>{{ auth.user()?.username }}</strong> 👋</h2>
          <p>Utilisez le menu ci-dessous pour piloter vos investissements.</p>
        </div>
      </div>

      <!-- Sélection portefeuille -->
      <ion-card *ngIf="portefeuilles().length > 0">
        <ion-card-header>
          <ion-card-subtitle>Portefeuille actif</ion-card-subtitle>
          <ion-card-title>{{ auth.selectedPortefeuilleNom() }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-select
            label="Changer de portefeuille"
            labelPlacement="stacked"
            interface="action-sheet"
            [value]="auth.selectedPortefeuilleId()"
            (ionChange)="onSelectPortefeuille($event)">
            <ion-select-option
              *ngFor="let p of portefeuilles()"
              [value]="p.id">
              {{ p.nom_portefeuille }}
            </ion-select-option>
          </ion-select>

          <!-- Liquidités du portefeuille sélectionné -->
          <div class="liquidity" *ngIf="selectedPortefeuille()">
            <span class="liq-label">💰 Liquidités disponibles</span>
            <span class="liq-value">
              {{ selectedPortefeuille()!.solde_especes | number:'1.0-0' }} XOF
            </span>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card *ngIf="portefeuilles().length === 0">
        <ion-card-content>
          <ion-text color="medium">Aucun portefeuille trouvé pour ce compte.</ion-text>
        </ion-card-content>
      </ion-card>

      <!-- Raccourcis -->
      <div class="shortcuts">
        <ion-button expand="block" routerLink="/tabs/dashboard" fill="solid">
          <ion-icon name="bar-chart-outline" slot="start"></ion-icon>
          Voir le Dashboard
        </ion-button>
        <ion-button expand="block" routerLink="/tabs/trading" fill="outline">
          <ion-icon name="trending-up-outline" slot="start"></ion-icon>
          Terminal de Trading
        </ion-button>
      </div>

    </ion-content>
  `,
  styles: [`
    .welcome-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--ion-color-primary); border-radius: 16px; color: white; margin-bottom: 16px; }
    .avatar { width: 52px; height: 52px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; flex-shrink: 0; }
    .welcome-card h2 { margin: 0 0 4px; font-size: 16px; }
    .welcome-card p { margin: 0; font-size: 13px; opacity: 0.85; }
    .liquidity { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding: 12px; background: #f0fdf4; border-radius: 10px; }
    .liq-label { font-size: 13px; color: #374151; }
    .liq-value { font-size: 15px; font-weight: 600; color: #16a34a; }
    .shortcuts { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
  `]
})
export class HomePage {
  portefeuilles = computed(() => this.auth.user()?.portefeuilles ?? []);
  initial = computed(() => (this.auth.user()?.username?.[0] ?? '?').toUpperCase());
  selectedPortefeuille = computed(() =>
    this.portefeuilles().find(p => p.id === this.auth.selectedPortefeuilleId()) ?? null
  );

  constructor(public auth: AuthService) {}

  onSelectPortefeuille(event: any) {
    const id = event.detail.value;
    const p = this.portefeuilles().find(p => p.id === id);
    if (p) this.auth.selectPortefeuille(p.id, p.nom_portefeuille);
  }

  logout() { this.auth.logout(); }
}
