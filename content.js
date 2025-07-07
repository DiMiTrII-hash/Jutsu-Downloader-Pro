/*
 * Jutsu Downloader Pro
 * Copyright © 2024 DiMiTrII-hash
 * Все права защищены. См. LICENSE для условий использования.
 */

// Content script для работы с jut.su

class JutsuDownloader {
  constructor() {
    this.isProcessing = false;
    this.videoElement = null;
    this.watcherInterval = null;
  }

  // Удалена неиспользуемая функция sendStatus - статусы теперь управляются background.js

  // Получение названия аниме
  extractAnimeTitle() {
    let mainTitle = '';
    let episodeTitle = '';
    let episodeNumber = '';
    let seasonNumber = '';
    
    // Извлекаем основное название из span[itemprop="name"]
    const titleElement = document.querySelector('span[itemprop="name"]');
    if (titleElement) {
      // Убираем "Смотреть " из начала
      mainTitle = titleElement.textContent.trim();
      mainTitle = mainTitle.replace(/^Смотреть\s+/i, '');
      
      // Извлекаем номер сезона и серии из основного названия
      const seasonMatch = mainTitle.match(/(\d+)\s*сезон/i);
      const episodeMatch = mainTitle.match(/(\d+)\s*серия/i);
      
      if (seasonMatch) seasonNumber = seasonMatch[1].padStart(2, '0');
      if (episodeMatch) episodeNumber = episodeMatch[1].padStart(2, '0');
      
      // Убираем номера сезона и серии из основного названия для чистоты
      mainTitle = mainTitle.replace(/\s*\d+\s*сезон/i, '').replace(/\s*\d+\s*серия/i, '').trim();
    }
    
    // Извлекаем название серии из div.video_plate_title h2
    const episodeTitleElement = document.querySelector('div.video_plate_title h2');
    if (episodeTitleElement) {
      episodeTitle = episodeTitleElement.textContent.trim();
    }
    
    // Формируем красивое название: Номер серии - Название серии - Основное название + сезон
    let finalTitle = '';
    
    // Начинаем с номера серии
    if (episodeNumber) {
      finalTitle += `${parseInt(episodeNumber)} серия`;
    }
    
    // Добавляем название серии
    if (episodeTitle) {
      if (finalTitle) finalTitle += ' - ';
      finalTitle += episodeTitle;
    }
    
    // Добавляем основное название с сезоном
    if (mainTitle) {
      if (finalTitle) finalTitle += ' - ';
      finalTitle += mainTitle;
      
      // Добавляем сезон в конце
      if (seasonNumber) {
        finalTitle += ` ${parseInt(seasonNumber)} сезон`;
      }
    }
    
    return finalTitle || null;
  }

  // Поиск видео плеера
  findVideoPlayer() {
    const videoElement = document.querySelector('video#my-player_html5_api');
    return videoElement;
  }

  // Извлечение ссылки 1080p
  extractVideoUrl(videoElement) {
    if (!videoElement) return null;
    
    const sources = videoElement.querySelectorAll('source');
    for (let source of sources) {
      const resolution = source.getAttribute('res') || source.getAttribute('label');
      if (resolution === '1080' || resolution === '1080p') {
        return source.getAttribute('src');
      }
    }
    return null;
  }

  // Извлечение информации о серии для передачи в background
  extractEpisodeInfo() {
    const titleElement = document.querySelector('span[itemprop="name"]');
    const episodeTitleElement = document.querySelector('div.video_plate_title h2') ||
                               document.querySelector('span h2');
    
    let title = '';
    let season = '';
    let episode = '';
    let episodeTitle = '';
    
    if (titleElement) {
      const mainTitle = titleElement.textContent.trim().replace(/^Смотреть\s+/i, '');
      
      // Извлекаем сезон и серию
      const seasonMatch = mainTitle.match(/(\d+)\s*сезон/i);
      const episodeMatch = mainTitle.match(/(\d+)\s*серия/i);
      
      if (seasonMatch) season = seasonMatch[1];
      if (episodeMatch) episode = episodeMatch[1];
      
      // Очищаем название от номеров
      title = mainTitle.replace(/\s*\d+\s*сезон/i, '').replace(/\s*\d+\s*серия/i, '').trim();
    }
    
    if (episodeTitleElement) {
      episodeTitle = episodeTitleElement.textContent.trim();
    }
    
    return {
      title: title,
      season: season,
      episode: episode,
      episodeTitle: episodeTitle
    };
  }
  
