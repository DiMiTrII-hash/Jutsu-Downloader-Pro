/*
 * Jutsu Downloader Pro
 * Copyright © 2024 DiMiTrII-hash
 * Все права защищены. См. LICENSE для условий использования.
 */

// Background service worker для обработки скачиваний

// Состояние загрузок
let downloadState = {
  isActive: false,
  isBatchMode: false,
  currentBatch: [],
  currentIndex: 0,
  progress: 0,
  status: "Готов к работе",
  details: "",
  downloadIds: [],
  downloadStats: {
    speed: 0,
    totalBytes: 0,
    bytesReceived: 0,
    estimatedEndTime: 0,
  },
  startTime: 0,
  retryCount: 0,
  maxRetries: 3,
  currentEpisode: null,
};

// Слушаем сообщения от popup и content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadFile") {
    handleDownloadFile(request, sendResponse);
  } else if (request.action === "getDownloadState") {
    sendResponse(downloadState);
  } else if (request.action === "startBatchDownload") {
    startBatchDownload(request.episodes, request.tabId);
    sendResponse({ success: true });
  } else if (request.action === "updateDownloadState") {
    updateDownloadState(request.state);
  } else if (request.action === "cancelDownload") {
    cancelDownload();
    sendResponse({ success: true });
  }
  return true;
});

// Обработка скачивания файла
function handleDownloadFile(request, sendResponse) {
  console.log("Начинаем скачивание:", request.filename);

  // Устанавливаем состояние активности
  downloadState.isActive = true;
  downloadState.status = "Запуск скачивания";
  downloadState.details = "Подготовка к скачиванию";
  downloadState.progress = 0;
  downloadState.retryCount = 0;

  // Инициализируем время начала
  downloadState.startTime = Date.now();
  downloadState.downloadStats = {
    speed: 0,
    totalBytes: 0,
    bytesReceived: 0,
    estimatedEndTime: 0,
  };

  // Обновляем информацию о текущей серии
  if (request.episodeInfo) {
    downloadState.currentEpisode = request.episodeInfo;
  }

  const downloadOptions = {
    url: request.url,
    filename: request.filename,
    saveAs: false,
  };

  chrome.downloads.download(downloadOptions, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error("Ошибка скачивания:", chrome.runtime.lastError);

      // Пробуем запасное имя файла
      if (request.filenameBackup) {
        console.log("Пробуем запасное имя файла:", request.filenameBackup);
        downloadOptions.filename = request.filenameBackup;

        chrome.downloads.download(downloadOptions, (backupDownloadId) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              success: false,
              error:
                "Не удалось скачать файл: " + chrome.runtime.lastError.message,
            });
          } else {
            downloadState.downloadIds.push(backupDownloadId);
            startProgressTracking(backupDownloadId);
            sendResponse({ success: true, downloadId: backupDownloadId });
          }
        });
      } else {
        sendResponse({
          success: false,
          error: "Не удалось скачать файл: " + chrome.runtime.lastError.message,
        });
      }
    } else {
      console.log("Скачивание запущено с ID:", downloadId);
      downloadState.downloadIds.push(downloadId);
      startProgressTracking(downloadId);
      sendResponse({ success: true, downloadId: downloadId });
    }
  });
}

