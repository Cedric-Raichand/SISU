// Shared validation helpers for record routes.
// Dates use YYYY-MM-DD strings, matching the Sisu mobile app.

function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Returns a trimmed string, or null if the value is not a string
// or is longer than maxLength.
function cleanText(value, maxLength) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > maxLength ? null : trimmed;
}

module.exports = { isValidDateString, cleanText };