  // Создание корректного имени файла
  createValidFilename(title) {
    if (!title) return 'anime.mp4';
    
    // Таблица транслитерации для случаев когда русские символы не поддерживаются
    const translitMap = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
      'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
      'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
      'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
      // Дополнительные символы
      '—': '-', '–': '-', '«': '"', '»': '"', '№': 'No'
    };
    
    // Сначала пробуем сохранить русские символы
    let filename = title
      .replace(/[<>:"/\\|?*]/g, '') // Убираем только недопустимые символы
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на одиночные
      .trim();
    
    // Если русские символы не поддерживаются, используем транслитерацию
    const needsTranslit = /[а-яё]/i.test(filename);
    if (needsTranslit) {
      // Создаем версии с русскими символами и с транслитерацией
      const cyrillicFilename = filename;
      const translitFilename = filename.replace(/[а-яё]/gi, char => translitMap[char] || char);
      
      // Отправляем оба варианта в background script
      return {
        cyrillic: `${cyrillicFilename}.mp4`,
        translit: `${translitFilename}.mp4`,
        original: cyrillicFilename
      };
    }
    
    // Если имя слишком длинное, обрезаем
    if (filename.length > 200) {
      filename = filename.substring(0, 200).trim();
    }
    
    // Если имя пустое после очистки, используем дефолтное
    if (!filename) {
      filename = 'anime';
    }
    
    return `${filename}.mp4`;
  }

  // Запуск плеера если видео не загружено
  triggerPlayer() {
    console.log('Пытаемся запустить плеер...');
    
    // Пробуем различные способы запуска плеера
    const videoElement = this.findVideoPlayer();
    if (videoElement) {
      // Кликаем по видео
      videoElement.click();
      
      // Также пробуем найти кнопку play
      const playButton = document.querySelector('.vjs-play-control, .vjs-big-play-button');
      if (playButton) {
        playButton.click();
      }
    }

    // Ищем любые элементы управления плеером
    const playerControls = document.querySelectorAll('[class*="play"], [class*="player"]');
    playerControls.forEach(control => {
      if (control.style.display !== 'none') {
        control.click();
      }
    });
  }

  // Ожидание появления ссылки на видео
  waitForVideoUrl(timeout = 30000) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = timeout / 1000; // проверяем каждую секунду
      
      this.watcherInterval = setInterval(() => {
        attempts++;
        console.log(`Ожидание видео... (${attempts}/${maxAttempts})`);
        
        const videoElement = this.findVideoPlayer();
        if (videoElement) {
          const videoUrl = this.extractVideoUrl(videoElement);
          if (videoUrl) {
            clearInterval(this.watcherInterval);
            resolve(videoUrl);
            return;
          }
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(this.watcherInterval);
          reject(new Error('Timeout: видео не появилось в течение 30 секунд'));
        }
      }, 1000);
    });
  }

  // Скачивание видео
  downloadVideo(videoUrl, filename, episodeInfo = null) {
    console.log('Начинаем скачивание...');
    
    try {
      // Обрабатываем разные форматы имени файла
      let filenameToSend;
      let displayName;
      
      if (typeof filename === 'object' && filename.cyrillic) {
        // Сначала пробуем русское название
        filenameToSend = filename.cyrillic;
        displayName = filename.original;
        console.log(`Файл: ${displayName}`);
      } else {
        filenameToSend = filename;
        displayName = filename.replace('.mp4', '');
      }
      
      console.log('Начинаем скачивание файла:', filenameToSend);
      
      // Используем Chrome Downloads API
      chrome.runtime.sendMessage({
        action: 'downloadFile',
        url: videoUrl,
        filename: filenameToSend,
        filenameBackup: typeof filename === 'object' ? filename.translit : null,
        episodeInfo: episodeInfo
      }, (response) => {
        if (response && response.success) {
          console.log('Скачивание успешно запущено');
          // НЕ отправляем downloadComplete здесь - это произойдет в background.js когда скачивание действительно завершится
        } else {
          console.error('Ошибка при запуске скачивания:', response);
          throw new Error(response ? response.error : 'Неизвестная ошибка');
        }
      });
    } catch (error) {
      console.error('Ошибка в downloadVideo:', error);
      chrome.runtime.sendMessage({action: 'downloadError', error: error.message});
    }
  }

  // Основная функция
  async startDownload() {
    if (this.isProcessing) {
      console.log('Процесс уже запущен!');
      return;
    }

    this.isProcessing = true;

    try {
      // Шаг 1: Извлекаем название
      console.log('Извлекаем название аниме и серии...');
      const animeTitle = this.extractAnimeTitle();
      
      if (!animeTitle) {
        throw new Error('Не удалось найти название аниме');
      }
      
      console.log(`Найдено: ${animeTitle}`);

      // Шаг 2: Ищем видео плеер
      console.log('Ищем видео плеер...');
      let videoElement = this.findVideoPlayer();
      
      if (!videoElement) {
        throw new Error('Видео плеер не найден');
      }

      // Шаг 3: Пробуем извлечь ссылку
      console.log('Ищем ссылку на видео 1080p...');
      let videoUrl = this.extractVideoUrl(videoElement);

      // Шаг 4: Если ссылки нет, запускаем плеер и ждем
      if (!videoUrl) {
        console.log('Ссылка не найдена, запускаем плеер...');
        this.triggerPlayer();
        
        try {
          videoUrl = await this.waitForVideoUrl();
        } catch (error) {
          throw new Error('Не удалось получить ссылку на видео: ' + error.message);
        }
      }

      console.log(`Найдена ссылка: ${videoUrl.substring(0, 50)}...`);

      // Шаг 5: Формируем имя файла
      const filename = this.createValidFilename(animeTitle);
      
      // Шаг 6: Собираем информацию о серии
      const episodeInfo = this.extractEpisodeInfo();
      
      // Шаг 7: Скачиваем
      this.downloadVideo(videoUrl, filename, episodeInfo);

    } catch (error) {
      console.error('Ошибка: ' + error.message);
      chrome.runtime.sendMessage({action: 'downloadError', error: error.message});
    } finally {
      this.isProcessing = false;
      if (this.watcherInterval) {
        clearInterval(this.watcherInterval);
      }
    }
  }
}

