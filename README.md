# TriSect

A web app for sharing and splitting expenses among friends on trips, with support for custom expense categories and weighted distribution keys (e.g., for babies, kids, and adults).

## Features

### Phase 1: MVP
- User registration & login (Firebase Auth)
- Create and manage trips
- Invite members to trips
- Log expenses with categorization
- Automatic settlement calculation (weighted split support)
- View trip summary and who owes whom

### Future Phases (Phase 2/3)
- Custom distribution keys per category (babies, kids, adults)
- Advanced analytics
- Mobile app (React Native)

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Firebase (Firestore, Auth, Hosting)
- **Styling:** Tailwind CSS
- **State Management:** React Context API
- **Package Manager:** npm

## Project Structure

```
src/
├── components/
│   ├── auth/              # Login, Register components
│   ├── trips/             # Trip management components
│   ├── expenses/          # Expense logging components
│   ├── common/            # Shared components (Header, Nav, etc.)
│   └── layout/            # Page layouts
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── TripDetail.tsx
│   └── NotFound.tsx
├── services/
│   ├── firebase.ts        # Firebase configuration & initialization
│   ├── auth.ts            # Auth service
│   ├── trips.ts           # Trip CRUD operations
│   ├── expenses.ts        # Expense CRUD operations
│   └── settlement.ts      # Settlement calculation logic
├── hooks/
│   ├── useAuth.ts         # Auth context hook
│   ├── useTrip.ts         # Trip context hook
│   └── useUser.ts         # User context hook
├── types/
│   └── index.ts           # TypeScript interfaces
├── context/
│   ├── AuthContext.tsx
│   └── TripContext.tsx
├── styles/
│   └── globals.css
├── App.tsx
└── main.tsx

public/
├── index.html
└── favicon.svg

.env.example             # Example environment variables
.gitignore
package.json
tsconfig.json
vite.config.ts
tailwind.config.js
```

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Firebase project (free tier available)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JackyOnGit/TriSect.git
cd TriSect
```

2. Install dependencies:
```bash
npm install
```

3. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password)
   - Create a Firestore database (Start in test mode for development)

4. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your Firebase configuration from the Firebase Console:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

5. Start the development server:
```bash
npm run dev
```

6. Open http://localhost:5173 in your browser

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

## Firestore Schema

### Users Collection
```
users/
├── {userId}
│   ├── email: string
│   ├── displayName: string
│   ├── photoURL: string (optional)
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
```

### Trips Collection
```
trips/
├── {tripId}
│   ├── name: string
│   ├── description: string
│   ├── startDate: date
│   ├── endDate: date
│   ├── createdBy: userId
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   ├── isSettled: boolean
│   └── members/ (subcollection)
│       ├── {userId}
│       │   ├── role: string (Adult, Kid, Baby)
│       │   ├── email: string
│       │   ├── displayName: string
│       │   ├── joinedAt: timestamp
│       │   └── status: string (invited, joined, declined)
│
│   └── expenses/ (subcollection)
│       ├── {expenseId}
│       │   ├── description: string
│       │   ├── amount: number
│       │   ├── category: string (Food, Accommodation, Transport, Activities, Other)
│       │   ├── paidBy: userId
│       │   ├── splitAmong: [userId] (array of user IDs)
│       │   ├── date: date
│       │   ├── createdAt: timestamp
│       │   └── updatedAt: timestamp
```

## Settlement Algorithm

The settlement calculation will:
1. Track total amount paid by each person
2. Calculate weighted share for each person based on distribution key
3. Compute net balance (who owes whom)
4. Suggest minimum transactions to settle the trip

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -m 'Add feature'`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a Pull Request

## License

MIT

## Contact

Questions? Open an issue or reach out to the maintainers.
