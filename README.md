# PoE 2 · Runes of Aldur (0.5) — Стартовый капитал

Гайд по фарму и инвестициям на первые две недели лиги Runes of Aldur (патч 0.5, старт 29.05.2026 23:00 МСК).

Структурирован из стрим-материалов **Unstoppable PoE** ([Telegram](https://t.me/unstoppablebtttw) / [Twitch](https://twitch.tv/UnstoppablePoe)), дополнен:
- актуальными ценами с **poe2scout API** (Fate of the Vaal, прошлая лига);
- изменениями патча 0.5 «Return of the Ancients» (Recombination удалён, Runesmithing, Verisium Runeforging, Runic Ward);
- готовыми trade-фильтрами.

## Структура

```
poe2-aldur-startguide/
├── index.html            # одностраничный гайд
├── assets/
│   ├── style.css         # PoE-эстетика (тёмный фон + золото)
│   └── script.js         # навигация, чек-лист, lightbox
├── images/               # 138 скриншотов из исходного гайда
└── README.md
```

## Как открыть

Просто открой `index.html` в браузере двойным кликом. Никакого билда / зависимостей не требуется — это статика.

### Локальный сервер (если хочешь)

```powershell
cd C:\Users\maksim\source\repos\poe2-aldur-startguide
python -m http.server 8000
# открой http://localhost:8000
```

## Разделы

1. **Что нового в 0.5** — критические изменения, ломающие старые стратегии
2. **Pre-League** — чек-лист подготовки за день до старта
3. **Час 0–6: Кампания** — что подбирать, куда бежать
4. **Час 6–24: На карты** — первые подработки (пояса, ALT-снайпинг)
5. **День 2–3: Раскрутка** — перековка ядер/эссенций
6. **День 4–7: Хайп** — продажа запасов, Lineage gems, перековка уникалок
7. **Неделя 2+: Стабильный профит** — осквернение, live-search, крафт синих
8. **Каталог стратегий** — сравнительная таблица 12 методов
9. **Цены: справочник** — реальные данные с poe2scout
10. **Ресурсы и ссылки**
11. **Галерея 138 скриншотов** (с lightbox)

## Что обновить под Aldur

После старта новой лиги (29.05) в готовых trade-фильтрах нужно поменять `Fate%20of%20the%20Vaal` на `Aldur` (или `Runes%20of%20Aldur`, в зависимости от того, какое имя GGG возьмут для URL).

Цены в справочнике — конец прошлой лиги. На старте Aldur они будут в 5–20 раз ниже и подтянутся к таким значениям к 3–4 неделе. Это ориентир «потолка», не «дна».

## Источники

- [poe2scout.com](https://poe2scout.com) — цены, API
- [poe.ninja/poe2/economy](https://poe.ninja/poe2/economy) — Currency Exchange data
- [poe2wiki.net — Version 0.5.0](https://www.poe2wiki.net/wiki/Version_0.5.0)
- Оригинал гайда: [Google Sheets](https://docs.google.com/spreadsheets/d/1R1t2LxBfIxmNtn4_L9-tlBcvQwIVsN5tMuT8f-JNqEg)