// Создаем экземпляр загрузчика
const downloader = new JutsuDownloader();

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    // Простой ping для проверки доступности
    sendResponse({status: 'ok'});
    return true;
  } else if (request.action === 'startDownload') {
    downloader.startDownload();
    sendResponse({success: true});
  } else if (request.action === 'getAnimeInfo') {
    const titleElement = document.querySelector('span[itemprop="name"]') || 
                        document.querySelector('.video_plate_title h2');
    
    // Расширенный поиск элемента с информацией о серии
    const episodeElement = document.querySelector('span h2') ||
                          document.querySelector('div.video_plate_title h2') ||
                          document.querySelector('.video_plate_title h2') ||
                          document.querySelector('h1') ||
                          document.querySelector('.video_plate_title') ||
                          document.querySelector('[class*="episode"]') ||
                          document.querySelector('[class*="title"]') ||
                          titleElement;
    
    console.log('Элементы найдены:', {
      titleElement: titleElement ? titleElement.textContent : 'не найден',
      episodeElement: episodeElement ? episodeElement.textContent : 'не найден',
      url: window.location.href
    });
    
    // Извлекаем иконку аниме - пробуем разные способы
    let animeIconUrl = null;
    
    // Способ 1: ищем .all_anime_title.aat_ep
    const animeIconElement = document.querySelector('.all_anime_title.aat_ep');
    if (animeIconElement) {
      const backgroundImage = window.getComputedStyle(animeIconElement).backgroundImage;
      const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (urlMatch) {
        animeIconUrl = urlMatch[1];
      }
    }
    
    // Способ 2: ищем другие возможные селекторы
    if (!animeIconUrl) {
      const altSelectors = [
        '.all_anime_title',
        '.anime_poster img',
        '.anime_info img',
        'img[src*="animethumbs"]',
        'img[src*="uploads"]'
      ];
      
      for (const selector of altSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          if (element.tagName === 'IMG') {
            animeIconUrl = element.src;
            break;
          } else {
            const bg = window.getComputedStyle(element).backgroundImage;
            const match = bg.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match) {
              animeIconUrl = match[1];
              break;
            }
          }
        }
      }
    }
    
    // Способ 3: ищем в атрибутах style
    if (!animeIconUrl) {
      const styleElements = document.querySelectorAll('[style*="background"]');
      for (const element of styleElements) {
        const style = element.getAttribute('style');
        if (style && style.includes('animethumbs')) {
          const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (match) {
            animeIconUrl = match[1];
            break;
          }
        }
      }
    }
    
    const cleanedTitle = titleElement ? cleanAnimeTitle(titleElement.textContent) : null;
    const parsedEpisode = episodeElement ? parseEpisodeInfo(episodeElement.textContent) : null;
    
    console.log('Обработанные данные:', {
      cleanedTitle,
      parsedEpisode,
      animeIconUrl
    });
    
    sendResponse({
      success: true,
      title: cleanedTitle,
      episode: parsedEpisode,
      animeIcon: animeIconUrl
    });
    return;
  } else if (request.action === 'getNextEpisodes') {
    const nextEpisodes = findNextEpisodes();
    sendResponse({
      success: true,
      nextEpisodes: nextEpisodes
    });
    return;
  }
  return true;
});

