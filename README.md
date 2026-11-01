# Sisu

Sisu is a pet-health app. Owners keep their pets' profiles and medical history in one place, get vaccination and appointment reminders, and can give a trusted veterinarian access to a specific pet.

- **Mobile app:** Expo / React Native (`frontend/`)
- **API:** Node.js, Express 5, Mongoose, MongoDB Atlas (`backend/`)

## Features

**Pet owners**
- Create an account and manage multiple pets
- Detailed pet profiles (species, breed, date of birth, sex, weight, colour)
- Medical history: vet visits, diagnoses, treatments, medications
- Vaccination records with due-date reminders
- Appointment booking with reminders
- Nearby veterinarian search
- Grant or revoke a vet's access to each pet individually

**Veterinarians**
- Apply for a vet account (approved by an admin)
- Request access to a pet; the owner approves or rejects
- With approved access: read the pet's history and add records. Vets can edit or delete only the records they created

**Admins**
- Review and approve or reject vet applications

## How access works

| Role | What they can do |
| --- | --- |
| Owner | Full control of their own pets, records and appointments |
| Vet (approved) | Read a pet's history and add records, only for pets whose owner granted access |
| Admin | Approve or reject vet applications |

Access is checked on the server for every request. A vet's role and approval status are re-read from the database each time, so revoking access takes effect immediately.

## Security

- Passwords hashed with bcrypt
- Short-lived access tokens (15 min) with rotating refresh tokens (30 days). Refresh tokens are stored hashed, and reusing an old one revokes all of that user's sessions
- Tokens stored in the device's secure storage on mobile
- Rate limiting on login, signup, refresh and general API traffic
- `helmet` security headers, restricted CORS in production, 100 kb request body limit
- Input validation on all write endpoints

## Project structure

```
Sisu/
├── backend/
│   ├── server.js          App setup, pet routes, startup checks
│   ├── models/            User, Pet, VetPetAccess, HealthRecord,
│   │                      Vaccination, Appointment, RefreshToken
│   ├── routes/            auth, admin, vet access, owner access,
│   │                      pet records, appointments
│   ├── middleware/        auth, role checks, pet access, rate limiters
│   ├── utils/             validation, token helpers
│   └── scripts/           createAdmin.js, checkAdmin.js
├── frontend/
│   ├── App.js             Owner app and role-based entry point
│   ├── src/
│   │   ├── components/    auth, pets, health, reminders, access, vet, admin
│   │   ├── services/      api client, session storage, data layer
│   │   ├── hooks/         useSession
│   │   └── config.js      API URL resolution
│   └── eas.json           Build profiles
├── render.yaml            Render deployment blueprint
├── DEPLOYMENT.md          Step-by-step deployment guide
└── README.md
```

## Getting started (local development)

### Prerequisites
- Node.js 20 or newer
- A MongoDB Atlas cluster (the free tier works)
- Expo Go or an Android emulator / iOS simulator for the app

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env     # on Windows: copy .env.example .env
```

Edit `backend/.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Atlas connection string, with the database name before the `?` |
| `JWT_SECRET` | Yes | At least 32 random characters |
| `PORT` | No | Defaults to 5000 |
| `NODE_ENV` | No | Set to `production` on the live server |
| `TRUST_PROXY` | No | Set to `1` behind a host's proxy (Render) |
| `CORS_ORIGIN` | No | Only needed if you host a web build |
| `ACCESS_TOKEN_TTL` | No | Default `15m` |
| `REFRESH_TOKEN_DAYS` | No | Default `30` |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Start the server:

```bash
npm run dev
```

Check it at `http://localhost:5000/health`.

### 2. Create the first admin

Admins can't sign up through the app. Create one with the script, passing the details as environment variables.

macOS / Linux:

```bash
ADMIN_NAME="Sisu Administrator" ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' node scripts/createAdmin.js
```

Windows PowerShell:

```powershell
$env:ADMIN_NAME="Sisu Administrator"
$env:ADMIN_EMAIL="you@example.com"
$env:ADMIN_PASSWORD="a-strong-password"
node scripts/createAdmin.js
```

`node scripts/checkAdmin.js` confirms the account exists and the password matches, without printing any secrets.

### 3. Mobile app

```bash
cd frontend
npm install
npx expo start
```

In development the app finds your computer automatically. To point it at a specific server, create `frontend/.env`:

```
EXPO_PUBLIC_API_URL=https://your-sisu-api.onrender.com
```

Reminders use `expo-notifications`, which needs a development build rather than Expo Go.

## API overview

All routes are under `/api`. Everything except register, login and refresh needs a `Bearer` access token.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/apply-as-vet` |
| Pets | `GET/POST /pets`, `GET/PATCH/DELETE /pets/:petId` |
| Records | `/pets/:petId/health-records`, `/pets/:petId/vaccinations` |
| Appointments | `/pets/:petId/appointments`, `/appointments` |
| Vet access (vet side) | `/vet-access` (request access, list own requests) |
| Vet access (owner side) | `/owner-access` (pending requests, approve, reject, list vets for a pet, revoke) |
| Admin | `/admin` (list and review vet applications) |
| Health check | `GET /health` |

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full walkthrough. In short:

1. Allow your host's traffic in MongoDB Atlas (Network Access).
2. Deploy `backend/` to Render using `render.yaml` and set `MONGODB_URI`.
3. Create the admin account against the live database.
4. Set the live API URL in `frontend/eas.json` and build the app with EAS.

## Tech stack

- **Frontend:** Expo SDK 57, React Native 0.86, React 19, AsyncStorage, expo-secure-store, expo-notifications, expo-location
- **Backend:** Express 5, Mongoose 9, bcryptjs, jsonwebtoken, helmet, express-rate-limit, cors, dotenv
- **Database:** MongoDB Atlas
- **Hosting:** Render (API), EAS Build (app)

## License

See [LICENSE](LICENSE).
