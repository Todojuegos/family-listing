# 🏠 Family Listing

Lista de la compra familiar compartida. Escanea el NFC en la nevera y añade productos.

## Stack
- HTML + CSS + JS Vanilla (sin frameworks)
- [Supabase](https://supabase.com) — PostgreSQL + API en tiempo real
- GitHub Pages — hosting gratuito

## Setup

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el SQL de `supabase-setup.sql` en el SQL Editor
3. Copia tu URL y anon key de Supabase en `app.js` (líneas 3-4)
4. Sube a GitHub y activa GitHub Pages

## Uso
- Escanea la pegatina NFC → se abre la web
- Primera vez: introduce el PIN familiar
- Añade productos, márcalos como comprados, edítalos
- La lista se sincroniza en tiempo real entre todos los dispositivos
