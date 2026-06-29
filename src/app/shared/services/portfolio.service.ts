import { Injectable } from '@angular/core';

export interface PortfolioRow {
  symbole: string;
  nom_entreprise: string;
  secteur: string;
  current_qty: number;
  CMP: number;
  investissement: number;
  valeur_actuelle: number;
  prix_marche: number;
  pv_marche: number;
  pv_abs: number;
  pv_pct: number;
  poids_pct: number;
}

export interface PortfolioIndicators {
  total_inv: number;
  total_val: number;
  total_pv: number;
  total_pv_pct: number;
  rendement_total: number;
  diversification_score: number;
  hhi: number;
  best_symbole: string;
  best_pct: number;
  worst_symbole: string;
  worst_pct: number;
  secteur_dominant: string;
  secteur_dominant_pct: number;
  n_positif: number;
  n_negatif: number;
  var_10: number;
  ratio_gain_perte: number;
  heaviest_symbole: string;
  heaviest_pct: number;
  secteur_poids: { secteur: string; poids: number }[];
}

export interface Signal {
  type: 'success' | 'warning' | 'danger';
  icon: string;
  titre: string;
  detail: string;
}

const BENCHMARK = 8.0; // rendement moyen BRVM %

@Injectable({ providedIn: 'root' })
export class PortfolioService {

  /**
   * Reconstitue le portefeuille à partir des transactions brutes.
   * Équivalent du bloc "CALCUL DU PORTFOLIO" dans Dashboard.py
   */
  buildPortfolio(transactions: any[], stocks: any[], quotes: any[]): PortfolioRow[] {
    // A. Achats uniquement → CMP
    const buys = transactions.filter(t => t.type_transaction?.trim().toLowerCase() === 'achat');
    const buyMap = new Map<number, { qty: number; cost: number }>();
    for (const b of buys) {
      const prev = buyMap.get(b.action_id) ?? { qty: 0, cost: 0 };
      buyMap.set(b.action_id, {
        qty: prev.qty + b.quantite,
        cost: prev.cost + b.quantite * b.prix_unitaire + b.frais_courtage,
      });
    }
  

    // B. Ventes → quantité nette
    const sells = transactions.filter(t => t.type_transaction?.trim().toLowerCase() === 'vente');
    const sellMap = new Map<number, number>();
    for (const s of sells) {
      sellMap.set(s.action_id, (sellMap.get(s.action_id) ?? 0) + s.quantite);
    }

    // C. Cours du marché (depuis quotes BRVM)
    const quoteMap = new Map<string, number>();
    for (const q of quotes) {
      const cours = parseFloat(String(q[5] ?? '').replace(/\s/g, ''));
      if (!isNaN(cours)) quoteMap.set(q[0], cours);
    }

    // D. Infos actions
    const stockMap = new Map<number, any>();
    for (const s of stocks) stockMap.set(s.id, s);

    // E. Construction des lignes
    const rows: PortfolioRow[] = [];
    let totalVal = 0;

    for (const [actionId, { qty, cost }] of buyMap) {
      const soldQty = sellMap.get(actionId) ?? 0;
      const currentQty = qty - soldQty;
      if (currentQty <= 0) continue;

      const stock = stockMap.get(actionId);
      if (!stock) continue;

      const CMP = cost / qty;
      const prixMarche = quoteMap.get(stock.symbole) ?? CMP;
      const investissement = currentQty * CMP;
      const valeurActuelle = currentQty * prixMarche;
      const pvAbs = valeurActuelle - investissement;
      const pvPct = investissement > 0 ? (pvAbs / investissement) * 100 : 0;
      totalVal += valeurActuelle;

      rows.push({
        symbole: stock.symbole,
        nom_entreprise: stock.nom_entreprise,
        secteur: stock.secteur,
        current_qty: currentQty,
        CMP,
        investissement,
        valeur_actuelle: valeurActuelle,
        prix_marche: prixMarche,
        pv_marche: prixMarche - CMP,
        pv_abs: pvAbs,
        pv_pct: pvPct,
        poids_pct: 0, // calculé après
      });
    }

    // Poids
    for (const r of rows) r.poids_pct = totalVal > 0 ? (r.valeur_actuelle / totalVal) * 100 : 0;
    return rows;
  }

