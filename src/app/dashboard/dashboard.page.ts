import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, RefresherEventDetail } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { ApiService } from '../shared/services/api.service';
import { AuthService } from '../shared/services/auth.service';
import { PortfolioService, PortfolioRow, PortfolioIndicators, Signal } from '../shared/services/portfolio.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>📈 Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="load()">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- LOADING -->
      <div class="loading-container" *ngIf="loading()">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Chargement du portefeuille…</p>
      </div>

      <div *ngIf="!loading() && ind()">

        <!-- ═══ SECTION 1 : MÉTRIQUES GLOBALES ═══ -->
        <div class="section-title">Vue d'ensemble</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="m-label">💰 Liquidités</span>
            <span class="m-value">{{ liquidites() | number:'1.0-0' }} <small>XOF</small></span>
          </div>
          <div class="metric-card">
            <span class="m-label">💵 Valeur totale</span>
            <span class="m-value">{{ ind()!.total_val | number:'1.0-0' }} <small>XOF</small></span>
          </div>
          <div class="metric-card">
            <span class="m-label">📥 Dividendes</span>
            <span class="m-value">{{ totalDividendes() | number:'1.0-0' }} <small>XOF</small></span>
          </div>
          <div class="metric-card" [class.positive]="ind()!.total_pv >= 0" [class.negative]="ind()!.total_pv < 0">
            <span class="m-label">💹 Plus-Value</span>
            <span class="m-value">{{ ind()!.total_pv | number:'1.0-0' }} <small>XOF</small></span>
            <span class="m-delta" [class.green]="ind()!.total_pv_pct >= 0" [class.red]="ind()!.total_pv_pct < 0">
              {{ ind()!.total_pv_pct | number:'1.2-2' }}%
            </span>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <span class="m-label">📊 Rendement total</span>
            <span class="m-value" [class.green]="ind()!.rendement_total >= 0" [class.red]="ind()!.rendement_total < 0">
              {{ ind()!.rendement_total > 0 ? '+' : '' }}{{ ind()!.rendement_total | number:'1.2-2' }}%
            </span>
          </div>
          <div class="metric-card">
            <span class="m-label">🏆 Meilleur titre</span>
            <span class="m-value green">{{ ind()!.best_symbole }}</span>
            <span class="m-delta green">{{ ind()!.best_pct > 0 ? '+' : '' }}{{ ind()!.best_pct | number:'1.1-1' }}%</span>
          </div>
          <div class="metric-card">
            <span class="m-label">📉 Moins bon titre</span>
            <span class="m-value red">{{ ind()!.worst_symbole }}</span>
            <span class="m-delta red">{{ ind()!.worst_pct | number:'1.1-1' }}%</span>
          </div>
          <div class="metric-card">
            <span class="m-label">⚖️ Ratio gain/perte</span>
            <span class="m-value">{{ ind()!.ratio_gain_perte === Infinity ? '∞' : (ind()!.ratio_gain_perte | number:'1.2-2') }}x</span>
          </div>
        </div>

        <!-- ═══ SECTION 2 : JAUGES ═══ -->
        <div class="section-title">Indicateurs de performance</div>
        <div class="gauges-row">

          <div class="gauge-card">
            <div class="gauge-label">Diversification</div>
            <div class="gauge-ring" [style.--pct]="ind()!.diversification_score + '%'"
              [class.gauge-green]="ind()!.diversification_score >= 66"
              [class.gauge-orange]="ind()!.diversification_score >= 33 && ind()!.diversification_score < 66"
              [class.gauge-red]="ind()!.diversification_score < 33">
              <span class="gauge-value">{{ ind()!.diversification_score }}<small>/100</small></span>
            </div>
            <div class="gauge-sub">{{ ind()!.n_positif }} ↑ / {{ ind()!.n_negatif }} ↓</div>
          </div>

          <div class="gauge-card">
            <div class="gauge-label">Performance vs BRVM</div>
            <div class="gauge-ring" [style.--pct]="normalizePerf() + '%'"
              [class.gauge-green]="normalizePerf() >= 66"
              [class.gauge-orange]="normalizePerf() >= 33 && normalizePerf() < 66"
              [class.gauge-red]="normalizePerf() < 33">
              <span class="gauge-value">{{ ind()!.total_pv_pct > 0 ? '+' : '' }}{{ ind()!.total_pv_pct | number:'1.1-1' }}<small>%</small></span>
            </div>
            <div class="gauge-sub">Benchmark BRVM : 8%</div>
          </div>

          <div class="gauge-card">
            <div class="gauge-label">VaR –10%</div>
            <div class="var-box">
              <span class="var-value">{{ ind()!.var_10 | number:'1.0-0' }}</span>
              <span class="var-unit">XOF</span>
            </div>
            <div class="gauge-sub">Perte si marché –10%</div>
          </div>

        </div>

        <!-- ═══ SECTION 3 : RÉPARTITION SECTORIELLE ═══ -->
        <div class="section-title">Répartition sectorielle</div>
        <ion-card class="sector-card">
          <ion-card-content>
            <div class="sector-row" *ngFor="let s of ind()!.secteur_poids">
              <span class="sector-name">{{ s.secteur }}</span>
              <div class="sector-bar-bg">
                <div class="sector-bar-fill" [style.width]="s.poids + '%'"
                  [class.dominant]="s.secteur === ind()!.secteur_dominant"></div>
              </div>
              <span class="sector-pct">{{ s.poids }}%</span>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- ═══ SECTION 4 : SIGNAUX ═══ -->
        <div class="section-title">🚦 Signaux d'alerte</div>
        <div *ngFor="let s of signals()">
          <ion-card [color]="s.type === 'success' ? 'success' : s.type === 'warning' ? 'warning' : 'danger'" class="signal-card">
            <ion-card-content>
              <strong>{{ s.icon }} {{ s.titre }}</strong>
              <p>{{ s.detail }}</p>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- ═══ SECTION 5 : TABLEAU POSITIONS ═══ -->
        <div class="section-title">🗒️ Positions détaillées</div>
        <ion-card *ngFor="let r of rows()" class="position-card">
          <ion-card-content>
            <div class="pos-header">
              <div>
                <span class="pos-sym">{{ r.symbole }}</span>
                <ion-badge [color]="r.pv_pct >= 0 ? 'success' : 'danger'" class="pos-badge">
                  {{ r.pv_pct > 0 ? '+' : '' }}{{ r.pv_pct | number:'1.1-1' }}%
                </ion-badge>
              </div>
              <span class="pos-weight">{{ r.poids_pct | number:'1.1-1' }}%</span>
            </div>
            <div class="pos-name">{{ r.nom_entreprise }}</div>
            <div class="pos-sub">{{ r.secteur }}</div>
            <div class="pos-grid">
              <div class="pos-kv"><span>Quantité</span><strong>{{ r.current_qty | number }}</strong></div>
              <div class="pos-kv"><span>CMP</span><strong>{{ r.CMP | number:'1.0-0' }} XOF</strong></div>
              <div class="pos-kv"><span>Prix marché</span><strong>{{ r.prix_marche | number:'1.0-0' }} XOF</strong></div>
              <div class="pos-kv"><span>Investi</span><strong>{{ r.investissement | number:'1.0-0' }} XOF</strong></div>
              <div class="pos-kv"><span>Valeur actuelle</span><strong>{{ r.valeur_actuelle | number:'1.0-0' }} XOF</strong></div>
              <div class="pos-kv">
                <span>Plus-value</span>
                <strong [class.green]="r.pv_abs >= 0" [class.red]="r.pv_abs < 0">
                  {{ r.pv_abs > 0 ? '+' : '' }}{{ r.pv_abs | number:'1.0-0' }} XOF
                </strong>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

      </div>

      <!-- EMPTY STATE -->
      <div class="empty-state" *ngIf="!loading() && rows().length === 0">
        <ion-icon name="wallet-outline" size="large"></ion-icon>
        <p>Aucune position. Effectuez votre première transaction.</p>
        <ion-button routerLink="/tabs/trading" fill="outline">Aller au Trading</ion-button>
      </div>

    </ion-content>
  `,
  styles: [`
    .section-title { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; padding: 16px 16px 6px; }
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 12px 4px; }
    .metric-card { background: white; border-radius: 14px; padding: 14px; box-shadow: 0 1px 6px rgba(0,0,0,.07); display: flex; flex-direction: column; gap: 2px; }
    .m-label { font-size: 11px; color: #9ca3af; }
    .m-value { font-size: 16px; font-weight: 600; color: #111827; }
    .m-value small { font-size: 10px; font-weight: 400; color: #6b7280; }
    .m-delta { font-size: 12px; font-weight: 600; }
    .green { color: #16a34a !important; }
    .red   { color: #dc2626 !important; }

    /* Jauges */
    .gauges-row { display: flex; gap: 10px; padding: 0 12px 4px; overflow-x: auto; }
    .gauge-card { background: white; border-radius: 14px; padding: 16px 14px; min-width: 130px; flex: 1; box-shadow: 0 1px 6px rgba(0,0,0,.07); text-align: center; }
    .gauge-label { font-size: 11px; color: #6b7280; margin-bottom: 10px; }
    .gauge-ring {
      width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 8px;
      display: flex; align-items: center; justify-content: center;
      background: conic-gradient(currentColor var(--pct), #f3f4f6 var(--pct));
      position: relative;
    }
    .gauge-ring::after { content: ''; position: absolute; width: 58px; height: 58px; border-radius: 50%; background: white; }
    .gauge-value { position: relative; z-index: 1; font-size: 15px; font-weight: 700; color: #111827; }
    .gauge-value small { font-size: 9px; font-weight: 400; }
    .gauge-green { color: #22c55e; }
    .gauge-orange { color: #f59e0b; }
    .gauge-red { color: #ef4444; }
    .gauge-sub { font-size: 10px; color: #9ca3af; }
    .var-box { display: flex; flex-direction: column; align-items: center; padding: 12px 0; }
    .var-value { font-size: 18px; font-weight: 700; color: #ef4444; }
    .var-unit { font-size: 11px; color: #9ca3af; }

    /* Secteurs */
    .sector-card { margin: 0 12px; }
    .sector-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .sector-name { font-size: 12px; width: 110px; flex-shrink: 0; color: #374151; }
    .sector-bar-bg { flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
    .sector-bar-fill { height: 100%; background: #93c5fd; border-radius: 4px; transition: width .4s; }
    .sector-bar-fill.dominant { background: #1d4ed8; }
    .sector-pct { font-size: 12px; font-weight: 600; color: #374151; width: 38px; text-align: right; }

    /* Signaux */
    .signal-card { margin: 4px 12px; }
    .signal-card p { margin: 4px 0 0; font-size: 13px; }

    /* Positions */
    .position-card { margin: 4px 12px; }
    .pos-header { display: flex; justify-content: space-between; align-items: center; }
    .pos-sym { font-size: 18px; font-weight: 700; color: #111827; margin-right: 8px; }
    .pos-badge { font-size: 11px; }
    .pos-weight { font-size: 13px; color: #6b7280; font-weight: 500; }
    .pos-name { font-size: 13px; color: #374151; margin-top: 2px; }
    .pos-sub { font-size: 11px; color: #9ca3af; margin-bottom: 10px; }
    .pos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .pos-kv { display: flex; flex-direction: column; background: #f9fafb; border-radius: 8px; padding: 8px; }
    .pos-kv span { font-size: 10px; color: #9ca3af; }
    .pos-kv strong { font-size: 13px; color: #111827; }

    .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; gap: 14px; color: #6b7280; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; gap: 14px; text-align: center; color: #9ca3af; padding: 24px; }
  `]
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);
  private ps  = inject(PortfolioService);

  loading   = signal(true);
  rows      = signal<PortfolioRow[]>([]);
  ind       = signal<PortfolioIndicators | null>(null);
  signals   = signal<Signal[]>([]);
  totalDividendes = signal(0);
  Infinity  = Infinity;

  liquidites = computed(() =>
    this.auth.user()?.portefeuilles?.find(p => p.id === this.auth.selectedPortefeuilleId())?.solde_especes ?? 0
  );

  normalizePerf = computed(() =>
    this.ind() ? this.ps.normalizePerf(this.ind()!.total_pv_pct) : 50
  );

  ngOnInit() { this.load(); }

  load() {
    const portefeuilleId = this.auth.selectedPortefeuilleId();
    if (!portefeuilleId) { this.loading.set(false); return; }

    this.loading.set(true);
    forkJoin({
      transactions: this.api.getTransactions(portefeuilleId),
      stocks: this.api.getActions(),
      quotes: this.api.getAllTransactions(), // remplacé par scraping côté backend idéalement
    }).subscribe({
      next: ({ transactions, stocks, quotes }) => {
        // Note: quotes BRVM idéalement via un endpoint backend dédié
        // Pour l'instant, on utilise dernier_cours de stocks
        const syntheticQuotes = quotes.map((s: any) => ({
          Symbole: s.symbole,
          'Cours Clôture (FCFA)': String(s.dernier_cours ?? 0),
        }));

        const divTotal = this.ps.totalDividendes(transactions);
        this.totalDividendes.set(divTotal);

        const portfolio = this.ps.buildPortfolio(transactions, stocks, quotes);
        this.rows.set(portfolio);

        if (portfolio.length > 0) {
          const indicators = this.ps.computeIndicators(portfolio, divTotal);
          this.ind.set(indicators);
          this.signals.set(this.ps.generateSignals(indicators, portfolio));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onRefresh(event: CustomEvent<RefresherEventDetail>) {
    this.load();
    setTimeout(() => event.detail.complete(), 1500);
  }
}
