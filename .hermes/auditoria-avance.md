# Auditoría factual del dataset — Sopa de Letras (JuegaHipHop) — COMPLETA ✅

**Resultado final: 971 → 926 fichas únicas** (45 eliminadas, ~76 corregidas). Build ✅ lint ✅.

## Por categoría

| Categoría | Antes | Después | Eliminadas | Corregidas |
|---|---|---|---|---|
| chile | 140 | 102 | 38 | ~45 |
| djing | 143 | 143 | 0 | 8 |
| graffiti | 119 | 118 | 1 (Ketchup) | 4 |
| mcing | 115 | 113 | 2 (Shino Okan, Doble Portero) | 3 |
| historia | 164 | 163 | 1 (COKE) | 11 |
| produccion | 73 | 73 | 0 | 0 |
| beatbox | 49 | 49 | 0 | 0 |
| cultura | 60 | 60 | 0 | 5 |
| breaking | 108 | 105 | 3 (Enduro, Nautilus, Poyzon) | 0 |

## Eliminadas (45) — no existen / no verificables

**chile (38):** Ácido, Argollo, Axel, B-Noise, Cansado, Chino, Cielo, Emshell, Eskina, Fidel, Guacho, JotaJ, Kolectivo, KVS, Lengua, Machete, Maquetas, Materia Prima, Morbo, Panky, Papafuma, Piñera, Promesas Que Valen, Salchipapa, Santy, Subciudad, Tainy (+ gemelas Familia/Valen/Prima/Puro/Chili), Saga, Ecu, Jotaoza, Frainstrumentos, Recreo, Jesús del Gran Poder
**graffiti (1):** Ketchup
**mcing (2):** Shino Okan, Doble Portero (confusión con Doble Porción)
**historia (1):** COKE (ficha basura generada)
**breaking (3):** Enduro, Nautilus, Poyzon (movimientos inexistentes)

## Correcciones gordas con fuente

- **Vico C**: era "El Padre del Hip Hop Chileno" → **El Padre del Rap Boricua** (error garrafal de generación)
- **Billboard**: Walk This Way llegó al #4 (no #1); primera #1 de rap = Puff Daddy 1997
- **Fergie**: reemplazó a Kim Hill (no Nicole Scherzinger)
- **Nas**: nunca tuvo un álbum "The Game" (Nastradamus es el título real)
- **Hip Hop al Parque**: es el festival de Bogotá, no chileno
- **Jam Master Jay**: caso resuelto en 2024 (condenas a Jordan Jr. y Washington)
- **Golden Age**: Illmatic es de abril 1994, no 1993
- **Cypress Hill**: Bong Appétit es de Viceland, no Netflix
- **Big L**: Children of the Corn era un colectivo, no una tienda
- **Biz Markie**: typo en el título ("Biz Markice")
- **DJ Premier**: se crió en NY, no estudió en Boston
- **Big Pun**: el verso célebre de multisílabas es de Twinz, no Super Lyrical
- **KRB**: sin la mención anacrónica a Residente
- **Adickta Sinfonía**: La Pintana → **Maipú** (el origen de toda la auditoría)

## Categorías limpias (sin cambios)

- **produccion** (73): técnica de estudio toda correcta
- **beatbox** (49): técnicas toda correctas
- **breaking** (98 generated): Enciclopedia HH validada; 3 legacy ficticias eliminadas

## Método

1. Exportar categoría con `.hermes/exportar_auditoria.py <cat>`
2. Leer fichas legacy (las generated de la Enciclopedia ya pasaron validación)
3. Verificar afirmaciones específicas con web_search/web_extract (Chilerap Wiki, Wikipedia, Fandom, prensa, comunidad b-boy)
4. Corregir con scripts `fix_*.py` (write_file + terminal; regex-comodín para evitar escape-drift de backslashes)
5. Verificar `npm run build` + `npm run lint` + related rotos

**Scripts usados:** `fix_djing2/3.py`, `fix_graffiti.py`, `fix_mcing.py`, `fix_mcing2.py`, `fix_historia.py`, `fix_cultura.py`, `fix_breaking.py`
