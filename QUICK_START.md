# 🚀 QUICK START - Быстрый запуск

## ⚡ За 2 минуты

### Шаг 1: Frontend
```bash
cd frontend
npm install
npm run dev
```
→ http://localhost:5173

### Шаг 2: Backend (в новом терминале)
```bash
cd backend
docker-compose up -d
```

### Шаг 3: Открыть браузер
```
http://localhostUncaught ReferenceError: legendRef is not defined
    at ref (MapView.tsx:333:30)
    at commitAttachRef (chunk-VKLKESE7.js?v=5a171ad1:17279:28)
    at commitLayoutEffectOnFiber (chunk-VKLKESE7.js?v=5a171ad1:17168:17)
    at commitLayoutMountEffects_complete (chunk-VKLKESE7.js?v=5a171ad1:17980:17)
    at commitLayoutEffects_begin (chunk-VKLKESE7.js?v=5a171ad1:17969:15)
    at commitLayoutEffects (chunk-VKLKESE7.js?v=5a171ad1:17920:11)
    at commitRootImpl (chunk-VKLKESE7.js?v=5a171ad1:19353:13)
    at commitRoot (chunk-VKLKESE7.js?v=5a171ad1:19277:13)
    at finishConcurrentRender (chunk-VKLKESE7.js?v=5a171ad1:18805:15)
    at performConcurrentWorkOnRoot (chunk-VKLKESE7.js?v=5a171ad1:18718:15)
chunk-VKLKESE7.js?v=5a171ad1:14032 The above error occurred in the <div> component:

    at div
    at div
    at MapView (http://localhost:3001/src/components/map/MapView.tsx?t=1776251626794:45:35)
    at div
    at App (http://localhost:3001/src/App.tsx?t=1776251626794:24:33)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
logCapturedError @ chunk-VKLKESE7.js?v=5a171ad1:14032
chunk-VKLKESE7.js?v=5a171ad1:9129 Uncaught ReferenceError: legendRef is not defined
    at ref (MapView.tsx:333:30):5173
```

---

## 🎮 Сразу попробовать новые функции

### 1️⃣ Фильтр города (1 мин)
```
1. Кликнуть на "🌍 Выберите город"
2. Выбрать "Санкт-Петербург"
3. Адреса теперь только из СПб ✅
```

### 2️⃣ Долгое нажатие (1 мин)  
```
1. На карте нажать и держать 500мс
2. Выбрать "⚠️ Препятствие"
3. Ввести "Потоп в подъезде"
4. Оранжевый маркер на карте ✅
```

### 3️⃣ Кнопка маршрута (1 мин)
```
1. Построить маршрут (адреса + кнопка)
2. Кликнуть на красный маркер
3. Нажать "🚀 Начать маршрут отсюда"
4. Новый маршрут от текущей позиции ✅
```

---

## 📂 Где найти новый код

| Функция | Файл | Строки |
|---------|------|--------|
| 🌍 Фильтр города | `CityFilter.tsx` | 1-120 |
| 💨 Debounce | `api.ts` | 18-37 |
| 🚀 Кнопка маршрута | `MapView.tsx` | 435-485 |
| 📍 Долгое нажатие | `MapView.tsx` | 130-160 |
| 💾 Хранилище | `storage.ts` | 1-140 |

---

## ✅ Все готово!

Никакой доп. конфигурации не нужно.

DevTools → Проверить:
- LocalStorage (dg_marks, dg_cache_*)
- Network (debounce работает)
- Console (логи маршрутов)

---

## 📞 Вопросы?

Смотри:
- `FINAL_SUMMARY.md` - полный отчет
- `IMPLEMENTATION.md` - детали реализации  
- `CHECKLIST.md` - проверка требований
