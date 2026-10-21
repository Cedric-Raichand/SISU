const { isValidDateString, cleanText } = require('./validation');

const TEXT_FIELDS = {
  name: 100,
  species: 50,
  breed: 100,
  sex: 30,
  weight: 50,
  color: 50,
};

const REQUIRED = ['name', 'species'];

// Reads and validates pet fields from a request body.
// partial = false: creating a pet (name and species required).
// partial = true:  updating a pet (only the fields that are sent are checked).
// Only fields listed here are ever returned, so nothing else
// (such as `owner`) can be set from the request.
// Returns { values } or { error }.
function parsePet(body, { partial }) {
  const values = {};

  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    if (body[field] === undefined) {
      if (!partial && REQUIRED.includes(field)) {
        return { error: 'Pet name and species are required.' };
      }

      continue;
    }

    const text = cleanText(body[field], max);

    if (text === null) {
      return { error: `${field} must be text of at most ${max} characters.` };
    }

    if (REQUIRED.includes(field) && !text) {
      return { error: `${field} cannot be empty.` };
    }

    values[field] = text;
  }

  if (body.dateOfBirth !== undefined) {
    if (body.dateOfBirth !== '' && !isValidDateString(body.dateOfBirth)) {
      return {
        error: 'dateOfBirth must use YYYY-MM-DD, for example 2024-06-15.',
      };
    }

    values.dateOfBirth = body.dateOfBirth;
  }

  if (body.age !== undefined) {
    // null clears the age.
    if (body.age !== null) {
      if (
        typeof body.age !== 'number' ||
        !Number.isFinite(body.age) ||
        body.age < 0 ||
        body.age > 100
      ) {
        return { error: 'Age must be a number between 0 and 100.' };
      }
    }

    values.age = body.age;
  }

  if (partial && Object.keys(values).length === 0) {
    return { error: 'Provide at least one valid field to update.' };
  }

  return { values };
}

module.exports = { parsePet };