// Функция для отслеживания прогресса скачивания
function startProgressTracking(downloadId) {
  const trackingInterval = setInterval(() => {
    chrome.downloads.search({ id: downloadId }, (downloads) => {
      if (downloads && downloads.length > 0) {
        const download = downloads[0];

        // Обновляем статистику
        downloadState.downloadStats.totalBytes = download.totalBytes || 0;
        downloadState.downloadStats.bytesReceived = download.bytesReceived || 0;

        // Вычисляем прогресс
        if (downloadState.downloadStats.totalBytes > 0) {
          downloadState.progress =
            (downloadState.downloadStats.bytesReceived /
              downloadState.downloadStats.totalBytes) *
            100;
        }

        // Вычисляем скорость
        const elapsed = (Date.now() - downloadState.startTime) / 1000; // в секундах
        if (elapsed > 0) {
          downloadState.downloadStats.speed =
            downloadState.downloadStats.bytesReceived / elapsed;
        }

        // Вычисляем оставшееся время
        if (downloadState.downloadStats.speed > 0) {
          const remaining =
            downloadState.downloadStats.totalBytes -
            downloadState.downloadStats.bytesReceived;
          downloadState.downloadStats.estimatedEndTime =
            Date.now() + (remaining / downloadState.downloadStats.speed) * 1000;
        }

        // Обновляем статус
        if (download.state === "in_progress") {
          downloadState.status = "Скачивание в процессе";
          downloadState.details = `${Math.round(downloadState.progress)}% завершено`;
        } else if (download.state === "complete") {
          downloadState.status = "Скачивание завершено";
          downloadState.details = "Файл сохранён";
          downloadState.progress = 100;
          clearInterval(trackingInterval);

          // НЕ сбрасываем состояние здесь - это будет сделано в onChanged обработчике
          // для избежания дублирования логики
        } else if (download.state === "interrupted") {
          downloadState.status = "Скачивание прервано";
          downloadState.details = download.error || "Неизвестная ошибка";
          downloadState.isActive = false;
          downloadState.isBatchMode = false;
          downloadState.currentEpisode = null;
          downloadState.downloadIds = [];
          clearInterval(trackingInterval);
        }

        // Уведомляем popup об обновлении
        chrome.runtime.sendMessage(
          {
            action: "downloadStateUpdated",
            state: downloadState,
          },
          () => {
            if (chrome.runtime.lastError) {
              // Popup может быть закрыт, это нормально
              console.log(
                "Popup недоступен для обновления:",
                chrome.runtime.lastError.message,
              );
            }
          },
        );

        console.log("Прогресс:", {
          progress: downloadState.progress,
          received: downloadState.downloadStats.bytesReceived,
          total: downloadState.downloadStats.totalBytes,
          speed: downloadState.downloadStats.speed,
        });
      }
    });
  }, 500); // Обновляем каждые 500мс

  // Сохраняем ID интервала для возможной отмены
  downloadState.trackingInterval = trackingInterval;
}

