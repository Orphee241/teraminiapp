# Teraminiapp

Mini-app Telegram indépendante de Terainterface. Le dépôt officiel est : https://github.com/Orphee241/teraminiapp

## Coolify

Créer une application depuis le dépôt GitHub `Orphee241/teraminiapp`, branche `main`, avec le **Dockerfile** du dépôt et le port `3000`. La mini-app est un serveur web Next.js : le health check doit viser `/` et non un worker Telegram.

Variables à configurer dans Coolify, sans les committer :

```text
INVOICE_API_URL=https://<adresse-privee-de-l-invoice-api>
INVOICE_API_KEY=<cle-interne-de-l-invoice-api>
MICHELLE_API_URL=https://<url-publique-de-michelle-api>
MICHELLE_API_KEY=<cle-interne-de-michelle-api>
TELEGRAM_BOT_TOKEN=<token-du-bot-utilise-pour-la-mini-app>
MINIAPP_DEV_MODE=false
TURSO_DATABASE_URL=<base-Michelle>
TURSO_AUTH_TOKEN=<token-base-Michelle>
GARAGE_ENDPOINT=<endpoint-S3-Garage>
GARAGE_ACCESS_KEY_ID=<clé-S3>
GARAGE_SECRET_ACCESS_KEY=<secret-S3>
GARAGE_BUCKET=terainterface
GARAGE_REGION=garage
TERAMINI_ADMIN_TELEGRAM_IDS=<identifiants-Telegram-admin-séparés-par-des-virgules>
```

`INVOICE_API_URL` et `INVOICE_API_KEY` sont nécessaires pour créer réellement les devis/factures. Le token Telegram permet de vérifier `initData` côté serveur. Ne jamais exposer ces valeurs dans `NEXT_PUBLIC_*`.

Après configuration :

1. lancer le déploiement Coolify ;
2. vérifier que le conteneur est `running:healthy` ;
3. ouvrir l’URL publique et vérifier la page d’accueil ;
4. vérifier que `POST /api/documents` refuse une requête sans authentification Telegram ;
5. seulement ensuite connecter le bouton Web App dans le bot.

## Local

```bash
npm install
npm run dev
npm run build
npm start
```

La route `/api/documents` relaie les demandes vers le service privé de génération de documents. Elle ne donne pas d’accès direct au navigateur à Turso.

Les conversations persistantes utilisent la base Michelle (`miniapp_conversations` et `miniapp_messages`). Les médias passent par le serveur Next.js puis sont stockés dans le bucket Garage S3 `terainterface`; les clés ne sont jamais envoyées au navigateur. Les routes `/api/conversations`, `/api/media` et `/api/admin/conversations` exigent une authentification Telegram; l’espace administrateur exige en plus `TERAMINI_ADMIN_TELEGRAM_IDS`.
