import { Injectable, signal } from '@angular/core';

export interface UserSession {
  user_id: number;
  username: string;
  portefeuilles: Portefeuille[];
}

export interface Portefeuille {
  id: number;
  nom_portefeuille: string;
  solde_especes: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Signals réactifs (équivalent de st.session_state)
  authenticated = signal(false);
  user = signal<UserSession | null>(null);
  selectedPortefeuilleId = signal<number | null>(null);
  selectedPortefeuilleNom = signal<string>('');

  login(userData: any) {
    this.user.set({
      user_id: userData.id,
      username: userData.nom_utilisateur,
      portefeuilles: userData.portefeuilles ?? [],
    });
    this.authenticated.set(true);

    // Sélectionner le premier portefeuille par défaut
    if (userData.portefeuilles?.length > 0) {
      this.selectedPortefeuilleId.set(userData.portefeuilles[0].id);
      this.selectedPortefeuilleNom.set(userData.portefeuilles[0].nom_portefeuille);
    }

    // Persistance locale
    localStorage.setItem('brvm_session', JSON.stringify(this.user()));
  }

  logout() {
    this.authenticated.set(false);
    this.user.set(null);
    this.selectedPortefeuilleId.set(null);
    localStorage.removeItem('brvm_session');
  }

  selectPortefeuille(id: number, nom: string) {
    this.selectedPortefeuilleId.set(id);
    this.selectedPortefeuilleNom.set(nom);
  }

  // Restauration de session au démarrage
  restoreSession() {
    const saved = localStorage.getItem('brvm_session');
    if (saved) {
      const userData = JSON.parse(saved);
      this.user.set(userData);
      this.authenticated.set(true);
      if (userData.portefeuilles?.length > 0) {
        this.selectedPortefeuilleId.set(userData.portefeuilles[0].id);
        this.selectedPortefeuilleNom.set(userData.portefeuilles[0].nom_portefeuille);
      }
    }
  }
}
