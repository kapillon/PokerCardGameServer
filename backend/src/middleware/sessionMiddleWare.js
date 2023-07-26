const session = require('express-session');
const cookieParser = require('cookie-parser');

const ONE_HOUR = 1000 * 60 * 60;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'supersecret';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

const isProd = NODE_ENV === 'production';

const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: ONE_HOUR,
    sameSite: isProd ? 'none' : 'strict',
    secure: isProd ? COOKIE_SECURE : false,
  },
});

const cookieMiddleware = cookieParser();

module.exports = { sessionMiddleware, cookieMiddleware };
