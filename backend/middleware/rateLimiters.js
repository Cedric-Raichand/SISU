const { rateLimit } = require('express-rate-limit');

function limiter({ windowMinutes, max, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { message },
  });
}

// Limits are per IP address. The numbers can be changed with environment
// variables (the tests use small values).
const num = (name, fallback) => Number(process.env[name]) || fallback;

// Slows down password guessing. Only failed sign-ins count.
const loginLimiter = limiter({
  windowMinutes: 15,
  max: num('RATE_LIMIT_LOGIN_MAX', 10),
  skipSuccessfulRequests: true,
  message: 'Too many failed sign-in attempts. Please try again in a few minutes.',
});

// Stops bulk account creation.
const signupLimiter = limiter({
  windowMinutes: 60,
  max: num('RATE_LIMIT_SIGNUP_MAX', 20),
  message: 'Too many accounts created from this network. Please try again later.',
});

// Refresh and sign-out calls.
const refreshLimiter = limiter({
  windowMinutes: 15,
  max: num('RATE_LIMIT_REFRESH_MAX', 60),
  message: 'Too many requests. Please try again in a few minutes.',
});

// A generous limit over the whole API.
const apiLimiter = limiter({
  windowMinutes: 15,
  max: num('RATE_LIMIT_API_MAX', 600),
  message: 'Too many requests. Please slow down.',
});

module.exports = { loginLimiter, signupLimiter, refreshLimiter, apiLimiter };