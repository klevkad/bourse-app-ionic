import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonicModule, RouterModule],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Accueil</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="dashboard" href="/tabs/dashboard">
          <ion-icon name="bar-chart-outline"></ion-icon>
          <ion-label>Dashboard</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="trading" href="/tabs/trading">
          <ion-icon name="trending-up-outline"></ion-icon>
          <ion-label>Trading</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {}
