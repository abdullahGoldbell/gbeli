# FMS Dashboard — Login & User Access Control

## Overview

Add authentication and column-level access control to the FMS Fleet Dashboard. Admins can create users and configure which columns each user can see. All other dashboard features (edit, add, delete, export) remain available to all logged-in users.

## Authentication

- Simple username/password authentication
- Passwords hashed with `bcryptjs`
- JWT tokens signed/verified with `jose` library
- JWT stored in an `httpOnly`, `secure`, `sameSite: lax` cookie named `fms_token`
- Token expiry: 24 hours
- Next.js middleware validates the token on every request and redirects unauthenticated users to `/login`

### Login Page

- Route: `/login`
- Centered dark card on a `#0f172a` background, matching the dashboard's existing dark theme
- Fields: username, password
- Displays error message on invalid credentials
- Redirects to `/` on success

### Bootstrap

- First admin account created on app startup from environment variables:
  - `ADMIN_USERNAME` (default: `admin`)
  - `ADMIN_PASSWORD` (required, no default)
- Startup logic in a utility function called from the root layout's server component
- If the user already exists, skip creation (idempotent)

## Database Schema

Two new tables in the existing FMS MSSQL database.

### `users`

| Column        | Type           | Constraints                  |
|---------------|----------------|------------------------------|
| id            | INT            | PRIMARY KEY, IDENTITY(1,1)   |
| username      | VARCHAR(100)   | UNIQUE, NOT NULL             |
| password_hash | VARCHAR(255)   | NOT NULL                     |
| display_name  | VARCHAR(200)   | NULL                         |
| is_admin      | BIT            | NOT NULL, DEFAULT 0          |
| created_at    | DATETIME       | NOT NULL, DEFAULT GETDATE()  |
| updated_at    | DATETIME       | NOT NULL, DEFAULT GETDATE()  |

### `user_hidden_columns`

| Column     | Type          | Constraints                                  |
|------------|---------------|----------------------------------------------|
| id         | INT           | PRIMARY KEY, IDENTITY(1,1)                   |
| user_id    | INT           | NOT NULL, FK → users(id) ON DELETE CASCADE   |
| column_key | VARCHAR(50)   | NOT NULL                                     |

- Unique constraint on `(user_id, column_key)`
- All columns visible by default. Rows only exist for columns that are hidden.
- `column_key` values correspond to the column accessor keys in FleetTable (e.g., `fleet_type`, `veh_no`, `brand`, `model`, `category`, `condition`, `customer_name`, `salesman_name`, `chassis`, `mast`, `yor`, `yom`, `rental`, `sales`, `scrap`, `remarks`, `location`, `replace_ref`, `container_mast`, `repair_cost`)

## Route Protection

### Next.js Middleware (`src/middleware.ts`)

- Runs on every request
- **Public routes** (no auth required): `/login`, `/api/auth/login`, `/_next/*`, `/favicon.ico`
- **Protected routes**: all other paths — redirect to `/login` if no valid JWT
- **Admin-only routes**: `/api/admin/*` — return 403 if user is not admin
- Middleware decodes the JWT and attaches `userId` and `isAdmin` to the request headers for downstream use

## API Routes

### Auth Routes

**`POST /api/auth/login`** (public)
- Body: `{ username: string, password: string }`
- Validates credentials against `users` table using `bcryptjs.compare()`
- On success: signs JWT with `{ userId, username, isAdmin }`, sets httpOnly cookie, returns `{ success: true, user: { username, displayName, isAdmin } }`
- On failure: returns 401 `{ error: "Invalid credentials" }`

**`POST /api/auth/logout`** (protected)
- Clears the `fms_token` cookie
- Returns `{ success: true }`

**`GET /api/auth/me`** (protected)
- Reads userId from JWT (via middleware header)
- Returns `{ username, displayName, isAdmin, hiddenColumns: string[] }`
- `hiddenColumns` is the list of `column_key` values from `user_hidden_columns`

### Admin Routes

**`GET /api/admin/users`** (admin only)
- Returns array of all users: `{ id, username, displayName, isAdmin, createdAt, hiddenColumns: string[] }`
- Does not return password hashes

**`POST /api/admin/users`** (admin only)
- Body: `{ username: string, password: string, displayName?: string, isAdmin?: boolean, hiddenColumns?: string[] }`
- Hashes password with `bcryptjs` (salt rounds: 10)
- Creates user row and any `user_hidden_columns` rows
- Returns created user (without password hash)

