# PulseHR — Корпоративный сервис опросов сотрудников

SPA на Vue 3 для проведения pulse-опросов, eNPS-аналитики и каскадных уведомлений (Web Push → Telegram → SMS → Email). REST API замокан на клиенте.

## Технологии

- **Vue 3** (Composition API, `<script setup>`)
- **Vue Router 4** (ленивая загрузка, guards по ролям)
- **Pinia** (управление состоянием)
- **Vite 5** (сборка, dev-сервер)

## Быстрый старт

```bash
npm install
npm run dev
```

Откройте **http://localhost:3000**.

Если порт 3000 занят, Vite автоматически выберет другой (3001, 3002...).

## Скрипты

| Команда | Описание |
|---|---|
| `npm run dev` | Dev-сервер (Vite, HMR) |
| `npm run build` | Production-сборка в `dist/` |
| `npm run preview` | Просмотр `dist/` через Vite preview |
| `npm run serve` | Просмотр `dist/` через http-server |
| `npm run clean` | Очистка кэша Vite и `dist/` |

### Если `npm run dev` не работает

```bash
# 1. Проверьте, не занят ли порт
netstat -ano | findstr :3000

# 2. Убейте процесс, занимающий порт (замените PID)
taskkill /F /PID <PID>

# 3. Или используйте готовую сборку
npm run build
npm run serve   # откроет http://localhost:8080
```

## Тестовый вход

| Телефон | Роль | Код OTP |
|---|---|---|
| `+7 999 123-45-67` | HR / Администратор | `111111` |
| Любой другой номер | Сотрудник | `111111` |

## Структура проекта

```
src/
├── main.js                        # Entry point
├── App.vue                        # Корневой компонент + навигация
├── router/index.js                # 11 маршрутов + guard
├── services/api.js                # Mock REST API
├── stores/
│   ├── auth.js                    # Авторизация (телефон + OTP)
│   ├── survey.js                  # Опросы (CRUD, публикация)
│   └── notifications.js           # Настройки уведомлений
├── views/
│   ├── LoginView.vue              # Вход по телефону
│   ├── HrDashboardView.vue        # Дашборд HR
│   ├── SurveyListView.vue         # Список опросов (HR)
│   ├── SurveyConstructorView.vue  # Конструктор с ветвлением
│   ├── EmployeeSurveysView.vue    # Доступные опросы (сотрудник)
│   ├── SurveyTakeView.vue         # Прохождение опроса
│   ├── AnalyticsView.vue          # Аналитика + eNPS
│   ├── NotificationSettingsView.vue # Каскадные уведомления
│   └── ProfileView.vue            # Профиль
└── styles/main.css                # Глобальные стили
```

## Функционал MVP

- **Авторизация**: номер телефона → OTP-код, разделение ролей HR/Сотрудник
- **Конструктор опросов**: 5 типов вопросов (одиночный/множественный выбор, шкала/NPS, текст, матрица), анонимный/идентифицированный режим
- **Ветвление (conditional logic)**: показ разных вопросов в зависимости от ответов
- **Прохождение**: анонимная плашка, eNPS (0–10), динамические вопросы по ветвлению
- **Каскадные уведомления**: Web Push → Telegram → SMS → Email, настройки каналов, «Не беспокоить»
- **Дашборд HR**: eNPS, метрики прохождения, эффективность каналов
- **Аналитика**: eNPS по подразделениям, график активности, sentiment комментариев

## Mock API

Все эндпоинты находятся в `src/services/api.js`. Симулируют задержку сети (300–800 мс) и редкие ошибки (5%). Ключевые методы:

- `api.requestOtp(phone)` — запрос OTP-кода
- `api.verifyOtp(phone, code)` — проверка кода (тестовый: 111111)
- `api.fetchSurveys()` / `api.fetchSurvey(id)` — получение опросов
- `api.createSurvey(data)` / `api.publishSurvey(id)` — создание/публикация
- `api.submitSurveyResponse(id, answers)` — отправка ответов
- `api.fetchAnalytics()` — получение аналитики

## Разработчик

PulseHR — Хакатон 2026. ООО «СКС Ломбард».