// Вспомогательные функции для обработки информации об аниме
function cleanAnimeTitle(text) {
  if (!text) return null;
  
  // Убираем "Смотреть" в начале
  let cleaned = text.replace(/^Смотреть\s+/i, '').trim();
  
  // Убираем информацию о сезоне и серии для получения чистого названия
  cleaned = cleaned.replace(/\s*\d+\s*сезон\s*\d*\s*серия/i, '');
  cleaned = cleaned.replace(/\s*\d+\s*сезон/i, '');
  cleaned = cleaned.replace(/\s*\d+\s*серия/i, '');
  
  return cleaned.trim();
}

function parseEpisodeInfo(text) {
  if (!text) return null;
  
  const result = [];
  
  // Ищем сезон - расширенный поиск
  const seasonMatch = text.match(/(\d+)\s*сезон/i) || 
                     text.match(/season\s*(\d+)/i) ||
                     text.match(/s(\d+)/i);
  if (seasonMatch) {
    result.push(`Сезон ${seasonMatch[1]}`);
  }
  
  // Ищем серию - расширенный поиск
  const episodeMatch = text.match(/(\d+)\s*серия/i) || 
                      text.match(/episode\s*(\d+)/i) ||
                      text.match(/ep\s*(\d+)/i) ||
                      text.match(/e(\d+)/i);
  if (episodeMatch) {
    result.push(`серия ${episodeMatch[1]}`);
  }
  
  // Если не нашли в основном тексте, пробуем найти в URL
  if (result.length === 0) {
    const url = window.location.href;
    const urlSeasonMatch = url.match(/season-(\d+)/i);
    const urlEpisodeMatch = url.match(/episode-(\d+)/i);
    
    if (urlSeasonMatch) {
      result.push(`Сезон ${urlSeasonMatch[1]}`);
    }
    if (urlEpisodeMatch) {
      result.push(`серия ${urlEpisodeMatch[1]}`);
    }
  }
  
  // Ищем название серии - сначала в span h2, потом в других местах
  let episodeTitle = '';
  
  // Приоритетный поиск в span h2
  const spanH2Element = document.querySelector('span h2');
  if (spanH2Element) {
    episodeTitle = spanH2Element.textContent.trim();
  }
  
  // Если не нашли в span h2, ищем в других местах
  if (!episodeTitle) {
    episodeTitle = text.replace(/.*?\d+\s*серия\s*/i, '').trim();
    
    if (!episodeTitle || episodeTitle === text) {
      const episodeTitleElement = document.querySelector('.video_plate_title h2') ||
                                 document.querySelector('h1') || 
                                 document.querySelector('.video_plate_title') ||
                                 document.querySelector('[class*="episode"]') ||
                                 document.querySelector('[class*="title"]');
      
      if (episodeTitleElement) {
        episodeTitle = episodeTitleElement.textContent.trim();
        // Убираем информацию о сезоне/серии из названия
        episodeTitle = episodeTitle.replace(/\d+\s*сезон/i, '').replace(/\d+\s*серия/i, '').trim();
      }
    }
  }
  
  if (episodeTitle && episodeTitle.length > 0) {
    if (result.length > 0) {
      return result.join(', ') + ' • ' + episodeTitle;
    } else {
      return episodeTitle;
    }
  }
  
  return result.join(', ') || text.trim();
}

