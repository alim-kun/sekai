const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DATA_FILE = path.join(__dirname, 'anime.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const QUIZZES_FILE = path.join(__dirname, 'quizzes.json');
const REWARDS_FILE = path.join(__dirname, 'rewards.json');
const QUESTS_FILE = path.join(__dirname, 'quests.json');
const TICKETS_FILE = path.join(__dirname, 'tickets.json');
const POSTS_FILE = path.join(__dirname, 'posts.json');

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=300';

const DEFAULT_REWARDS = [
  {
    id: 'rew_genshin_skin',
    title: 'Genshin Impact x SEKAI Skin',
    desc: 'Exclusive Demon Slayer crossover skin for your character.',
    img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600',
    cost: 2500,
    minLevel: 1,
    badge: 'EXCLUSIVE'
  },
  {
    id: 'rew_figure_box',
    title: 'Demon Slayer Figure Box',
    desc: 'Official 1/8 scale Tanjiro figure, limited SEKAI edition.',
    img: 'https://m.media-amazon.com/images/M/MV5BMWU1OGEwNmQtNGM3MS00YTYyLThmYmMtN2FjYzQzNzNmNTE0XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
    cost: 15000,
    minLevel: 30,
    badge: 'EXCLUSIVE'
  },
  {
    id: 'rew_wallpaper',
    title: 'Century Watcher Wallpaper',
    desc: 'Exclusive 4K cinematic wallpaper unlocked by watching 100+ anime.',
    img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600',
    cost: 0,
    minLevel: 1,
    badge: 'FREE'
  }
];

const DEFAULT_QUESTS = [
  {
    id: 'q_watchlist_1',
    title: 'Первый шаг в каталоге',
    desc: 'Добавьте хотя бы 1 аниме в свой Watchlist.',
    type: 'watchlist',
    target: 1,
    rewardXp: 250,
    daily: true
  },
  {
    id: 'q_profile_bio',
    title: 'Личность охотника',
    desc: 'Заполните описание профиля (Bio).',
    type: 'profile_bio',
    target: 1,
    rewardXp: 200,
    daily: true
  },
  {
    id: 'q_post_1',
    title: 'Голос сообщества',
    desc: 'Опубликуйте 1 пост в разделе Community.',
    type: 'posts',
    target: 1,
    rewardXp: 300,
    daily: true
  },
  {
    id: 'q_ticket_1',
    title: 'Связь с поддержкой',
    desc: 'Отправьте обращение в Support (или получите ответ).',
    type: 'tickets',
    target: 1,
    rewardXp: 150,
    daily: true
  }
];

const DEFAULT_QUIZZES = [
  {
    id: 'demonslayer',
    title: 'Demon Slayer Quiz',
    desc: 'Test your knowledge on Tanjiro and Hashira.',
    img: 'https://m.media-amazon.com/images/M/MV5BMWU1OGEwNmQtNGM3MS00YTYyLThmYmMtN2FjYzQzNzNmNTE0XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
    questions: [
      {
        question: "What is Tanjiro's primary breathing style initially?",
        options: ['Water Breathing', 'Sun Breathing', 'Flame Breathing', 'Thunder Breathing'],
        correct: 0
      },
      {
        question: "What is the name of Tanjiro's sister?",
        options: ['Nezuko', 'Shinobu', 'Mitsuri', 'Kanao'],
        correct: 0
      },
      {
        question: 'Who is the leader of the Demon Slayer Corps?',
        options: ['Muzan Kibutsuji', 'Kagaya Ubuyashiki', 'Yoriichi', 'Sakonji'],
        correct: 1
      }
    ]
  }
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readJsonArray(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
    return JSON.parse(JSON.stringify(fallback));
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : JSON.parse(JSON.stringify(fallback));
  } catch (err) {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function writeJsonArray(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: user.password,
    xp: Number(user.xp ?? 500),
    level: Number(user.level ?? 1),
    isAdmin: Boolean(user.isAdmin),
    watchlist: Array.isArray(user.watchlist) ? user.watchlist : [],
    avatar: user.avatar || DEFAULT_AVATAR,
    gender: user.gender || 'Не указан',
    age: user.age === '' || user.age === undefined ? null : user.age,
    bio: user.bio || '',
    claimedQuests: Array.isArray(user.claimedQuests) ? user.claimedQuests : [],
    watchedEpisodes: Array.isArray(user.watchedEpisodes) ? user.watchedEpisodes : [],
    claimedRewards: Array.isArray(user.claimedRewards) ? user.claimedRewards : []
  };
}

function toSafeUser(user) {
  const n = normalizeUser(user);
  const { password: _, ...safe } = n;
  return safe;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    const maxBytes = 8 * 1024 * 1024;
    req.on('data', chunk => {
      body += chunk.toString('utf8');
      if (body.length > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  // --- AUTH ---
  if (urlPath === '/api/register' && req.method === 'POST') {
    try {
      const { name, email, password } = await parseBody(req);
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPassword = String(password || '');
      const cleanName = String(name || '').trim() || cleanEmail.split('@')[0] || 'User';

      if (!cleanEmail || !cleanPassword) {
        return sendJson(res, 400, { error: 'Укажите email и пароль' });
      }

      const users = readJsonArray(USERS_FILE, []);
      if (users.some(u => String(u.email || '').toLowerCase() === cleanEmail)) {
        return sendJson(res, 409, { error: 'Пользователь с таким email уже зарегистрирован' });
      }

      const newUser = normalizeUser({
        id: Date.now(),
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        xp: 500,
        level: 1,
        isAdmin: false,
        watchlist: [],
        avatar: DEFAULT_AVATAR,
        gender: 'Не указан',
        age: null,
        bio: ''
      });

      users.push(newUser);
      writeJsonArray(USERS_FILE, users);
      return sendJson(res, 201, { user: toSafeUser(newUser) });
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка регистрации' });
    }
  }

  if (urlPath === '/api/login' && req.method === 'POST') {
    try {
      const { email, password } = await parseBody(req);
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPassword = String(password || '');

      const users = readJsonArray(USERS_FILE, []);
      const found = users.find(
        u => String(u.email || '').toLowerCase() === cleanEmail && u.password === cleanPassword
      );
      if (!found) {
        return sendJson(res, 401, { error: 'Аккаунт не найден или неверный пароль.' });
      }
      return sendJson(res, 200, { user: toSafeUser(found) });
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка входа' });
    }
  }

  // --- PROFILE ---
  if (urlPath === '/api/profile' && req.method === 'PUT') {
    try {
      const { id, email, name, avatar, gender, age, bio, xp, level, watchlist, claimedQuests, watchedEpisodes, claimedRewards } = await parseBody(req);
      const users = readJsonArray(USERS_FILE, []);
      const idx = users.findIndex(u => {
        if (id !== undefined && id !== null && Number(u.id) === Number(id)) return true;
        if (email && String(u.email || '').toLowerCase() === String(email).trim().toLowerCase()) return true;
        return false;
      });
      if (idx === -1) return sendJson(res, 404, { error: 'Пользователь не найден' });

      const current = normalizeUser(users[idx]);
      const cleanName = name !== undefined ? String(name).trim() : current.name;
      if (!cleanName) return sendJson(res, 400, { error: 'Имя не может быть пустым' });

      let parsedAge = current.age;
      if (age !== undefined) {
        if (age === '' || age === null) {
          parsedAge = null;
        } else {
          const numAge = Number(age);
          if (!Number.isFinite(numAge) || numAge < 1 || numAge > 120) {
            return sendJson(res, 400, { error: 'Укажите корректный возраст (от 1 до 120)' });
          }
          parsedAge = Math.trunc(numAge);
        }
      }

      const allowedGenders = ['Не указан', 'Мужской', 'Женский', 'Другой'];
      const cleanGender = gender !== undefined
        ? (allowedGenders.includes(String(gender)) ? String(gender) : 'Не указан')
        : current.gender;

      const updatedUser = normalizeUser({
        ...current,
        name: cleanName,
        avatar: avatar !== undefined ? (String(avatar).trim() || DEFAULT_AVATAR) : current.avatar,
        gender: cleanGender,
        age: parsedAge,
        bio: bio !== undefined ? String(bio).trim().slice(0, 500) : current.bio,
        xp: xp !== undefined ? Math.max(0, Number(xp)) : current.xp,
        level: level !== undefined ? Math.max(1, Number(level)) : current.level,
        watchlist: Array.isArray(watchlist) ? watchlist : current.watchlist,
        claimedQuests: Array.isArray(claimedQuests) ? claimedQuests : current.claimedQuests,
        watchedEpisodes: Array.isArray(watchedEpisodes) ? watchedEpisodes : current.watchedEpisodes,
        claimedRewards: Array.isArray(claimedRewards) ? claimedRewards : current.claimedRewards
      });

      users[idx] = updatedUser;
      writeJsonArray(USERS_FILE, users);
      return sendJson(res, 200, { user: toSafeUser(updatedUser) });
    } catch (err) {
      if (err && err.message === 'Payload too large') {
        return sendJson(res, 413, { error: 'Файл аватарки слишком большой (макс. ~4 МБ)' });
      }
      return sendJson(res, 400, { error: 'Ошибка обновления профиля' });
    }
  }

  // --- LEADERBOARD ---

  if (urlPath === '/api/leaderboard' && req.method === 'GET') {
    try {
      const users = readJsonArray(USERS_FILE, [])
        .map(toSafeUser)
        .filter(u => !u.isAdmin)
        .sort((a, b) => (b.xp || 0) - (a.xp || 0));
      return sendJson(res, 200, users);
    } catch (err) {
      return sendJson(res, 500, { error: 'Ошибка загрузки рейтинга' });
    }
  }

  // --- ANIME ---
  if (urlPath === '/api/anime' && req.method === 'GET') {
    return sendJson(res, 200, readJsonArray(DATA_FILE, []));
  }

  if (urlPath === '/api/anime' && req.method === 'POST') {
    try {
      const { title, eps, genre, rating, tag, img, currentEpName, desc, youtubeUrl } = await parseBody(req);
      if (!title || !String(title).trim()) {
        return sendJson(res, 400, { error: 'Название обязательно' });
      }
      const list = readJsonArray(DATA_FILE, []);
      const newAnime = {
        id: Date.now(),
        title: String(title).trim(),
        eps: Number(eps) || 12,
        genre: genre || 'Action',
        rating: Number(rating) || 9.0,
        tag: tag || 'NEW',
        img: img || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600',
        currentEpName: currentEpName || 'Ep. 1: Premier',
        desc: desc || 'Описание отсутствует.',
        youtubeUrl: youtubeUrl ? String(youtubeUrl).trim() : ''
      };
      list.unshift(newAnime);
      writeJsonArray(DATA_FILE, list);
      return sendJson(res, 201, newAnime);
    } catch (err) {
      return sendJson(res, 400, { error: 'Некорректный JSON или ошибка сохранения' });
    }
  }

  const animeItemMatch = urlPath.match(/^\/api\/anime\/(\d+)$/);
  if (animeItemMatch && req.method === 'PUT') {
    try {
      const id = Number(animeItemMatch[1]);
      const { title, eps, genre, rating, tag, img, currentEpName, desc, youtubeUrl } = await parseBody(req);
      const list = readJsonArray(DATA_FILE, []);
      const idx = list.findIndex(item => Number(item.id) === id);
      if (idx === -1) return sendJson(res, 404, { error: 'Аниме не найдено' });
      if (title !== undefined && !String(title).trim()) {
        return sendJson(res, 400, { error: 'Название не может быть пустым' });
      }
      const current = list[idx];
      const updated = {
        ...current,
        title: title !== undefined ? String(title).trim() : current.title,
        eps: eps !== undefined ? (Number(eps) || current.eps) : current.eps,
        genre: genre !== undefined ? (String(genre).trim() || current.genre) : current.genre,
        rating: rating !== undefined ? (Number(rating) || current.rating) : current.rating,
        tag: tag !== undefined ? (String(tag).trim() || current.tag) : current.tag,
        img: img !== undefined ? (String(img).trim() || current.img) : current.img,
        currentEpName: currentEpName !== undefined ? String(currentEpName) : current.currentEpName,
        desc: desc !== undefined ? String(desc) : current.desc,
        youtubeUrl: youtubeUrl !== undefined ? String(youtubeUrl).trim() : (current.youtubeUrl || '')
      };
      list[idx] = updated;
      writeJsonArray(DATA_FILE, list);
      return sendJson(res, 200, updated);
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка обновления аниме' });
    }
  }

  if (animeItemMatch && req.method === 'DELETE') {
    try {
      const id = Number(animeItemMatch[1]);
      const list = readJsonArray(DATA_FILE, []);
      const filtered = list.filter(item => Number(item.id) !== id);
      if (filtered.length === list.length) return sendJson(res, 404, { error: 'Аниме не найдено' });
      writeJsonArray(DATA_FILE, filtered);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 500, { error: 'Ошибка удаления аниме' });
    }
  }

  // --- QUIZZES ---
  if (urlPath === '/api/quizzes' && req.method === 'GET') {
    return sendJson(res, 200, readJsonArray(QUIZZES_FILE, DEFAULT_QUIZZES));
  }

  if (urlPath === '/api/quizzes' && req.method === 'POST') {
    try {
      const { title, desc, img, questions } = await parseBody(req);
      const cleanTitle = String(title || '').trim();
      if (!cleanTitle) return sendJson(res, 400, { error: 'Название квиза обязательно' });
      if (!Array.isArray(questions) || questions.length === 0) {
        return sendJson(res, 400, { error: 'Добавьте хотя бы один вопрос' });
      }
      const validQuestions = questions
        .filter(q => q && String(q.question || '').trim() && Array.isArray(q.options) && q.options.length >= 2)
        .map(q => {
          const cleanOptions = q.options.map(opt => String(opt || '').trim()).filter(Boolean);
          const rawCorrect = Number(q.correct);
          const safeCorrect = Number.isInteger(rawCorrect) && rawCorrect >= 0 && rawCorrect < cleanOptions.length ? rawCorrect : 0;
          return { question: String(q.question).trim(), options: cleanOptions, correct: safeCorrect };
        })
        .filter(q => q.options.length >= 2);
      if (!validQuestions.length) {
        return sendJson(res, 400, { error: 'Каждый вопрос должен содержать текст и минимум 2 варианта ответа' });
      }
      const quizzes = readJsonArray(QUIZZES_FILE, DEFAULT_QUIZZES);
      const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '') || 'quiz';
      const newQuiz = {
        id: `${slug}${Date.now()}`,
        title: cleanTitle,
        desc: String(desc || '').trim() || 'Интересный аниме квиз.',
        img: String(img || '').trim() || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600',
        questions: validQuestions
      };
      quizzes.push(newQuiz);
      writeJsonArray(QUIZZES_FILE, quizzes);
      return sendJson(res, 201, newQuiz);
    } catch (err) {
      return sendJson(res, 400, { error: 'Некорректный JSON или ошибка сохранения квиза' });
    }
  }

  const quizItemMatch = urlPath.match(/^\/api\/quizzes\/([a-zA-Z0-9_-]+)$/);
  if (quizItemMatch && req.method === 'PUT') {
    try {
      const quizId = quizItemMatch[1];
      const { title, desc, img, questions } = await parseBody(req);
      const quizzes = readJsonArray(QUIZZES_FILE, DEFAULT_QUIZZES);
      const idx = quizzes.findIndex(item => String(item.id) === quizId);
      if (idx === -1) return sendJson(res, 404, { error: 'Квиз не найден' });
      const current = quizzes[idx];
      const cleanTitle = title !== undefined ? String(title).trim() : current.title;
      if (!cleanTitle) return sendJson(res, 400, { error: 'Название квиза обязательно' });
      let nextQuestions = current.questions;
      if (questions !== undefined) {
        if (!Array.isArray(questions) || questions.length === 0) {
          return sendJson(res, 400, { error: 'Добавьте хотя бы один вопрос' });
        }
        nextQuestions = questions
          .filter(q => q && String(q.question || '').trim() && Array.isArray(q.options) && q.options.length >= 2)
          .map(q => {
            const cleanOptions = q.options.map(opt => String(opt || '').trim()).filter(Boolean);
            const rawCorrect = Number(q.correct);
            const safeCorrect = Number.isInteger(rawCorrect) && rawCorrect >= 0 && rawCorrect < cleanOptions.length ? rawCorrect : 0;
            return { question: String(q.question).trim(), options: cleanOptions, correct: safeCorrect };
          })
          .filter(q => q.options.length >= 2);
        if (!nextQuestions.length) {
          return sendJson(res, 400, { error: 'Каждый вопрос должен содержать текст и минимум 2 варианта ответа' });
        }
      }
      const updatedQuiz = {
        ...current,
        title: cleanTitle,
        desc: desc !== undefined ? String(desc).trim() : current.desc,
        img: img !== undefined ? (String(img).trim() || current.img) : current.img,
        questions: nextQuestions
      };
      quizzes[idx] = updatedQuiz;
      writeJsonArray(QUIZZES_FILE, quizzes);
      return sendJson(res, 200, updatedQuiz);
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка обновления квиза' });
    }
  }

  if (quizItemMatch && req.method === 'DELETE') {
    try {
      const quizId = quizItemMatch[1];
      const quizzes = readJsonArray(QUIZZES_FILE, DEFAULT_QUIZZES);
      const filtered = quizzes.filter(item => String(item.id) !== quizId);
      if (filtered.length === quizzes.length) return sendJson(res, 404, { error: 'Квиз не найден' });
      writeJsonArray(QUIZZES_FILE, filtered);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 500, { error: 'Ошибка удаления квиза' });
    }
  }

  // --- REWARDS ---
  if (urlPath === '/api/rewards' && req.method === 'GET') {
    return sendJson(res, 200, readJsonArray(REWARDS_FILE, DEFAULT_REWARDS));
  }

  if (urlPath === '/api/rewards' && req.method === 'POST') {
    try {
      const { title, desc, img, cost, minLevel, badge } = await parseBody(req);
      const cleanTitle = String(title || '').trim();
      if (!cleanTitle) return sendJson(res, 400, { error: 'Название награды обязательно' });
      const rewards = readJsonArray(REWARDS_FILE, DEFAULT_REWARDS);
      const newReward = {
        id: `rew_${Date.now()}`,
        title: cleanTitle,
        desc: String(desc || '').trim() || 'Награда платформы SEKAI.',
        img: String(img || '').trim() || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600',
        cost: Math.max(0, Number(cost) || 0),
        minLevel: Math.max(1, Number(minLevel) || 1),
        badge: String(badge || 'REWARD').trim() || 'REWARD'
      };
      rewards.push(newReward);
      writeJsonArray(REWARDS_FILE, rewards);
      return sendJson(res, 201, newReward);
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка создания награды' });
    }
  }

  const rewardItemMatch = urlPath.match(/^\/api\/rewards\/([a-zA-Z0-9_-]+)$/);
  if (rewardItemMatch && req.method === 'PUT') {
    try {
      const rewardId = rewardItemMatch[1];
      const { title, desc, img, cost, minLevel, badge } = await parseBody(req);
      const rewards = readJsonArray(REWARDS_FILE, DEFAULT_REWARDS);
      const idx = rewards.findIndex(r => String(r.id) === rewardId);
      if (idx === -1) return sendJson(res, 404, { error: 'Награда не найдена' });
      const current = rewards[idx];
      const cleanTitle = title !== undefined ? String(title).trim() : current.title;
      if (!cleanTitle) return sendJson(res, 400, { error: 'Название награды обязательно' });
      const updated = {
        ...current,
        title: cleanTitle,
        desc: desc !== undefined ? String(desc).trim() : current.desc,
        img: img !== undefined ? (String(img).trim() || current.img) : current.img,
        cost: cost !== undefined ? Math.max(0, Number(cost) || 0) : current.cost,
        minLevel: minLevel !== undefined ? Math.max(1, Number(minLevel) || 1) : current.minLevel,
        badge: badge !== undefined ? (String(badge).trim() || current.badge) : current.badge
      };
      rewards[idx] = updated;
      writeJsonArray(REWARDS_FILE, rewards);
      return sendJson(res, 200, updated);
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка обновления награды' });
    }
  }

  if (rewardItemMatch && req.method === 'DELETE') {
    try {
      const rewardId = rewardItemMatch[1];
      const rewards = readJsonArray(REWARDS_FILE, DEFAULT_REWARDS);
      const filtered = rewards.filter(r => String(r.id) !== rewardId);
      if (filtered.length === rewards.length) return sendJson(res, 404, { error: 'Награда не найдена' });
      writeJsonArray(REWARDS_FILE, filtered);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 500, { error: 'Ошибка удаления награды' });
    }
  }

  // --- QUESTS ---
  if (urlPath === '/api/quests' && req.method === 'GET') {
    return sendJson(res, 200, readJsonArray(QUESTS_FILE, DEFAULT_QUESTS));
  }

  if (urlPath === '/api/quests' && req.method === 'POST') {
    try {
      const { title, desc, type, target, rewardXp, daily } = await parseBody(req);
      const cleanTitle = String(title || '').trim();
      if (!cleanTitle) return sendJson(res, 400, { error: 'Название задания обязательно' });
      const quests = readJsonArray(QUESTS_FILE, DEFAULT_QUESTS);
      const newQuest = {
        id: `q_${Date.now()}`,
        title: cleanTitle,
        desc: String(desc || '').trim() || 'Выполните условие задания и заберите XP.',
        type: ['watchlist', 'profile_bio', 'posts', 'tickets', 'watched_eps', 'custom'].includes(type) ? type : 'custom',
        target: Math.max(1, Number(target) || 1),
        rewardXp: Math.max(10, Number(rewardXp) || 100),
        daily: daily !== undefined ? Boolean(daily) : true
      };
      quests.push(newQuest);
      writeJsonArray(QUESTS_FILE, quests);
      return sendJson(res, 201, newQuest);
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка создания задания' });
    }
  }

  const questItemMatch = urlPath.match(/^\/api\/quests\/([a-zA-Z0-9_-]+)$/);
  if (questItemMatch && req.method === 'PUT') {
    try {
      const questId = questItemMatch[1];
      const { title, desc, type, target, rewardXp, daily } = await parseBody(req);
      const quests = readJsonArray(QUESTS_FILE, DEFAULT_QUESTS);
      const idx = quests.findIndex(q => String(q.id) === questId);
      if (idx === -1) return sendJson(res, 404, { error: 'Задание не найдено' });
      const current = quests[idx];
      const cleanTitle = title !== undefined ? String(title).trim() : current.title;
      if (!cleanTitle) return sendJson(res, 400, { error: 'Название задания обязательно' });
      const updated = {
        ...current,
        title: cleanTitle,
        desc: desc !== undefined ? String(desc).trim() : current.desc,
        type: type !== undefined ? type : current.type,
        target: target !== undefined ? Math.max(1, Number(target) || 1) : current.target,
        rewardXp: rewardXp !== undefined ? Math.max(10, Number(rewardXp) || 100) : current.rewardXp,
        daily: daily !== undefined ? Boolean(daily) : current.daily
      };
      quests[idx] = updated;
      writeJsonArray(QUESTS_FILE, quests);
      return sendJson(res, 200, updated);
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка обновления задания' });
    }
  }

  if (questItemMatch && req.method === 'DELETE') {
    try {
      const questId = questItemMatch[1];
      const quests = readJsonArray(QUESTS_FILE, DEFAULT_QUESTS);
      const filtered = quests.filter(q => String(q.id) !== questId);
      if (filtered.length === quests.length) return sendJson(res, 404, { error: 'Задание не найдено' });
      writeJsonArray(QUESTS_FILE, filtered);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 500, { error: 'Ошибка удаления задания' });
    }
  }

  // --- SUPPORT TICKETS ---
  if (urlPath === '/api/tickets' && req.method === 'GET') {
    return sendJson(res, 200, readJsonArray(TICKETS_FILE, []));
  }

  if (urlPath === '/api/tickets' && req.method === 'POST') {
    try {
      const { userId, userName, subject, message } = await parseBody(req);
      const cleanSubject = String(subject || '').trim();
      const cleanMessage = String(message || '').trim();
      if (!cleanSubject || !cleanMessage) {
        return sendJson(res, 400, { error: 'Укажите тему и текст сообщения' });
      }
      const tickets = readJsonArray(TICKETS_FILE, []);
      const newTicket = {
        id: `t_${Date.now()}`,
        userId: userId || null,
        userName: String(userName || 'Пользователь').trim(),
        subject: cleanSubject,
        status: 'Открыт',
        createdAt: new Date().toISOString(),
        messages: [
          {
            sender: String(userName || 'Пользователь').trim(),
            role: 'user',
            text: cleanMessage,
            at: new Date().toISOString()
          }
        ]
      };
      tickets.unshift(newTicket);
      writeJsonArray(TICKETS_FILE, tickets);
      return sendJson(res, 201, newTicket);
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка отправки тикета' });
    }
  }

  const ticketReplyMatch = urlPath.match(/^\/api\/tickets\/([a-zA-Z0-9_-]+)\/reply$/);
  if (ticketReplyMatch && req.method === 'POST') {
    try {
      const ticketId = ticketReplyMatch[1];
      const { sender, role, text, status } = await parseBody(req);
      const cleanText = String(text || '').trim();
      const tickets = readJsonArray(TICKETS_FILE, []);
      const idx = tickets.findIndex(t => String(t.id) === ticketId);
      if (idx === -1) return sendJson(res, 404, { error: 'Тикет не найден' });
      if (cleanText) {
        tickets[idx].messages.push({
          sender: String(sender || (role === 'admin' ? 'Администратор' : 'Пользователь')).trim(),
          role: role === 'admin' ? 'admin' : 'user',
          text: cleanText,
          at: new Date().toISOString()
        });
      }
      if (status) tickets[idx].status = String(status);
      writeJsonArray(TICKETS_FILE, tickets);
      return sendJson(res, 200, tickets[idx]);
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка ответа в тикете' });
    }
  }

  // --- COMMUNITY POSTS ---
  if (urlPath === '/api/posts' && req.method === 'GET') {
    return sendJson(res, 200, readJsonArray(POSTS_FILE, []));
  }

  if (urlPath === '/api/posts' && req.method === 'POST') {
    try {
      const { userId, userName, userAvatar, animeTitle, text } = await parseBody(req);
      const cleanText = String(text || '').trim();
      if (!cleanText) return sendJson(res, 400, { error: 'Напишите текст поста' });
      const posts = readJsonArray(POSTS_FILE, []);
      const newPost = {
        id: `p_${Date.now()}`,
        userId: userId || null,
        userName: String(userName || 'Пользователь').trim(),
        userAvatar: userAvatar || DEFAULT_AVATAR,
        animeTitle: String(animeTitle || 'Общее обсуждение').trim(),
        text: cleanText,
        likes: 0,
        createdAt: new Date().toISOString()
      };
      posts.unshift(newPost);
      writeJsonArray(POSTS_FILE, posts);
      return sendJson(res, 201, newPost);
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка публикации поста' });
    }
  }

  const postLikeMatch = urlPath.match(/^\/api\/posts\/([a-zA-Z0-9_-]+)\/like$/);
  if (postLikeMatch && req.method === 'POST') {
    try {
      const postId = postLikeMatch[1];
      const posts = readJsonArray(POSTS_FILE, []);
      const idx = posts.findIndex(p => String(p.id) === postId);
      if (idx === -1) return sendJson(res, 404, { error: 'Пост не найден' });
      posts[idx].likes = (Number(posts[idx].likes) || 0) + 1;
      writeJsonArray(POSTS_FILE, posts);
      return sendJson(res, 200, posts[idx]);
    } catch (err) {
      return sendJson(res, 400, { error: 'Ошибка лайка' });
    }
  }

  const postItemMatch = urlPath.match(/^\/api\/posts\/([a-zA-Z0-9_-]+)$/);
  if (postItemMatch && req.method === 'DELETE') {
    try {
      const postId = postItemMatch[1];
      const posts = readJsonArray(POSTS_FILE, []);
      const filtered = posts.filter(p => String(p.id) !== postId);
      if (filtered.length === posts.length) return sendJson(res, 404, { error: 'Пост не найден' });
      writeJsonArray(POSTS_FILE, filtered);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 500, { error: 'Ошибка удаления поста' });
    }
  }

  serveStatic(req, res, urlPath);
});

server.listen(PORT, () => {
  console.log(`SEKAI сервер (на встроенном http) запущен: http://localhost:${PORT}`);
});