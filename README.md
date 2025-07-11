# 🚀 Jutsu Downloader Pro 🚀

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0-blue?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/status-active-brightgreen?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/manifest-v3-orange?style=for-the-badge" alt="Manifest V3">
</p>

**Скачивайте аниме с `jut.su` в 1080p с расширенным функционалом и современным интерфейсом.**

---

### ✨ Ключевые возможности

<details>
  <summary>Нажмите, чтобы развернуть</summary>
  
  - 🎯 **Автоматическое определение аниме**: Название, сезон, серия и иконка определяются прямо на странице.
  - 🎬 **Скачивание в 1080p**: Расширение автоматически ищет и предлагает лучшее доступное качество.
  - ⚙️ **Гибкие режимы скачивания**:
    - 📺 Скачать текущую серию
    - 🔢 Скачать диапазон (например, с 5 по 15 серию)
    - 🎬 Скачать с 1-й серии (указанное количество)
    - 🎭 Скачать весь сезон
  - 📊 **Информативный интерфейс**:
    - Плавные анимации и современный дизайн.
    - Прогресс-бар с детальной статистикой: скорость, размер, оставшееся время.
    - Умная кнопка "Скачать", которая неактивна до полного определения серии.
  - 📁 **Корректные имена файлов**: Файлы сохраняются в формате `1 серия - Название серии - Название аниме.mp4` для удобной сортировки. Поддерживается кириллица и автоматическая транслитерация.
  - 🎨 **Кастомизация**: Современный скроллбар, который появляется при необходимости и соответствует стилю расширения.
</details>

---

### 🛠️ Установка

1.  Скачайте все файлы расширения в одну папку.
2.  Откройте Chrome/Edge и перейдите в `chrome://extensions/`.
3.  Включите **"Режим разработчика"** в правом верхнем углу.
4.  Нажмите **"Загрузить распакованное расширение"**.
5.  Выберите папку с файлами.

---

### 🎥 Демонстрация

https://github.com/user-attachments/assets/34eede03-5a84-45c4-b4a7-2bb0747f20e7

---

### 🌟 Поддержка и развитие

Это моя первая публичная работа, и я буду очень рад вашей поддержке!

- ⭐ Поставьте **звезду** этому репозиторию, если он вам понравился.
- 🐞 Нашли ошибку или есть идея для новой функции? Создайте **[Issue](https://github.com/DiMiTrII-hash/jutsuanimedowloader/issues)**.

---

### 🤖 При участии ИИ

> Более 80% кода этого проекта, включая архитектурные решения, исправления и новую функциональность, было разработано и реализовано с помощью продвинутой AI-модели.

---

### 👨‍💻 Автор

- **DiMiTrII**
- **GitHub:** [@DiMiTrII-hash](https://github.com/DiMiTrII-hash)
- **Telegram:** [@Dimatipodima](https://t.me/Dimatipodima)

---

### 📁 Структура проекта

```
jutsuanimedowloader/
├── manifest.json       # Конфигурация расширения (v3)
├── popup.html          # Интерфейс
├── popup.js            # Логика интерфейса
├── popup.css           # Стили
├── content.js          # Скрипт для взаимодействия со страницей
├── background.js       # Service worker для управления скачиваниями
├── media/              # Иконки и фоны
└── README.md           # Этот файл
```

## Возможности

- 🎯 Автоматическое определение названия аниме, серии и эпизода
- 🎬 Поиск видео в качестве 1080p
- ⏳ Автоматический запуск плеера если видео не загружено
- 📥 Прямое скачивание через браузер
- 📊 Элегантная анимация с минималистичным progress bar
- 🔢 Понятная нумерация серий для естественной сортировки
- 🇷🇺 Полная поддержка русских символов в названиях файлов
- 🔄 Автоматическая транслитерация как резервный вариант
- 🎨 Минималистичный дизайн в стиле будущего
- ✨ Плавные микроанимации и transitions
- 🌑 Темная тема с акцентом на простоту
- 📱 Компактная панель с плавным расширением
- 💚 Зеленая галочка при успешном завершении  
- 📺 Отображение названия аниме и информации о серии
- 🎯 Автоматическое определение сезона и эпизода

## Как это работает

1. **Извлечение названия**: Ищет элемент `<span itemprop="name">` для основного названия и `<div class="video_plate_title"> h2` для названия серии
2. **Поиск плеера**: Находит видео плеер по селектору `video#my-player_html5_api`
3. **Извлечение ссылки**: Ищет источник видео с разрешением 1080p
4. **Автозапуск**: Если ссылка не найдена, кликает по плееру и ждет загрузки
5. **Скачивание**: Использует Chrome Downloads API для скачивания файла
6. **Обработка имен**: Сохраняет русские символы, при необходимости использует транслитерацию
7. **Адаптивный интерфейс**: Начинает как компактная панель, расширяется при работе
8. **Предпросмотр информации**: Показывает название аниме и серию до скачивания
9. **Минималистичный интерфейс**: Чистый дизайн без лишних элементов

## Примеры названий файлов

**Полное название с номером серии:**
`1 серия - Звероподобный титан - Атака титанов 2 сезон.mp4`

**При проблемах с кириллицей:**
`1 seriya - Zveropodobnyy titan - Ataka titanov 2 sezon.mp4`

**Только основное название (если нет названия серии):**
`1 серия - Атака титанов 2 сезон.mp4`

**Преимущества такого формата:**
- Читаемый номер серии в начале
- Название серии для быстрого поиска
- Полная информация о сезоне
- Естественная сортировка файлов

## Возможные проблемы

- **"Видео плеер не найден"**: Убедитесь, что находитесь на странице с видео
- **"Timeout"**: Плеер не запустился автоматически, попробуйте запустить вручную  
- **Скачивание не началось**: Проверьте, что разрешены скачивания в браузере
- **Проблемы с русскими символами**: Расширение автоматически попробует транслитерацию

## Безопасность

Расширение работает только на домене jut.su и не собирает никаких личных данных все происходит локлаькно в вашом рабочем пространсве.

### 📜 Лицензия

Данный проект защищен авторским правом. См. [LICENSE](LICENSE) для получения подробной информации.

### ⚖️ Отказ от ответственности

Это расширение создано исключительно в образовательных целях. Пользователи несут полную ответственность за соблюдение законов об авторских правах в своей стране. Разработчик не одобряет пиратство и не несет ответственности за неправомерное использование данного инструмента. 