**`PUT /api/admin/users/[id]`** (admin only)
- Body: `{ username?: string, password?: string, displayName?: string, isAdmin?: boolean, hiddenColumns?: string[] }`
- If password provided, re-hash it
- If hiddenColumns provided, delete all existing rows for this user and re-insert
- Returns updated user

**`DELETE /api/admin/users/[id]`** (admin only)
- Cannot delete yourself
- Cascade deletes `user_hidden_columns` rows (via FK constraint)
- Returns `{ success: true }`

## Dashboard Integration

### Header Changes

- Show logged-in username and a "Logout" button on the right side of the header
- Show a gear icon (⚙) next to the username — **visible only to admin users**
- Clicking the gear icon opens the Admin Panel modal

### Admin Panel Modal

- Center modal with dark theme, triggered from header gear icon
- Two tabs: **Users** and **Column Access**

**Users Tab:**
- Table/list of all users showing: username, display name, admin badge, Edit/Delete actions
- "Add User" button opens an inline form or sub-view with: username, password, display name, is_admin toggle
- Edit opens the same form pre-filled
- Delete shows confirmation, cannot delete self

**Column Access Tab:**
- Dropdown or list to select a user
- Grouped checkboxes showing all fleet table columns organized by category:
  - **Vehicle Info**: Type, Veh No, Brand, Model, Category, Chassis, Mast, YOR, YOM
  - **Status & Assignment**: Condition, Customer, Salesman, Location
  - **Financial**: Rental, Sales, Scrap, Repair Cost
  - **Other**: Remarks, Replace Ref, Container/Mast
- Select All / Deselect All shortcuts
- Save button persists changes to `user_hidden_columns`

### FleetTable Column Filtering

- `Dashboard.tsx` fetches the current user's `hiddenColumns` from `GET /api/auth/me` on mount
- Passes `hiddenColumns` to `FleetTable` as a prop
- `FleetTable` filters its column definitions to exclude any column whose key is in `hiddenColumns`
- This is client-side filtering only — the API returns all columns regardless

### Auth Context

- Create a React context (`AuthContext`) that provides:
  - `user: { username, displayName, isAdmin, hiddenColumns } | null`
  - `logout: () => void`
  - `refreshUser: () => void`
- Wrap the dashboard in this context provider
- Used by: header (username, admin check, logout), FleetTable (hidden columns), AdminPanel (admin check)

## Dependencies (new)

- `jose` — JWT sign/verify (Edge-compatible, works with Next.js middleware)
- `bcryptjs` — password hashing (pure JS, no native compilation needed)

## File Structure (new/modified)

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx                    (NEW - login page)
│   ├── components/
│   │   ├── Dashboard.tsx               (MODIFIED - auth context, hidden columns)
│   │   ├── FleetTable.tsx              (MODIFIED - filter columns by hiddenColumns prop)
│   │   ├── AdminPanel.tsx              (NEW - modal with Users + Column Access tabs)
│   │   └── AuthProvider.tsx            (NEW - auth context provider)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts          (NEW)
│   │   │   ├── logout/route.ts         (NEW)
│   │   │   └── me/route.ts             (NEW)
│   │   └── admin/
│   │       └── users/
│   │           ├── route.ts            (NEW - GET/POST)
│   │           └── [id]/route.ts       (NEW - PUT/DELETE)
│   ├── layout.tsx                      (MODIFIED - bootstrap admin, auth provider)
│   └── page.tsx                        (UNCHANGED)
├── lib/
│   ├── auth.ts                         (NEW - JWT sign/verify, password hash helpers)
│   ├── bootstrap.ts                    (NEW - create admin user on startup)
│   ├── db.ts                           (UNCHANGED)
│   ├── types.ts                        (MODIFIED - add User type, AuthUser type)
│   └── socket.ts                       (UNCHANGED)
├── middleware.ts                        (NEW - route protection)
```

## Environment Variables (new)

Add to `.env.local`:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-password>
JWT_SECRET=<random-64-char-string>
```

## Security Considerations

- Passwords never stored in plain text — always bcrypt hashed
- JWT in httpOnly cookie prevents XSS token theft
- Middleware validates every request server-side
- Admin routes double-check `isAdmin` claim from JWT against the database
- SQL queries use parameterized inputs (existing pattern continues)
- No sensitive data in JWT payload beyond userId, username, isAdmin