// Слушаем изменения состояния загрузок для пакетного режима
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state && downloadDelta.state.current === "complete") {
    console.log("Загрузка завершена:", downloadDelta.id);

    if (downloadState.isBatchMode && downloadState.isActive) {
      // Останавливаем отслеживание текущего файла
      if (downloadState.trackingInterval) {
        clearInterval(downloadState.trackingInterval);
      }

      console.log(
        `Серия ${downloadState.currentIndex + 1} завершена, переходим к следующей`,
      );

      // Переходим к следующей серии в пакете
      downloadState.currentIndex++;

      // Обновляем прогресс пакетного скачивания
      const batchProgress =
        (downloadState.currentIndex / downloadState.currentBatch.length) * 100;
      downloadState.progress = batchProgress;
      downloadState.status = `Серия ${downloadState.currentIndex} из ${downloadState.currentBatch.length} завершена`;
      downloadState.details = `Подготовка к следующей серии...`;

      // Сбрасываем статистику для следующего файла
      downloadState.downloadStats = {
        speed: 0,
        totalBytes: 0,
        bytesReceived: 0,
        estimatedEndTime: 0,
      };
      downloadState.startTime = Date.now();

      // Уведомляем popup об обновлении прогресса
      chrome.runtime.sendMessage(
        {
          action: "downloadStateUpdated",
          state: downloadState,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.log(
              "Popup недоступен для обновления прогресса пакета:",
              chrome.runtime.lastError.message,
            );
          }
        },
      );

      // Небольшая пауза перед следующим скачиванием
      setTimeout(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            downloadNextEpisode(tabs[0].id);
          }
        });
      }, 2000);
    } else {
      // Обычное одиночное скачивание завершено
      downloadState.progress = 100;
      downloadState.status = "Скачивание завершено";
      downloadState.details = "Файл сохранён";

      console.log("Одиночное скачивание завершено успешно");

      // Отправляем уведомление о завершении одиночного скачивания
      chrome.runtime.sendMessage(
        {
          action: "downloadComplete",
          totalDownloaded: downloadState.downloadStats.totalBytes,
          downloadSpeed: downloadState.downloadStats.speed,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.log(
              "Popup недоступен для уведомления о завершении скачивания:",
              chrome.runtime.lastError.message,
            );
          }
        },
      );

      // Сбрасываем состояние активности для одиночного скачивания через 3 секунды
      setTimeout(() => {
        downloadState.isActive = false;
        downloadState.isBatchMode = false;
        downloadState.currentEpisode = null;
        downloadState.downloadIds = [];
        downloadState.progress = 0;
        downloadState.status = "Готов к работе";
        downloadState.details = "";
      }, 3000);
    }
  } else if (
    downloadDelta.state &&
    downloadDelta.state.current === "interrupted"
  ) {
    // Получаем детальную информацию об ошибке
    chrome.downloads.search({id: downloadDelta.id}, (downloads) => {
      if (downloads && downloads.length > 0) {
        const download = downloads[0];
        const errorReason = download.error || 'UNKNOWN_ERROR';
        
        if (errorReason === 'USER_CANCELED') {
          // Тихо завершаем процесс, не считаем ошибкой
          downloadState.isActive = false;
          downloadState.isBatchMode = false;
          downloadState.status = 'Загрузка отменена пользователем';
          downloadState.details = '';
          return;
        }
        if (downloadState.retryCount < downloadState.maxRetries && canRetryError(errorReason)) {
          downloadState.retryCount++;
          downloadState.status = `Повторная попытка ${downloadState.retryCount}/${downloadState.maxRetries}`;
          downloadState.details = `Ошибка: ${getErrorMessage(errorReason)}`;
          
          console.log(`Повторная попытка ${downloadState.retryCount}/${downloadState.maxRetries} через 3 секунды...`);
          
          // Уведомляем popup о повторной попытке
          chrome.runtime.sendMessage({
            action: 'downloadStateUpdated',
            state: downloadState
          }, () => {
            if (chrome.runtime.lastError) {
              console.log('Popup недоступен для уведомления о повторной попытке:', chrome.runtime.lastError.message);
            }
          });

          // Повторная попытка через 3 секунды
          setTimeout(() => {
            retryDownload(download);
          }, 3000);
        } else {
          // Превышено количество попыток или ошибка не подлежит повтору
          downloadState.status = 'Скачивание не удалось';
          downloadState.details = `Ошибка: ${getErrorMessage(errorReason)}`;
          downloadState.isActive = false;
          
          chrome.runtime.sendMessage({
            action: 'downloadError',
            error: `Не удалось скачать после ${downloadState.maxRetries} попыток. ${getErrorMessage(errorReason)}`
          }, () => {
            if (chrome.runtime.lastError) {
              console.log('Popup недоступен для уведомления об ошибке:', chrome.runtime.lastError.message);
            }
          });
        }
      }
    });
  }
});

// Запуск пакетного скачивания
function startBatchDownload(episodes, tabId) {
  console.log("Запуск пакетного скачивания:", episodes.length, "серий");
  console.log(
    "Список серий:",
    episodes.map((ep) => `${ep.number}: ${ep.url}`),
  );

  downloadState.isActive = true;
  downloadState.isBatchMode = true;
  downloadState.currentBatch = episodes;
  downloadState.currentIndex = 0; // Всегда начинаем с первого элемента массива
  downloadState.progress = 0;
  downloadState.status = "Пакетное скачивание запущено";
  downloadState.details = `Подготовка к скачиванию ${episodes.length} серий`;
  downloadState.retryCount = 0;

  // Инициализируем время начала
  downloadState.startTime = Date.now();
  downloadState.downloadStats = {
    speed: 0,
    totalBytes: 0,
    bytesReceived: 0,
    estimatedEndTime: 0,
  };

  console.log(
    "Начинаем с серии номер:",
    episodes[0]?.number,
    "URL:",
    episodes[0]?.url,
  );

  // Начинаем скачивание с первого элемента
  downloadNextEpisode(tabId);
}

