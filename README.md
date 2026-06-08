# PulseHR — Корпоративный сервис опросов сотрудников

SPA на Vue 3 + REST API на Node.js/Express + PostgreSQL для проведения pulse-опросов, eNPS-аналитики и каскадных уведомлений (Web Push → Telegram → SMS → Email).

## Технологии

| Слой | Стек |
|---|---|
| Frontend | Vue 3 (Composition API), Vue Router 4, Pinia, Vite 5 |
| Backend | Node.js, Express, PostgreSQL (`pg`) |
| API | REST over HTTP, JWT-аутентификация |

## Быстрый старт

```bash
npm install
```

### Frontend (с замоканным API)

Работает без бэкенда — данные берутся из `src/services/api.js` (режим mock).

```bash
npm run dev
# http://localhost:3000
```

Если порт 3000 занят, Vite переключится на 3001/3002 автоматически.

Собрать статику и открыть:

```bash
npm run build
npm run serve   # http://localhost:8080
```

### Frontend + Backend (PostgreSQL)

**1. Подготовить БД:**

```bash
createdb pulsehr
```

Или через psql:
```sql
CREATE DATABASE pulsehr;
```

**2. Настроить подключение** — `server/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pulsehr
DB_USER=postgres
DB_PASSWORD=postgres
```

**3. Инициализировать схему и тестовые данные:**

```bash
cd server
npm run db:init
```

**4. Запустить API (порт 4000):**

```bash
cd server
npm run dev
```

**5. Переключить фронтенд на реальный API (опционально):**

В `src/services/api.js` установить `USE_MOCK = false`.

## Скрипты

### Frontend

| Команда | Описание |
|---|---|
| `npm run dev` | Vite dev-server (HMR) |
| `npm run build` | Сборка в `dist/` |
| `npm run preview` | Vite preview `dist/` |
| `npm run serve` | http-server `dist/` на :8080 |
| `npm run clean` | Очистка кэша Vite |

### Backend (`server/`)

| Команда | Описание |
|---|---|
| `npm run dev` | API на :4000 с hot-reload |
| `npm run start` | API на :4000 |
| `npm run db:init` | Создать БД, таблицы, seed-данные |

## Тестовый вход

| Телефон | Роль | Код OTP |
|---|---|---|
| `+7 999 123-45-67` | HR / Администратор | `111111` |
| Любой другой | Сотрудник | `111111` |

## API Endpoints

### Auth
- `POST /api/auth/otp` — запрос OTP-кода
- `POST /api/auth/verify` — проверка кода, выдача JWT
- `GET /api/auth/me` — текущий пользователь

### Surveys
- `GET /api/surveys` — список опросов
- `GET /api/surveys/:id` — опрос с вопросами
- `POST /api/surveys` — создать (HR)
- `PUT /api/surveys/:id` — обновить (HR)
- `POST /api/surveys/:id/publish` — опубликовать (HR)

### Answers
- `POST /api/answers/:surveyId` — отправить ответы
- `GET /api/answers/:surveyId/results` — результаты (HR)

### Analytics
- `GET /api/analytics` — eNPS, метрики, каналы (HR)

### Notifications
- `GET /api/notifications/settings` — настройки пользователя
- `PUT /api/notifications/settings` — обновить настройки
- `POST /api/notifications/telegram/link` — привязать Telegram
- `POST /api/notifications/push/subscribe` — подписка Web Push
- `DELETE /api/notifications/devices/:id` — отвязать устройство

## Структура проекта

```
├── src/                        # Frontend (Vue 3)
│   ├── main.js
│   ├── App.vue
│   ├── router/index.js
│   ├── services/api.js         # API-клиент + mock fallback
│   ├── stores/                 # Pinia stores
│   ├── views/                  # 9 страниц
│   └── styles/main.css
├── server/                     # Backend (Express + PG)
│   ├── index.js                # Точка входа
│   ├── db/
│   │   ├── schema.sql          # DDL
│   │   ├── pool.js             # Подключение к PG
│   │   └── init.js             # Инициализация БД
│   ├── middleware/auth.js      # JWT guard
│   └── routes/
│       ├── auth.js
│       ├── surveys.js
│       ├── answers.js
│       ├── analytics.js
│       └── notifications.js
└── README.md
```

## Функционал MVP

- **Авторизация**: телефон → OTP, разделение ролей HR/Сотрудник
- **Конструктор опросов**: 5 типов вопросов, анонимный/идентифицированный режим
- **Ветвление (conditional logic)**: динамические вопросы от ответов
- **Прохождение**: анонимная плашка, eNPS (0–10), матрица, ветвление
- **Каскадные уведомления**: Web Push → Telegram → SMS → Email
- **Дашборд HR**: eNPS, метрики, каналы, подразделения
- **Аналитика**: eNPS по отделам, график, sentiment комментариев

## База данных (PostgreSQL)

```
users          → телефон, роль, подразделение, настройки
otp_codes      → OTP-коды для входа
sessions       → JWT-токены
surveys        → опросы (статусы: draft/active/completed/archived)
survey_questions → вопросы с поддержкой branching JSON
survey_targets → целевые роли
survey_responses → ответы на опрос
survey_answers → ответы на вопросы
user_devices   → устройства для Web Push
```

Пул подключений — `pg.Pool` (max 20 соединений, таймаут 5 с).

---

PulseHR — Хакатон 2026. ООО «СКС Ломбард».
