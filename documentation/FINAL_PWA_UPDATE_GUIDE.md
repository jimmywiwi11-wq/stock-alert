# Final PWA Update Guide

Version:
- App/version label: `V7.75`
- `version.json`: `7.75`
- Service worker cache: `stock-alert-v7_75-final-uat`

Update behavior:
- Service worker does not call `skipWaiting`.
- Existing update prompt remains user-driven.
- User must choose update now before the new version replaces the current app shell.
- LocalStorage and IndexedDB are not cleared automatically.

Tax Invoice iframe safety:
- Requests under `/desktop/tax-invoice/` are not replaced by `index.html`.