// Скачивание следующей серии в пакете
async function downloadNextEpisode(tabId) {
  if (downloadState.currentIndex >= downloadState.currentBatch.length) {
    // Все серии скачаны
    downloadState.progress = 100;
    downloadState.status = "Пакетное скачивание завершено!";
    downloadState.details = `Скачано ${downloadState.currentBatch.length} серий`;

    console.log(
      `Пакетное скачивание завершено! Скачано ${downloadState.currentBatch.length} серий`,
    );

    // Уведомляем popup о завершении
    chrome.runtime.sendMessage(
      {
        action: "batchDownloadComplete",
        totalDownloaded: downloadState.currentBatch.length,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.log(
            "Popup недоступен для уведомления о завершении:",
            chrome.runtime.lastError.message,
          );
        }
      },
    );

    // Сбрасываем состояние активности после завершения пакетного скачивания через 3 секунды
    setTimeout(() => {
      downloadState.isActive = false;
      downloadState.isBatchMode = false;
      downloadState.currentEpisode = null;
      downloadState.downloadIds = [];
      downloadState.currentBatch = [];
      downloadState.currentIndex = 0;
      downloadState.progress = 0;
      downloadState.status = "Готов к работе";
      downloadState.details = "";
    }, 3000);

    return;
  }

  const currentEpisode = downloadState.currentBatch[downloadState.currentIndex];
  downloadState.progress =
    (downloadState.currentIndex / downloadState.currentBatch.length) * 100;
  downloadState.status = `Скачиваем серию ${currentEpisode.number}`;
  downloadState.details = `${downloadState.currentIndex + 1} из ${downloadState.currentBatch.length}`;

  // Обновляем информацию о текущей серии
  downloadState.currentEpisode = {
    title: currentEpisode.title || "Название не найдено",
    season: currentEpisode.season || "",
    episode: currentEpisode.number || "",
    episodeTitle: currentEpisode.episodeTitle || "",
  };

  console.log("Скачиваем серию:", currentEpisode);

  try {
    // Переходим на страницу нужной серии
    console.log("Переходим на URL серии:", currentEpisode.url);
    await navigateToEpisode(tabId, currentEpisode.url);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Ждем загрузки

    // Запускаем скачивание
    chrome.tabs.sendMessage(tabId, {
      action: "startDownload",
      batchMode: true,
      batchIndex: downloadState.currentIndex,
      batchTotal: downloadState.currentBatch.length,
    });
  } catch (error) {
    console.error("Ошибка при скачивании серии:", error);
    downloadState.status = "Ошибка скачивания";
    downloadState.details = error.message;
  }
}

