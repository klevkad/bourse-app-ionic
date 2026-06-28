# BRVM Invest — Application Ionic

Application mobile/web de gestion de portefeuille BRVM, convertie depuis Streamlit vers Ionic + Angular.

## Architecture

```
src/app/
├── auth/
│   └── login.page.ts          # Écran de connexion (= connexion_function.py)
├── dashboard/
│   ├── home.page.ts            # Accueil + sélection portefeuille (= afficher_accueil())
│   └── dashboard.page.ts       # Analyse complète (= Dashboard.py)
├── trading/
│   └── trading.page.ts         # Terminal de trading (= Trading.py)
├── tabs/
│   └── tabs.page.ts            # Navigation par onglets
└── shared/
    ├── services/
    │   ├── api.service.ts       # Tous les appels HTTP (= requests.get/post)
    │   ├── auth.service.ts      # Session utilisateur (= st.session_state)
    │   └── portfolio.service.ts # Calculs portefeuille + indicateurs (= compute_indicators, generate_signals)
    └── guards/
        └── auth.guard.ts        # Protection des routes (= if not authenticated)
```

## Correspondance Streamlit → Ionic

| Streamlit                    | Ionic / Angular               |
|------------------------------|-------------------------------|
| `st.session_state`           | `AuthService` (signals)       |
| `@st.cache_data`             | `forkJoin` + signal           |
| `st.metric()`                | Cards métriques HTML/CSS      |
| `st.selectbox()`             | `<ion-select>`                |
| `st.dataframe()`             | Cards `*ngFor`                |
| `st.success/warning/error()` | `<ion-card [color]>`          |
| `st.button()`                | `<ion-button>`                |
| `st.spinner()`               | `<ion-spinner>`               |
| `st.rerun()`                 | `router.navigate()`           |
| Navigation pages             | `ion-tabs` + `ion-tab-bar`    |

## Installation

```bash
# 1. Installer Ionic CLI
npm install -g @ionic/cli

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
ionic serve

# 4. Build production
ionic build --prod

# 5. Déployer sur mobile (iOS/Android)
ionic cap add android
ionic cap add ios
ionic cap sync
ionic cap open android  # Ouvre Android Studio
ionic cap open ios      # Ouvre Xcode
```

## Point important : Scraping BRVM

Le scraping BeautifulSoup (cours temps réel) ne peut **pas** s'exécuter dans le navigateur.
Il faut le déplacer dans votre **backend FastAPI** :

```python
# À ajouter dans votre backend bourse-app-backend
@app.get("/brvm/cours")
def get_cours_brvm():
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get("https://www.brvm.org/fr/cours-actions/0", headers=headers, verify=False)
    # ... parsing BeautifulSoup ...
    return data
```

Puis dans `api.service.ts` :
```typescript
getBrvmQuotes(): Observable<any[]> {
  return this.http.get<any[]>(`${API_URL}/brvm/cours`);
}
```