  /**
   * Calcule les indicateurs avancés. Équivalent de compute_indicators()
   */
  computeIndicators(rows: PortfolioRow[], totalDividendes: number): PortfolioIndicators {
    const totalInv = rows.reduce((s, r) => s + r.investissement, 0);
    const totalVal = rows.reduce((s, r) => s + r.valeur_actuelle, 0);
    const totalPv  = rows.reduce((s, r) => s + r.pv_abs, 0);
    const totalPvPct = totalInv > 0 ? (totalPv / totalInv) * 100 : 0;
    const rendementTotal = totalInv > 0 ? ((totalPv + totalDividendes) / totalInv) * 100 : 0;

    // HHI
    const hhi = rows.reduce((s, r) => s + Math.pow(r.valeur_actuelle / totalVal, 2), 0);
    const diversificationScore = Math.round((1 - hhi) * 1000) / 10;

    // Best / worst
    const sorted = [...rows].sort((a, b) => b.pv_pct - a.pv_pct);
    const best  = sorted[0];
    const worst = sorted[sorted.length - 1];

    // Secteurs
    const secteurMap = new Map<string, number>();
    for (const r of rows) secteurMap.set(r.secteur, (secteurMap.get(r.secteur) ?? 0) + r.valeur_actuelle);
    const secteurPoids = Array.from(secteurMap.entries())
      .map(([secteur, val]) => ({ secteur, poids: Math.round((val / totalVal) * 1000) / 10 }))
      .sort((a, b) => b.poids - a.poids);
    const dominant = secteurPoids[0];

    // Gains / pertes
    const gains  = rows.filter(r => r.pv_abs > 0).reduce((s, r) => s + r.pv_abs, 0);
    const pertes = Math.abs(rows.filter(r => r.pv_abs <= 0).reduce((s, r) => s + r.pv_abs, 0));
    const ratioGainPerte = pertes > 0 ? Math.round((gains / pertes) * 100) / 100 : Infinity;

    // Titre le plus lourd
    const heaviest = rows.reduce((a, b) => a.valeur_actuelle > b.valeur_actuelle ? a : b);

    return {
      total_inv: totalInv,
      total_val: totalVal,
      total_pv: totalPv,
      total_pv_pct: totalPvPct,
      rendement_total: rendementTotal,
      diversification_score: diversificationScore,
      hhi,
      best_symbole: best?.symbole ?? '-',
      best_pct: best?.pv_pct ?? 0,
      worst_symbole: worst?.symbole ?? '-',
      worst_pct: worst?.pv_pct ?? 0,
      secteur_dominant: dominant?.secteur ?? '-',
      secteur_dominant_pct: dominant?.poids ?? 0,
      n_positif: rows.filter(r => r.pv_pct > 0).length,
      n_negatif: rows.filter(r => r.pv_pct <= 0).length,
      var_10: totalVal * 0.10,
      ratio_gain_perte: ratioGainPerte,
      heaviest_symbole: heaviest?.symbole ?? '-',
      heaviest_pct: Math.round(heaviest?.poids_pct * 10) / 10,
      secteur_poids: secteurPoids,
    };
  }

  /** Équivalent de generate_signals() */
  generateSignals(ind: PortfolioIndicators, rows: PortfolioRow[]): Signal[] {
    const signals: Signal[] = [];

    if (ind.secteur_dominant_pct > 50)
      signals.push({ type: 'warning', icon: '⚠️',
        titre: `Concentration sectorielle (${ind.secteur_dominant})`,
        detail: `${ind.secteur_dominant} représente ${ind.secteur_dominant_pct.toFixed(1)}% du portefeuille. Un choc sectoriel impacterait lourdement vos actifs.` });

    if (ind.heaviest_pct > 30)
      signals.push({ type: 'warning', icon: '⚠️',
        titre: `Sur-pondération de ${ind.heaviest_symbole}`,
        detail: `${ind.heaviest_symbole} représente ${ind.heaviest_pct}% du portefeuille. Envisagez de rééquilibrer.` });

    if (ind.diversification_score < 50)
      signals.push({ type: 'danger', icon: '🔴',
        titre: 'Diversification insuffisante',
        detail: `Score : ${ind.diversification_score}/100. Moins de 5 titres décorrélés génèrent un risque élevé.` });
    else if (ind.diversification_score >= 70)
      signals.push({ type: 'success', icon: '🟢',
        titre: 'Bonne diversification',
        detail: `Score : ${ind.diversification_score}/100. Votre portefeuille est bien réparti.` });

    if (ind.rendement_total > 15)
      signals.push({ type: 'success', icon: '🟢',
        titre: 'Rendement total solide',
        detail: `+${ind.rendement_total.toFixed(1)}% dividendes inclus. Performance au-dessus de la moyenne BRVM.` });
    else if (ind.rendement_total < 0)
      signals.push({ type: 'danger', icon: '🔴',
        titre: 'Rendement global négatif',
        detail: `${ind.rendement_total.toFixed(1)}%. Vérifiez vos positions les plus perdantes.` });

    for (const r of rows.filter(r => r.pv_pct < -10))
      signals.push({ type: 'danger', icon: '🔴',
        titre: `${r.symbole} en forte moins-value`,
        detail: `${r.symbole} affiche ${r.pv_pct.toFixed(1)}%. Vérifiez les fondamentaux avant de renforcer.` });

    return signals;
  }

  /** Performance normalisée pour la jauge (centrée sur le benchmark) */
  normalizePerf(pct: number): number {
    return Math.min(Math.max(pct - BENCHMARK + 50, 0), 100);
  }

  totalDividendes(transactions: any[]): number {
    return transactions
      .filter(t => t.type_transaction?.trim().toLowerCase() === 'dividende')
      .reduce((s, t) => s + t.prix_unitaire, 0);
  }
}