// Переход на страницу серии
function navigateToEpisode(tabId, url) {
  return new Promise((resolve, reject) => {
    downloadState.status = "Переходим к следующей серии...";
    downloadState.details = "Загружаем страницу";

    chrome.tabs.update(tabId, { url: url }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

// Обновление состояния загрузки
function updateDownloadState(newState) {
  try {
    Object.assign(downloadState, newState);

    // Уведомляем popup об обновлении
    chrome.runtime.sendMessage(
      {
        action: "downloadStateUpdated",
        state: downloadState,
      },
      () => {
        if (chrome.runtime.lastError) {
          // Popup может быть закрыт, это нормально
          console.log(
            "Popup недоступен для обновления:",
            chrome.runtime.lastError.message,
          );
        }
      },
    );
  } catch (error) {
    console.error("Ошибка обновления состояния:", error);
  }
}

// Отмена загрузки
function cancelDownload() {
  console.log("Отмена загрузки");

  // Останавливаем отслеживание
  if (downloadState.trackingInterval) {
    clearInterval(downloadState.trackingInterval);
  }

  downloadState.isActive = false;
  downloadState.isBatchMode = false;
  downloadState.status = "Загрузка отменена";
  downloadState.details = "";

  // Отменяем активные загрузки
  downloadState.downloadIds.forEach((downloadId) => {
    chrome.downloads.cancel(downloadId);
  });

  downloadState.downloadIds = [];
}

// Инициализация при запуске
chrome.runtime.onStartup.addListener(() => {
  console.log("Background script запущен");
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Расширение установлено/обновлено");
});

// Функция для определения, можно ли повторить попытку при данной ошибке
function canRetryError(errorReason) {
  const retryableErrors = [
    "NETWORK_FAILED",
    "NETWORK_TIMEOUT",
    "NETWORK_DISCONNECTED",
    "NETWORK_SERVER_DOWN",
    "SERVER_FAILED",
    "SERVER_NO_RANGE",
    "SERVER_PRECONDITION",
    "CRASH",
  ];

  return retryableErrors.includes(errorReason);
}

// Функция для получения понятного сообщения об ошибке
function getErrorMessage(errorReason) {
  const errorMessages = {
    NETWORK_FAILED: "Сетевая ошибка",
    NETWORK_TIMEOUT: "Превышено время ожидания",
    NETWORK_DISCONNECTED: "Отсутствует интернет-соединение",
    NETWORK_SERVER_DOWN: "Сервер недоступен",
    SERVER_FAILED: "Ошибка сервера",
    SERVER_NO_RANGE: "Сервер не поддерживает докачку",
    SERVER_PRECONDITION: "Ошибка условий сервера",
    FILE_ACCESS_DENIED: "Доступ к файлу запрещён",
    FILE_NO_SPACE: "Недостаточно места на диске",
    FILE_NAME_TOO_LONG: "Слишком длинное имя файла",
    FILE_TOO_LARGE: "Файл слишком большой",
    FILE_VIRUS_INFECTED: "Файл заражён вирусом",
    FILE_TRANSIENT_ERROR: "Временная ошибка файла",
    FILE_BLOCKED: "Файл заблокирован",
    FILE_SECURITY_CHECK_FAILED: "Проверка безопасности не пройдена",
    FILE_TOO_SHORT: "Файл слишком короткий",
    CRASH: "Сбой браузера",
  };

  return errorMessages[errorReason] || `Неизвестная ошибка (${errorReason})`;
}

// Функция для повторной попытки скачивания
function retryDownload(originalDownload) {
  console.log("Повторная попытка скачивания:", originalDownload.filename || 'неизвестно');

  // Сбрасываем статистику
  downloadState.downloadStats = {
    speed: 0,
    totalBytes: 0,
    bytesReceived: 0,
    estimatedEndTime: 0,
  };
  downloadState.startTime = Date.now();

  const downloadOptions = {
    url: originalDownload.url || '',
    filename: originalDownload.filename || 'retry_download.mp4',
    saveAs: false,
  };

  chrome.downloads.download(downloadOptions, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error("Ошибка повторной попытки:", chrome.runtime.lastError);

      downloadState.status = "Скачивание не удалось";
      downloadState.details = "Ошибка повторной попытки";
      downloadState.isActive = false;

      chrome.runtime.sendMessage(
        {
          action: "downloadError",
          error:
            "Не удалось повторить скачивание: " +
            chrome.runtime.lastError.message,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.log(
              "Popup недоступен для уведомления об ошибке повтора:",
              chrome.runtime.lastError.message,
            );
          }
        },
      );
    } else {
      console.log("Повторная попытка запущена с ID:", downloadId);
      downloadState.downloadIds.push(downloadId);
      startProgressTracking(downloadId);
    }
  });
}