// Функция для поиска следующих серий
function findNextEpisodes() {
  const episodes = [];
  
  // Получаем информацию о текущей серии из URL
  const currentUrl = window.location.pathname;
  const currentEpisode = extractEpisodeNumber(currentUrl);
  const currentSeason = extractSeasonNumber(currentUrl);
  
  console.log('Текущая серия:', currentEpisode, 'Сезон:', currentSeason);
  
  if (!currentEpisode) {
    console.log('Не удалось определить номер текущей серии');
    return episodes;
  }
  
  // Добавляем текущую серию как первую в очереди
  episodes.push({
    url: window.location.href,
    title: `Серия ${currentEpisode} (текущая)`,
    number: currentEpisode,
    isCurrent: true
  });
  
  // Формируем базовый паттерн URL
  const basePattern = currentUrl.replace(/episode-\d+\.html$/, 'episode-');
  
  // Ищем кнопку "следующая серия" для проверки существования
  const nextButton = document.querySelector('a.short-btn.green.video.vnright.the_hildi.there_is_link_to_next_episode');
  
  if (nextButton) {
    const nextHref = nextButton.getAttribute('href');
    const nextEpisodeNum = extractEpisodeNumber(nextHref);
    
    console.log('Найдена кнопка следующей серии:', nextEpisodeNum);
    
    // Добавляем следующие серии начиная с найденной
    if (nextEpisodeNum) {
      // Добавляем следующие 15 серий
      for (let i = nextEpisodeNum; i <= nextEpisodeNum + 14; i++) {
        const episodeUrl = `${window.location.origin}${basePattern}${i}.html`;
        episodes.push({
          url: episodeUrl,
          title: `Серия ${i}`,
          number: i,
          isCurrent: false
        });
      }
    }
  } else {
    console.log('Кнопка следующей серии не найдена, генерируем URL по паттерну');
    
    // Если кнопки нет, пробуем сгенерировать следующие серии по паттерну
    for (let i = currentEpisode + 1; i <= currentEpisode + 15; i++) {
      const episodeUrl = `${window.location.origin}${basePattern}${i}.html`;
      episodes.push({
        url: episodeUrl,
        title: `Серия ${i}`,
        number: i,
        isCurrent: false
      });
    }
  }
  
  console.log('Сформирована очередь серий:', episodes);
  return episodes;
}

// Функция для извлечения номера серии из URL
function extractEpisodeNumber(url) {
  const match = url.match(/episode-(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// Функция для извлечения номера сезона из URL
function extractSeasonNumber(url) {
  const match = url.match(/season-(\d+)/);
  return match ? parseInt(match[1]) : null;
} 