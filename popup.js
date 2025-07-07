/*
 * Jutsu Downloader Pro
 * Copyright © 2024 DiMiTrII-hash
 * Все права защищены. См. LICENSE для условий использования.
 */

document.addEventListener("DOMContentLoaded", function () {
  // Элементы страниц
  const mainPage = document.getElementById("mainPage");
  const downloadPage = document.getElementById("downloadPage");
  const openDownloadMenu = document.getElementById("openDownloadMenu");
  const backButton = document.getElementById("backButton");

  // Элементы главной страницы
  const loadingContainer = document.getElementById("loadingContainer");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const successIcon = document.getElementById("successIcon");
  const errorIcon = document.getElementById("errorIcon");
  const progressFill = document.getElementById("progressFill");
  const statusText = document.getElementById("statusText");
  const statusDetails = document.getElementById("statusDetails");
  const progressPercentage = document.getElementById("progressPercentage");
  const progressRemaining = document.getElementById("progressRemaining");
  const downloadSpeed = document.getElementById("downloadSpeed");
  const fileSize = document.getElementById("fileSize");
  const downloadedSize = document.getElementById("downloadedSize");
  const animeInfo = document.getElementById("animeInfo");
  const animeTitle = document.getElementById("animeTitle");
  const seasonBadge = document.getElementById("seasonBadge");
  const episodeBadge = document.getElementById("episodeBadge");
  const episodeTitle = document.getElementById("episodeTitle");
  const animeIcon = document.getElementById("animeIcon");
  const cancelButton = document.getElementById("cancelButton");

  // Элементы страницы скачивания
  const animeInfoSmall = document.getElementById("animeInfoSmall");
  const animeTitleSmall = document.getElementById("animeTitleSmall");
  const seasonBadgeSmall = document.getElementById("seasonBadgeSmall");
  const episodeBadgeSmall = document.getElementById("episodeBadgeSmall");
  const downloadCurrent = document.getElementById("downloadCurrent");
  const downloadFromStart = document.getElementById("downloadFromStart");
  const downloadRange = document.getElementById("downloadRange");
  const downloadSeason = document.getElementById("downloadSeason");
  const countFromStart = document.getElementById("countFromStart");
  const rangeStart = document.getElementById("rangeStart");
  const rangeEnd = document.getElementById("rangeEnd");

  // Проверка существования критически важных DOM элементов
  const requiredElements = [
    "mainPage",
    "downloadPage",
    "openDownloadMenu",
    "backButton",
    "loadingContainer",
    "statusText",
    "animeInfo",
    "animeTitle",
    "seasonBadge",
    "episodeBadge",
    "episodeTitle",
    "cancelButton",
  ];

  for (const elementId of requiredElements) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Критический DOM элемент не найден: ${elementId}`);
      return; // Прерываем выполнение если критический элемент отсутствует
    }
  }

  let currentProgress = 0;
  const totalSteps = 6;
  let batchQueue = [];
  let currentBatchIndex = 0;
  let currentAnimeData = null;

  // Функции для переключения страниц
  function showDownloadPage() {
    mainPage.classList.add("hidden");
    downloadPage.classList.add("active");

    // Меняем фон на 3.jpg для страницы выбора
    document.body.classList.add("download-page-bg");

    // Копируем информацию об аниме
    if (currentAnimeData) {
      animeTitleSmall.textContent =
        currentAnimeData.title || "Название не найдено";
      seasonBadgeSmall.textContent = currentAnimeData.season || "СЕЗОН";
      episodeBadgeSmall.textContent = currentAnimeData.episode || "СЕРИЯ";
    }
  }

  function showMainPage() {
    downloadPage.classList.remove("active");
    mainPage.classList.remove("hidden");

    // Проверяем состояние фонового скачивания перед сменой фона
    chrome.runtime.sendMessage({ action: "getDownloadState" }, (state) => {
      if (chrome.runtime.lastError) {
        console.log(
          "Background script недоступен при переключении на главную:",
          chrome.runtime.lastError.message,
        );
        // Возвращаем фон на 2.jpg (убираем все классы фонов)
        document.body.classList.remove("download-page-bg");
        document.body.classList.remove("loading-page-bg");
        return;
      }

      if (state && state.isActive) {
        // Если идет скачивание, оставляем фон загрузки
        document.body.classList.remove("download-page-bg");
        document.body.classList.add("loading-page-bg");
        document.body.classList.add("expanded");

        if (state.currentEpisode) {
          updateCurrentEpisodeInfo(state.currentEpisode);
        }

        loadingContainer.classList.add("active");
        updateProgress(
          state.progress,
          state.status,
          state.details,
          state.downloadStats,
        );
        startStateMonitoring();
      } else {
        // Возвращаем фон на 2.jpg (убираем все классы фонов)
        document.body.classList.remove("download-page-bg");
        document.body.classList.remove("loading-page-bg");
      }
    });
  }

  // Обработчики переходов между страницами
  openDownloadMenu.addEventListener("click", function () {
    if (openDownloadMenu.disabled) return;

    // Проверяем состояние фонового скачивания перед открытием меню
    chrome.runtime.sendMessage({ action: "getDownloadState" }, (state) => {
      if (chrome.runtime.lastError) {
        console.log(
          "Background script недоступен при открытии меню:",
          chrome.runtime.lastError.message,
        );
        showDownloadPage();
        return;
      }

      if (state && state.isActive) {
        // Если идет скачивание, показываем предупреждение
        console.log("Скачивание уже активно, показываем интерфейс загрузки");

        // Переключаемся на интерфейс загрузки
        document.body.classList.add("expanded");
        document.body.classList.add("loading-page-bg");
        document.body.classList.remove("download-page-bg");

        if (state.currentEpisode) {
          updateCurrentEpisodeInfo(state.currentEpisode);
        }

        loadingContainer.classList.add("active");
        updateProgress(
          state.progress,
          state.status,
          state.details,
          state.downloadStats,
        );
        startStateMonitoring();
      } else {
        // Обычное открытие меню скачивания
        showDownloadPage();
      }
    });
  });

  backButton.addEventListener("click", function () {
    showMainPage();
  });

  // Предотвращаем всплытие событий для полей ввода
  countFromStart.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  rangeStart.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  rangeEnd.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  // Также предотвращаем всплытие для всех полей ввода при фокусе
  countFromStart.addEventListener("focus", function (e) {
    e.stopPropagation();
  });

  rangeStart.addEventListener("focus", function (e) {
    e.stopPropagation();
  });

  rangeEnd.addEventListener("focus", function (e) {
    e.stopPropagation();
  });

  // Предотвращаем всплытие для контейнеров полей ввода
  document.querySelectorAll(".option-input").forEach(function (input) {
    input.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  });

  // Получаем текущую вкладку и URL
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];
    const url = currentTab.url;

    if (url.includes("jut.su")) {
      openDownloadMenu.disabled = false;

      // Получаем информацию об аниме для показа в компактном режиме
      getAnimeInfo(currentTab.id);

      // Получаем информацию о следующих сериях
      getNextEpisodesInfo(currentTab.id);
    } else {
      openDownloadMenu.disabled = true;
      animeTitle.textContent = "Откройте страницу с аниме";
      seasonBadge.textContent = "JUT.SU";
      episodeBadge.textContent = "АНИМЕ";
      episodeTitle.textContent = "Выберите серию для скачивания";
      animeIcon.classList.add("loading");
      animeInfo.classList.add("visible");
    }
  });

  // Проверяем состояние фонового скачивания при открытии
  chrome.runtime.sendMessage({ action: "getDownloadState" }, (state) => {
    if (chrome.runtime.lastError) {
      console.log(
        "Background script недоступен:",
        chrome.runtime.lastError.message,
      );
      return;
    }

    if (state && state.isActive) {
      // Есть активное скачивание, восстанавливаем интерфейс загрузки
      console.log("Восстанавливаем состояние активного скачивания:", state);

      // Убеждаемся что показана главная страница
      downloadPage.classList.remove("active");
      mainPage.classList.remove("hidden");

      // Устанавливаем правильные классы фона и расширения
      document.body.classList.add("expanded");
      document.body.classList.add("loading-page-bg");
      document.body.classList.remove("download-page-bg");

      // Обновляем информацию о текущем эпизоде, если есть
      if (state.currentEpisode) {
        updateCurrentEpisodeInfo(state.currentEpisode);
      }

      // Показываем loading container и обновляем прогресс
      loadingContainer.classList.add("active");
      updateProgress(
        state.progress,
        state.status,
        state.details,
        state.downloadStats,
      );

      // Запускаем мониторинг состояния
      startStateMonitoring();
    } else if (
      state &&
      state.progress === 100 &&
      (state.status.includes("завершено") || state.status.includes("отменено"))
    ) {
      // Скачивание завершено, но показываем результат
      console.log("Показываем результат завершенного скачивания:", state);

      // Убеждаемся что показана главная страница
      downloadPage.classList.remove("active");
      mainPage.classList.remove("hidden");

      // Устанавливаем правильные классы фона и расширения
      document.body.classList.add("expanded");
      document.body.classList.add("loading-page-bg");
      document.body.classList.remove("download-page-bg");

      // Обновляем информацию о текущем эпизоде, если есть
      if (state.currentEpisode) {
        updateCurrentEpisodeInfo(state.currentEpisode);
      }

      // Показываем результат
      loadingContainer.classList.add("active");
      updateProgress(
        state.progress,
        state.status,
        state.details,
        state.downloadStats,
      );

      // Показываем соответствующую иконку
      if (state.status.includes("завершено")) {
        showSuccess("Скачивание завершено");
      } else if (state.status.includes("отменено")) {
        showError("Скачивание отменено");
      }

      // Автоматически скрываем через 3 секунды
      setTimeout(() => {
        resetInterface();
      }, 3000);
    }
  });

  // Функция для получения информации об аниме
  function getAnimeInfo(tabId) {
    // Проверяем доступность content script перед запросом
    checkAndInjectContentScript(tabId, () => {
      chrome.tabs.sendMessage(
        tabId,
        {
          action: "getAnimeInfo",
        },
        function (response) {
          if (chrome.runtime.lastError) {
            console.log(
              "Content script недоступен:",
              chrome.runtime.lastError.message,
            );
            animeTitle.textContent = "Не удалось загрузить";
            seasonBadge.textContent = "ОШИБКА";
            episodeBadge.textContent = "ДАННЫЕ";
            episodeTitle.textContent = "информацию об аниме";
            animeIcon.classList.add("loading");
          } else if (response && response.success) {
            // Разбираем информацию
            const parts = parseAnimeInfo(response);

            // Сохраняем данные для использования на странице скачивания
            currentAnimeData = {
              title: parts.title || "Название не найдено",
              season: parts.season || "",
              episode: parts.episode || "",
              episodeTitle: parts.episodeTitle || "Название серии не найдено",
            };

            // Проверяем, что все данные для скачивания определены
            if (currentAnimeData.title && currentAnimeData.season && currentAnimeData.episode) {
              openDownloadMenu.disabled = false;
            } else {
              openDownloadMenu.disabled = true;
              currentAnimeData.episodeTitle = "Выберите конкретную серию для скачивания";
            }

            animeTitle.textContent = currentAnimeData.title;
            seasonBadge.textContent = currentAnimeData.season || "СЕЗОН";
            episodeBadge.textContent = currentAnimeData.episode || "СЕРИЯ";
            episodeTitle.textContent = currentAnimeData.episodeTitle;

            // Устанавливаем иконку аниме
            if (response.animeIcon) {
              animeIcon.style.backgroundImage = `url('${response.animeIcon}')`;
              animeIcon.classList.remove("loading");
            } else {
              animeIcon.classList.add("loading");
            }
          } else {
            animeTitle.textContent = "Информация недоступна";
            seasonBadge.textContent = "НЕТ";
            episodeBadge.textContent = "ДАННЫХ";
            episodeTitle.textContent = "Попробуйте обновить страницу";
            animeIcon.classList.add("loading");
          }

          // Показываем информацию с небольшой задержкой для плавности
          setTimeout(() => {
            animeInfo.classList.add("visible");
          }, 200);
        },
      );
    });
  }

  // Функция для разбора информации об аниме
  function parseAnimeInfo(response) {
    const result = {
      title: "",
      season: "",
      episode: "",
      episodeTitle: "",
    };

    if (response.title) {
      result.title = response.title;
    }

    if (response.episode) {
      // Разбираем строку типа "Сезон 2, серия 1 • Звероподобный титан"
      const episodeStr = response.episode;

      // Ищем сезон
      const seasonMatch = episodeStr.match(/Сезон\s+(\d+)/i);
      if (seasonMatch) {
        result.season = `СЕЗОН ${seasonMatch[1]}`;
      }

      // Ищем серию
      const episodeMatch = episodeStr.match(/серия\s+(\d+)/i);
      if (episodeMatch) {
        result.episode = `СЕРИЯ ${episodeMatch[1]}`;
      }

      // Ищем название серии (после •)
      const titleMatch = episodeStr.split("•");
      if (titleMatch.length > 1) {
        result.episodeTitle = titleMatch[1].trim();
      } else {
        // Если нет •, берем всё после номера серии
        const afterSeriesMatch = episodeStr.replace(/.*серия\s+\d+\s*/i, "");
        if (afterSeriesMatch && afterSeriesMatch !== episodeStr) {
          result.episodeTitle = afterSeriesMatch.trim();
        }
      }
    }

    return result;
  }

  // Функция для получения информации о следующих сериях
  function getNextEpisodesInfo(tabId) {
    // Проверяем доступность content script перед запросом
    checkAndInjectContentScript(tabId, () => {
      chrome.tabs.sendMessage(
        tabId,
        {
          action: "getNextEpisodes",
        },
        function (response) {
          if (chrome.runtime.lastError) {
            console.log(
              "Content script недоступен для getNextEpisodes:",
              chrome.runtime.lastError.message,
            );
            batchQueue = [];
            return;
          }

          if (
            response &&
            response.success &&
            response.nextEpisodes.length > 0
          ) {
            const episodes = response.nextEpisodes;
            batchQueue = episodes;
          } else {
            batchQueue = [];
          }
        },
      );
    });
  }

  // Обработчики кнопок скачивания
  downloadCurrent.addEventListener("click", function () {
    showMainPage();
    startSingleDownload();
  });

  downloadFromStart.addEventListener("click", function () {
    const count = parseInt(countFromStart.value) || 5;
    showMainPage();
    startBatchDownloadFromStart(count);
  });

  downloadRange.addEventListener("click", function () {
    const start = parseInt(rangeStart.value) || 1;
    const end = parseInt(rangeEnd.value) || 10;
    showMainPage();
    startBatchDownloadRange(start, end);
  });

  downloadSeason.addEventListener("click", function () {
    showMainPage();
    startSeasonDownload();
  });

  // Обработчик кнопки отмены
  cancelButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "cancelDownload" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Ошибка отмены скачивания:",
          chrome.runtime.lastError.message,
        );
        showError("Не удалось отменить скачивание");
        return;
      }

      // Останавливаем мониторинг
      if (window.stateMonitorInterval) {
        clearInterval(window.stateMonitorInterval);
      }

      // Показываем сообщение об отмене
      updateProgress(0, "Скачивание отменено", "", {});
      showError("Скачивание отменено пользователем");
    });
  });

  // Новые функции скачивания
  async function startBatchDownloadFromStart(count) {
    // Создаем список серий с 1 по count
    const episodes = [];
    for (let i = 1; i <= count; i++) {
      const url = await generateEpisodeUrl(i);
      episodes.push({
        number: i,
        url: url,
        title: currentAnimeData?.title || "Аниме",
        season: extractSeasonNumber(currentAnimeData?.season) || "1",
        episodeTitle: `Серия ${i}`,
      });
    }
    console.log("Создан список серий с 1 по", count, ":", episodes);
    startBatchDownloadWithEpisodes(episodes);
  }

  async function startBatchDownloadRange(start, end) {
    // Создаем список серий в диапазоне
    const episodes = [];
    for (let i = start; i <= end; i++) {
      const url = await generateEpisodeUrl(i);
      episodes.push({
        number: i,
        url: url,
        title: currentAnimeData?.title || "Аниме",
        season: extractSeasonNumber(currentAnimeData?.season) || "1",
        episodeTitle: `Серия ${i}`,
      });
    }
    console.log("Создан список серий с", start, "по", end, ":", episodes);
    startBatchDownloadWithEpisodes(episodes);
  }

  function startSeasonDownload() {
    // Используем существующую логику для получения всех серий сезона
    if (batchQueue.length > 0) {
      // Сортируем серии по номеру
      const sortedEpisodes = batchQueue.sort((a, b) => a.number - b.number);
      console.log("Скачиваем весь сезон, серии:", sortedEpisodes);
      startBatchDownloadWithEpisodes(sortedEpisodes);
    } else {
      // Если нет данных о сериях, пробуем скачать первые 25 серий
      console.log("Нет данных о сериях, скачиваем первые 25");
      startBatchDownloadFromStart(25);
    }
  }

  function startBatchDownloadWithEpisodes(episodes) {
    // Плавный переход в режим загрузки
    setTimeout(() => {
      document.body.classList.add("expanded");
      // Убираем фон страницы выбора и ставим фон загрузки (1.jpg)
      document.body.classList.remove("download-page-bg");
      document.body.classList.add("loading-page-bg");

      setTimeout(() => {
        loadingContainer.classList.add("active");
        updateProgress(0, `Запуск скачивания`, "", {});

        // Запускаем фоновое пакетное скачивание
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            // Проверяем доступность content script перед запуском
            checkAndInjectContentScript(tabs[0].id, () => {
              chrome.runtime.sendMessage(
                {
                  action: "startBatchDownload",
                  episodes: episodes,
                  tabId: tabs[0].id,
                },
                function (response) {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "Ошибка запуска скачивания:",
                      chrome.runtime.lastError.message,
                    );
                    showError("Не удалось запустить скачивание");
                    return;
                  }
                  console.log("Скачивание запущено");
                },
              );
            });
          },
        );

        // Запускаем мониторинг состояния
        startStateMonitoring();
      }, 300);
    }, 200);
  }

  // Функция для проверки и инъекции content script
  function checkAndInjectContentScript(tabId, callback) {
    // Проверяем доступность content script
    chrome.tabs.sendMessage(tabId, { action: "ping" }, function (response) {
      if (chrome.runtime.lastError) {
        console.log(
          "Content script недоступен, инъектируем:",
          chrome.runtime.lastError.message,
        );

        // Инъектируем content script
        chrome.scripting.executeScript(
          {
            target: { tabId: tabId },
            files: ["content.js"],
          },
          function () {
            if (chrome.runtime.lastError) {
              console.error(
                "Ошибка инъекции content script:",
                chrome.runtime.lastError.message,
              );
              showError(
                "Не удалось загрузить скрипт. Обновите страницу и попробуйте снова.",
              );
              return;
            }

            console.log("Content script инъектирован");
            // Небольшая задержка для инициализации
            setTimeout(() => {
              callback();
            }, 500);
          },
        );
      } else {
        console.log("Content script доступен");
        callback();
      }
    });
  }

  // Вспомогательные функции
  function generateEpisodeUrl(episodeNumber) {
    // Получаем текущий URL из активной вкладки
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentUrl = tabs[0].url;
        console.log("Исходный URL:", currentUrl);
        console.log("Генерируем URL для серии:", episodeNumber);

        let newUrl;

        // Проверяем, содержит ли URL уже номер серии
        if (currentUrl.includes("/episode-")) {
          // Заменяем существующий номер серии
          newUrl = currentUrl.replace(
            /\/episode-\d+(\.html)?$/,
            `/episode-${episodeNumber}.html`,
          );
        } else {
          // Добавляем номер серии в конец (убираем .html если есть)
          newUrl =
            currentUrl.replace(/\.html$/, "") +
            `/episode-${episodeNumber}.html`;
        }

        console.log("Новый URL:", newUrl);
        resolve(newUrl);
      });
    });
  }

  function extractEpisodeNumber(episodeText) {
    if (!episodeText) return 1;
    const match = episodeText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  function extractSeasonNumber(seasonText) {
    if (!seasonText) return 1;
    const match = seasonText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  // Функция для скачивания одной серии
  function startSingleDownload() {
    // Плавный переход в режим загрузки
    setTimeout(() => {
      document.body.classList.add("expanded");
      // Меняем фон на 1.jpg для загрузки
      document.body.classList.add("loading-page-bg");

      // Активируем контейнер загрузки после анимации
      setTimeout(() => {
        loadingContainer.classList.add("active");

        // Начинаем процесс скачивания
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            // Сначала проверяем доступность content script
            checkAndInjectContentScript(tabs[0].id, () => {
              chrome.tabs.sendMessage(
                tabs[0].id,
                { action: "startDownload" },
                function (response) {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "Ошибка запуска скачивания:",
                      chrome.runtime.lastError.message,
                    );
                    showError(
                      "Не удалось запустить скачивание. Попробуйте обновить страницу.",
                    );
                    return;
                  }
                  console.log("Одиночное скачивание запущено");
                },
              );
            });
          },
        );
      }, 300);
    }, 200);
  }

  // Функция для пакетного скачивания
  function startBatchDownload() {
    const maxEpisodes = 3;
    const episodesToDownload = batchQueue.slice(0, maxEpisodes);

    // Плавный переход в режим загрузки
    setTimeout(() => {
      document.body.classList.add("expanded");

      setTimeout(() => {
        loadingContainer.classList.add("active");
        updateProgress(0, `Запуск пакетного скачивания`, "", {});

        // Запускаем фоновое пакетное скачивание
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            chrome.runtime.sendMessage(
              {
                action: "startBatchDownload",
                episodes: episodesToDownload,
                tabId: tabs[0].id,
              },
              function (response) {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Ошибка запуска пакетного скачивания:",
                    chrome.runtime.lastError.message,
                  );
                  showError("Не удалось запустить скачивание");
                  return;
                }
                console.log("Пакетное скачивание запущено");
              },
            );
          },
        );

        // Запускаем мониторинг состояния
        startStateMonitoring();
      }, 300);
    }, 200);
  }

  // Мониторинг состояния фонового скачивания
  function startStateMonitoring() {
    // Останавливаем предыдущий мониторинг если он был
    if (window.stateMonitorInterval) {
      clearInterval(window.stateMonitorInterval);
    }

    const monitorInterval = setInterval(() => {
      chrome.runtime.sendMessage({ action: "getDownloadState" }, (state) => {
        if (chrome.runtime.lastError) {
          console.log(
            "Background script недоступен в мониторинге:",
            chrome.runtime.lastError.message,
          );
          clearInterval(monitorInterval);
          window.stateMonitorInterval = null;
          return;
        }

        if (state) {
          // Обновляем прогресс и информацию о серии
          updateProgress(
            state.progress,
            state.status,
            state.details,
            state.downloadStats,
          );

          if (state.currentEpisode) {
            updateCurrentEpisodeInfo(state.currentEpisode);
          }

          if (!state.isActive) {
            // Скачивание завершено или остановлено
            clearInterval(monitorInterval);
            window.stateMonitorInterval = null;

            // НЕ показываем success автоматически здесь - это будет сделано
            // через специальные сообщения downloadComplete или batchDownloadComplete
            if (state.status.includes("отменено")) {
              showError("Скачивание отменено");
            } else if (
              state.status.includes("не удалось") ||
              state.status.includes("ошибка")
            ) {
              showError(state.details || "Произошла ошибка при скачивании");
            }
            // Для успешного завершения ждем специальные сообщения от background.js
          }
        }
      });
    }, 1000); // Обновляем каждую секунду

    // Сохраняем ID интервала для возможной отмены
    window.stateMonitorInterval = monitorInterval;
  }

  // Слушаем сообщения от background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "downloadStateUpdated") {
      // Обновляем интерфейс на основе состояния
      const state = message.state;
      console.log("Получено обновление состояния:", state);

      updateProgress(
        state.progress,
        state.status,
        state.details,
        state.downloadStats,
      );

      // Обновляем информацию о серии, если передана
      if (state.currentEpisode) {
        updateCurrentEpisodeInfo(state.currentEpisode);
      }

      // Если скачивание активно, убеждаемся что показан правильный интерфейс
      if (state.isActive && !loadingContainer.classList.contains("active")) {
        // Показываем интерфейс загрузки
        downloadPage.classList.remove("active");
        mainPage.classList.remove("hidden");
        document.body.classList.add("expanded");
        document.body.classList.add("loading-page-bg");
        document.body.classList.remove("download-page-bg");
        loadingContainer.classList.add("active");

        if (!window.stateMonitorInterval) {
          startStateMonitoring();
        }
      }
    } else if (message.action === "batchDownloadComplete") {
      console.log("Пакетное скачивание завершено");
      updateProgress(
        100,
        "Пакетное скачивание завершено!",
        `Скачано ${message.totalDownloaded} серий`,
        {
          totalBytes: message.totalDownloaded || 0,
          speed: message.downloadSpeed || 0,
          bytesReceived: message.totalDownloaded || 0,
          estimatedEndTime: Date.now(),
        },
      );
      showSuccess("Все серии скачаны");
    } else if (message.action === "downloadComplete") {
      console.log("Одиночное скачивание завершено");
      updateProgress(100, "Скачивание завершено!", "Файл сохранен", {
        totalBytes: message.totalDownloaded || 0,
        speed: message.downloadSpeed || 0,
        bytesReceived: message.totalDownloaded || 0,
        estimatedEndTime: Date.now(),
      });
      showSuccess("Файл скачан");
    } else if (message.action === "downloadError") {
      console.log("Ошибка скачивания:", message.error);
      showError("Ошибка: " + message.error);
    }
  });

  // Удалена неиспользуемая функция handleStatusUpdate

  // Функция для обновления информации о текущей серии
  function updateCurrentEpisodeInfo(episodeInfo) {
    if (episodeInfo.title) {
      animeTitle.textContent = episodeInfo.title;
    }

    if (episodeInfo.season) {
      seasonBadge.textContent = `СЕЗОН ${episodeInfo.season}`;
    }

    if (episodeInfo.episode) {
      episodeBadge.textContent = `СЕРИЯ ${episodeInfo.episode}`;
    }

    if (episodeInfo.episodeTitle) {
      episodeTitle.textContent = episodeInfo.episodeTitle;
    }
  }

  // Функции для обновления интерфейса
  function updateProgress(progress, message, details = "", downloadStats = {}) {
    currentProgress = Math.max(0, Math.min(100, progress));
    progressFill.style.width = currentProgress + "%";
    progressPercentage.textContent = Math.round(currentProgress) + "%";
    statusText.textContent = message || "";
    statusDetails.textContent = details || "";

    // Обновляем статистику скачивания
    if (downloadStats.speed !== undefined) {
      downloadSpeed.textContent = formatSpeed(downloadStats.speed);
    }

    if (downloadStats.totalBytes !== undefined) {
      fileSize.textContent = formatBytes(downloadStats.totalBytes);
    }

    if (downloadStats.bytesReceived !== undefined) {
      downloadedSize.textContent = formatBytes(downloadStats.bytesReceived);
    }

    if (downloadStats.estimatedEndTime !== undefined) {
      const remaining = downloadStats.estimatedEndTime - Date.now();
      progressRemaining.textContent =
        remaining > 0 ? `Осталось: ${formatTime(remaining)}` : "Завершается...";
    }
  }

  // Функции форматирования
  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function formatSpeed(bytesPerSecond) {
    if (bytesPerSecond === 0) return "0 KB/s";
    const k = 1024;
    const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return (
      parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
    );
  }

  function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}ч ${minutes % 60}м`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds % 60}с`;
    } else {
      return `${seconds}с`;
    }
  }

  function showSuccess(message) {
    updateProgress(100, "Успешно!", message || "Скачивание завершено");

    setTimeout(() => {
      loadingSpinner.style.display = "none";
      successIcon.style.display = "block";

      // Автоматически сбрасываем интерфейс через 3 секунды
      setTimeout(() => {
        resetInterface();
      }, 3000);
    }, 500);
  }

  function showError(error) {
    loadingSpinner.style.display = "none";
    errorIcon.style.display = "block";
    statusText.textContent = "Ошибка!";
    statusDetails.textContent = error || "Произошла ошибка";
    progressFill.style.background = "#ef4444";

    // Автоматически сбрасываем интерфейс через 5 секунд для ошибок
    setTimeout(() => {
      resetInterface();
    }, 5000);
  }

  function resetInterface() {
    // Останавливаем мониторинг состояния если он активен
    if (window.stateMonitorInterval) {
      clearInterval(window.stateMonitorInterval);
      window.stateMonitorInterval = null;
    }

    // Скрываем loading
    loadingContainer.classList.remove("active");

    setTimeout(() => {
      // Сжимаем панель обратно
      document.body.classList.remove("expanded");
      // Возвращаем фон на 2.jpg (убираем все классы фонов)
      document.body.classList.remove("download-page-bg");
      document.body.classList.remove("loading-page-bg");

      // Убеждаемся что показана главная страница
      downloadPage.classList.remove("active");
      mainPage.classList.remove("hidden");

      // Сбрасываем состояние loading контейнера
      loadingSpinner.style.display = "block";
      successIcon.style.display = "none";
      errorIcon.style.display = "none";
      progressFill.style.width = "0%";
      progressFill.style.background =
        "linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)";
      statusText.textContent = "Подготовка...";
      statusDetails.textContent = "Анализируем страницу";
      progressPercentage.textContent = "0%";
      progressRemaining.textContent = "Осталось: --";
      downloadSpeed.textContent = "-- KB/s";
      fileSize.textContent = "-- MB";
      downloadedSize.textContent = "-- MB";
      currentProgress = 0;
    }, 1000);
  }
});
