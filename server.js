const bcrypt = require('bcrypt');
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8000;
const SALT_ROUNDS = 10;

// Use EJS for templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'verysecurekey123',
  resave: false,
  saveUninitialized: true
}));

// Flash message middleware
app.use((req, res, next) => {
  res.locals.success = req.session.success;
  res.locals.error = req.session.error;
  delete req.session.success;
  delete req.session.error;
  next();
});

// Mock database
const users = [];
const adminUser = { username: 'admin', password: 'password' };

// Hash admin password on first boot
(async () => {
  const hashed = await bcrypt.hash(adminUser.password, SALT_ROUNDS);
  users.push({ username: adminUser.username, password: hashed });
})();

const fakeEntries = [
  { title: 'Bank Login', content: 'user123 / my$uperSecurePass!' },
  { title: 'Email', content: 'kyriq@email.com / SuperLongPassword123' },
  { title: 'Crypto Wallet', content: 'Seed: mix drum sketch evil giraffe...' }
];

// Initialize session entries
app.use((req, res, next) => {
  if (!req.session.entries) {
    req.session.entries = [...fakeEntries];
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.render('auth', { error: null, success: null, mode: 'login' });
});

app.get('/register', (req, res) => {
  res.render('auth', { error: null, success: null, mode: 'register' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.render('auth', { error: 'Invalid username or password.', success: null, mode: 'login' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (match) {
    req.session.authenticated = true;
    req.session.username = username;
    res.redirect('/dashboard');
  } else {
    res.render('auth', { error: 'Invalid username or password.', success: null, mode: 'login' });
  }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const existing = users.find(u => u.username === username);

  if (existing) {
    return res.render('auth', { error: 'Username already exists.', success: null, mode: 'register' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  users.push({ username, password: hashedPassword });
  req.session.success = 'Registration successful! You can now log in.';
  res.redirect('/');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.authenticated) return res.redirect('/');

  const username = req.session.username;
  const avatarUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${username}`;
  res.render('dashboard', {
    username,
    avatarUrl,
    entries: req.session.entries,
    success: res.locals.success,
    error: res.locals.error
  });
});

app.post('/add', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    req.session.error = 'Both title and content are required.';
  } else {
    req.session.entries.unshift({ title, content });
    req.session.success = 'Entry added.';
  }
  res.redirect('/dashboard');
});

app.post('/edit', (req, res) => {
  const { index, newTitle, newContent } = req.body;
  if (req.session.entries[index]) {
    req.session.entries[index].title = newTitle;
    req.session.entries[index].content = newContent;
    req.session.success = 'Entry updated.';
  }
  res.redirect('/dashboard');
});

app.post('/delete', (req, res) => {
  const { index } = req.body;
  if (req.session.entries[index]) {
    req.session.entries.splice(index, 1);
    req.session.success = 'Entry deleted.';
  }
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Red Moon Vault running at http://localhost:${PORT}`);
});
