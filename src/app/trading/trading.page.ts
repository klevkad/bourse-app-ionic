import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ApiService } from '../shared/services/api.service';
import { AuthService } from '../shared/services/auth.service';

@Component({
  selector: 'app-trading',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, DecimalPipe],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>🚀 Terminal de Trading</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [(ngModel)]="activeTab">
          <ion-segment-button value="ordre">📈 Ordre</ion-segment-button>
          <ion-segment-button value="historique">📋 Historique</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- ═══ TAB 1 : PASSER UN ORDRE ═══ -->
      <div *ngIf="activeTab === 'ordre'">

        <!-- Résumé compte -->
        <ion-card class="account-card">
          <ion-card-content>
            <div class="account-row">
              <span>💰 Liquidités</span>
              <strong>{{ liquidites() | number:'1.0-0' }} XOF</strong>
            </div>
            <div class="account-row" *ngIf="selectedAction()">
              <span>📊 Cours actuel ({{ form.symbole }})</span>
              <strong>{{ selectedAction()?.dernier_cours | number:'1.0-0' }} XOF</strong>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Formulaire ordre -->
        <ion-card>
          <ion-card-header><ion-card-title>Nouvel Ordre</ion-card-title></ion-card-header>
          <ion-card-content>

            <ion-item>
              <ion-label position="stacked">Action</ion-label>
              <ion-select [(ngModel)]="form.symbole" interface="action-sheet"
                (ionChange)="onActionChange()">
                <ion-select-option *ngFor="let s of stocks()" [value]="s.symbole">
                  {{ s.symbole }} — {{ s.nom_entreprise }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Type d'opération</ion-label>
              <ion-select [(ngModel)]="form.type" interface="action-sheet">
                <ion-select-option value="achat">🟢 Achat</ion-select-option>
                <ion-select-option value="vente">🔴 Vente</ion-select-option>
                <ion-select-option value="dividende">💵 Dividende</ion-select-option>
                <ion-select-option value="appro">💰 Approvisionnement</ion-select-option>
                <ion-select-option value="retrait">🏧 Retrait</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Quantité</ion-label>
              <ion-input type="number" [(ngModel)]="form.quantite" [min]="1"
                (ionChange)="updateFrais()"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Prix unitaire (XOF)</ion-label>
              <ion-input type="number" [(ngModel)]="form.prix"
                (ionChange)="updateFrais()"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Frais de courtage (1%)</ion-label>
              <ion-input type="number" [(ngModel)]="form.frais"></ion-input>
            </ion-item>

            <!-- Récapitulatif -->
            <div class="recap" *ngIf="form.quantite && form.prix">
              <div class="recap-row">
                <span>Montant brut</span>
                <strong>{{ form.quantite * form.prix | number:'1.0-0' }} XOF</strong>
              </div>
              <div class="recap-row">
                <span>Frais</span>
                <strong>{{ form.frais | number:'1.0-0' }} XOF</strong>
              </div>
              <div class="recap-row total">
                <span>Total</span>
                <strong>{{ (form.quantite * form.prix) + form.frais | number:'1.0-0' }} XOF</strong>
              </div>
            </div>

            <ion-button expand="block" class="submit-btn"
              (click)="validerOrdre()" [disabled]="submitting()">
              <ion-spinner *ngIf="submitting()" name="crescent"></ion-spinner>
              <span *ngIf="!submitting()">✅ Valider l'ordre</span>
            </ion-button>

          </ion-card-content>
        </ion-card>
      </div>

      <!-- ═══ TAB 2 : HISTORIQUE ═══ -->
      <div *ngIf="activeTab === 'historique'">
        <div class="loading-container" *ngIf="histLoading()">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>

        <div *ngIf="!histLoading()">
          <ion-searchbar [(ngModel)]="searchTerm" placeholder="Rechercher…" debounce="300"></ion-searchbar>

          <ion-card *ngFor="let t of filteredHistory()" class="tx-card">
            <ion-card-content>
              <div class="tx-header">
                <div>
                  <span class="tx-sym">{{ t.symbole }}</span>
                  <ion-badge [color]="badgeColor(t.type_transaction)" class="tx-type">
                    {{ t.type_transaction | titlecase }}
                  </ion-badge>
                </div>
                <span class="tx-date">{{ t.date_transaction | date:'dd/MM/yy HH:mm' }}</span>
              </div>
              <div class="tx-name">{{ t.nom_entreprise }}</div>
              <div class="tx-grid">
                <div class="tx-kv"><span>Quantité</span><strong>{{ t.quantite | number }}</strong></div>
                <div class="tx-kv"><span>Prix unit.</span><strong>{{ t.prix_unitaire | number:'1.0-0' }} XOF</strong></div>
                <div class="tx-kv"><span>Frais</span><strong>{{ t.frais_courtage | number:'1.0-0' }} XOF</strong></div>
                <div class="tx-kv"><span>Total</span><strong>{{ t.quantite * t.prix_unitaire | number:'1.0-0' }} XOF</strong></div>
              </div>
            </ion-card-content>
          </ion-card>

          <div class="empty-state" *ngIf="filteredHistory().length === 0">
            <ion-icon name="receipt-outline" size="large"></ion-icon>
            <p>Aucune transaction trouvée.</p>
          </div>
        </div>
      </div>

    </ion-content>
  `,
  styles: [`
    .account-card { --background: #f0fdf4; }
    .account-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .recap { background: #f8fafc; border-radius: 10px; padding: 12px; margin: 14px 0; }
    .recap-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
    .recap-row.total { border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 4px; font-size: 15px; color: #1d4ed8; }
    .submit-btn { --border-radius: 12px; margin-top: 8px; height: 48px; font-weight: 600; }
    .tx-card { margin: 4px 0; }
    .tx-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .tx-sym { font-size: 17px; font-weight: 700; margin-right: 8px; }
    .tx-type { font-size: 10px; }
    .tx-date { font-size: 11px; color: #9ca3af; }
    .tx-name { font-size: 12px; color: #6b7280; margin: 3px 0 8px; }
    .tx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .tx-kv { display: flex; flex-direction: column; background: #f9fafb; border-radius: 6px; padding: 6px 8px; }
    .tx-kv span { font-size: 10px; color: #9ca3af; }
    .tx-kv strong { font-size: 12px; }
    .loading-container { display: flex; justify-content: center; padding: 40px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 40px; gap: 12px; color: #9ca3af; }
  `]
})
export class TradingPage implements OnInit {
  private api   = inject(ApiService);
  private auth  = inject(AuthService);
  private toast = inject(ToastController);

  activeTab  = 'ordre';
  searchTerm = '';
  stocks     = signal<any[]>([]);
  coursbrvm = signal<any[]>([]);
  history    = signal<any[]>([]);
  histLoading = signal(false);
  submitting  = signal(false);

  form = { symbole: '', type: 'achat', quantite: 1, prix: 0, frais: 0 };

  liquidites = computed(() =>
    this.auth.user()?.portefeuilles?.find(p => p.id === this.auth.selectedPortefeuilleId())?.solde_especes ?? 0
  );
  selectedAction = computed(() => this.coursbrvm().find(s => { console.log("Selected action:", s); return s[0] === this.form.symbole;return s.Symbole === this.form.symbole;  }));

  filteredHistory = computed(() => {
    const term = this.searchTerm.toLowerCase();
    return term
      ? this.history().filter(t =>
          t.symbole?.toLowerCase().includes(term) ||
          t.nom_entreprise?.toLowerCase().includes(term) ||
          t.type_transaction?.toLowerCase().includes(term))
      : this.history();
  });

  ngOnInit() {
    this.api.getActions().subscribe(s => {
      this.stocks.set(s);
      if (s.length > 0) { this.form.symbole = s[0].symbole; this.form.prix = s[0].dernier_cours ?? 0; this.updateFrais(); }
    });
  this.api.getBrvmCours().subscribe({
    next: (c: any[][]) => {
      console.log("Cours BRVM récupérés :", c);
      const data = c.map((s) => ({
        Symbole: s[0],
        // On garde un type Number, et si s[5] est indéfini ou null, on met 0
        'Cours Clôture (FCFA)': Number(s[5] ?? 0)
      }));
      
      // Mise à jour du Signal Angular
      this.coursbrvm.set(c);
      console.log("Cours BRVM actualisés :", this.coursbrvm());
    },
    error: (err) => {
      console.error("Erreur lors de la récupération des cours BRVM :", err);
    }
  });
    
    this.loadHistory();
  }

  onActionChange() {
    const action = this.selectedAction();
    if (action) { this.form.prix = action[5] ?? 0; this.updateFrais(); }
  }

  updateFrais() {
    this.form.frais = Math.round(this.form.quantite * this.form.prix * 0.01);
  }

  loadHistory() {
    const id = this.auth.selectedPortefeuilleId();
    if (!id) return;
    this.histLoading.set(true);
    this.api.getTransactions(id).subscribe({
      next: (trans) => {
        this.api.getActions().subscribe(stocks => {
          const stockMap = new Map(stocks.map((s: any) => [s.id, s]));
          const enriched = trans.map((t: any) => ({ ...t, ...stockMap.get(t.action_id) }));
          this.history.set(enriched.sort((a: any, b: any) =>
            new Date(b.date_transaction).getTime() - new Date(a.date_transaction).getTime()));
          this.histLoading.set(false);
        });
      },
      error: () => this.histLoading.set(false),
    });
  }

  async validerOrdre() {
    if (!this.form.symbole || !this.form.quantite || !this.form.prix) {
      this.showToast('Veuillez remplir tous les champs.', 'warning'); return;
    }
    const portefeuilleId = this.auth.selectedPortefeuilleId();
    const actionId = this.stocks().find(s => s.symbole === this.form.symbole)?.id;
    if (!portefeuilleId || !actionId) return;

    this.submitting.set(true);
    const payload = {
      portefeuille_id: portefeuilleId,
      action_id: actionId,
      type_transaction: this.form.type,
      quantite: this.form.quantite,
      prix_unitaire: this.form.prix,
      frais_courtage: this.form.frais,
      date_transaction: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    this.api.postTransaction(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showToast('✅ Ordre exécuté avec succès !', 'success');
        this.resetForm();
        this.loadHistory();
      },
      error: (err) => {
        this.submitting.set(false);
        this.showToast(`Erreur : ${err.error?.detail ?? 'Serveur indisponible'}`, 'danger');
      },
    });
  }

  resetForm() { this.form = { symbole: this.stocks()[0]?.symbole ?? '', type: 'achat', quantite: 1, prix: 0, frais: 0 }; }

  badgeColor(type: string) {
    return { achat: 'success', vente: 'danger', dividende: 'primary', appro: 'tertiary', retrait: 'warning' }[type] ?? 'medium';
  }

  async showToast(message: string, color: string) {
    const t = await this.toast.create({ message, color, duration: 2500, position: 'bottom' });
    await t.present();
  }
}
