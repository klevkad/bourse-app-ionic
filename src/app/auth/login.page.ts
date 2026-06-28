import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { ApiService } from '../shared/services/api.service';
import { AuthService } from '../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-content class="login-content">
      <div class="login-container">

        <div class="login-header">
          <div class="logo">🏦</div>
          <h1>BRVM Invest</h1>
          <p>Gérez votre portefeuille BRVM</p>
        </div>

        <div class="login-card">
          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Email</ion-label>
            <ion-input
              type="email"
              [(ngModel)]="email"
              placeholder="utilisateur@example.com"
              autocomplete="email">
            </ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Mot de passe</ion-label>
            <ion-input
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="password"
              placeholder="••••••••">
            </ion-input>
            <ion-button fill="clear" slot="end" (click)="showPassword.set(!showPassword())">
              <ion-icon [name]="showPassword() ? 'eye-off' : 'eye'" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-item>

          <ion-button expand="block" class="login-btn" (click)="onLogin()" [disabled]="loading()">
            <ion-spinner *ngIf="loading()" name="crescent"></ion-spinner>
            <span *ngIf="!loading()">Se connecter</span>
          </ion-button>

          <div class="error-msg" *ngIf="errorMsg()">
            <ion-icon name="alert-circle"></ion-icon>
            {{ errorMsg() }}
          </div>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .login-content { --background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); }
    .login-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .login-header { text-align: center; margin-bottom: 32px; color: white; }
    .logo { font-size: 56px; margin-bottom: 12px; }
    .login-header h1 { font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
    .login-header p { font-size: 14px; opacity: 0.7; margin-top: 6px; }
    .login-card { background: white; border-radius: 20px; padding: 28px 20px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .input-item { --background: #f8fafc; --border-radius: 10px; margin-bottom: 14px; --padding-start: 14px; }
    .login-btn { --border-radius: 12px; margin-top: 20px; height: 50px; font-size: 16px; font-weight: 600; --background: #1e3a5f; }
    .error-msg { display: flex; align-items: center; gap: 8px; color: #dc2626; font-size: 13px; margin-top: 14px; padding: 10px; background: #fef2f2; border-radius: 8px; }
  `]
})
export class LoginPage {
  email = '';
  password = '';
  loading  = signal(false);
  showPassword = signal(false);
  errorMsg = signal('');

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  onLogin() {
    if (!this.email || !this.password) {
      this.errorMsg.set('Veuillez remplir tous les champs.');
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    this.api.login(this.email, this.password).subscribe({
      next: (data) => {
        this.auth.login(data);
        this.loading.set(false);
        this.router.navigate(['/tabs/home']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401 || err.status === 404)
          this.errorMsg.set('Email ou mot de passe incorrect.');
        else if (err.status === 0)
          this.errorMsg.set("Impossible de joindre le serveur.");
        else
          this.errorMsg.set(`Erreur serveur (${err.status})`);
      }
    });
  }
}
