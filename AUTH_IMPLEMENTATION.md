# UpRankly Authentication System

## Overview
Complete email/password authentication system replacing the old OTP-based system.

## Features Implemented

### User Registration (`/auth/register`)
- Full Name (required)
- Email (required, unique)
- Password (required, min 8 chars, scrypt hashed)
- Phone (optional)
- Country (dropdown, default: India)
- State (optional)
- Business Name (required)
- Business Description (optional)
- Website URL (required, validated URL)

### User Login (`/auth`)
- Email + Password authentication
- Rate limiting: 10 attempts per 15 minutes
- Session-based authentication with httpOnly cookies
- Auto-redirect to dashboard after successful login

### Admin Login (`/admin/login`)
- Separate admin login page (not visible on public pages)
- Direct URL access only: http://localhost:3000/admin/login
- Default admin credentials:
  - Email: `admin@uprankly.in`
  - Password: `jagdish9041`
- Admin user automatically created on server startup
- Redirects to admin panel after successful login

### Route Protection (Middleware)
- `/dashboard/*` - Requires user authentication
- `/admin/*` - Requires admin authentication (except `/admin/login`)
- `/auth` and `/auth/register` - Redirects authenticated users to dashboard
- Security headers applied to all routes

### Session Management
- 30-day session duration
- Secure, httpOnly cookies
- Session tokens stored in database
- IP address and user-agent tracking
- Automatic session cleanup on logout

### Security Features
- Password hashing using Node.js `scrypt` (salt + 64-byte derived key)
- Rate limiting on login/register endpoints
- CSRF protection via httpOnly cookies
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Input validation using Zod schemas
- SQL injection protection via Drizzle ORM parameterized queries

## Database Schema Updates

### Users Table
Updated fields:
- `full_name` - User's full name (required)
- `email` - Unique email address (required)
- `password_hash` - Scrypt hashed password (required)
- `phone` - Phone number (optional)
- `country` - Country name (optional)
- `state` - State/region (optional)
- `business_name` - Business name (required)
- `business_description` - Business description (optional)
- `website_url` - Website URL (required)
- `role` - User role ('user', 'admin')
- `is_admin` - Quick admin flag (boolean)
- `status` - Account status ('active', 'blocked')
- `last_login_at` - Last login timestamp

### Sessions Table
- `id` - Session UUID
- `token` - Unique session token
- `user_id` - References users table
- `ip` - Client IP address
- `user_agent` - Client user-agent
- `expires_at` - Session expiration timestamp
- `created_at` - Session creation timestamp

## Files Created/Updated

### New Files
1. `src/app/auth/page.tsx` - Login page
2. `src/app/auth/register/page.tsx` - Registration page
3. `src/app/admin/login/page.tsx` - Admin login page
4. `src/components/auth-forms.tsx` - Login, Register, Admin login forms
5. `src/lib/validation.ts` - Zod validation schemas
6. `src/app/api/auth/login/route.ts` - Login API endpoint
7. `src/app/api/auth/register/route.ts` - Registration API endpoint
8. `src/app/api/auth/me/route.ts` - Get current user endpoint
9. `src/app/api/auth/logout/route.ts` - Logout API endpoint

### Updated Files
1. `src/db/schema.ts` - Updated users table schema
2. `src/lib/auth.ts` - Complete rewrite with new auth functions
3. `src/middleware.ts` - Route protection and security headers
4. `src/app/layout.tsx` - Admin user initialization on startup
5. `src/components/user-forms.tsx` - Removed OTP form

### Deleted Files/Folders
1. `src/app/api/auth/request-otp/` - Old OTP request endpoint
2. `src/app/api/auth/verify-otp/` - Old OTP verification endpoint
3. `src/app/api/admin-auth/` - Old admin auth endpoints

## API Endpoints

### POST `/api/auth/register`
Register new user account.

**Request:**
```json
{
  "fullName": "Jagdish Singh",
  "email": "user@example.com",
  "password": "securepassword123",
  "phone": "+91 9041234567",
  "country": "India",
  "state": "Punjab",
  "businessName": "My Business",
  "businessDescription": "Business description",
  "websiteUrl": "https://example.com"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "Jagdish Singh",
      "isAdmin": false
    }
  }
}
```

### POST `/api/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "Jagdish Singh",
      "isAdmin": false
    }
  }
}
```

### GET `/api/auth/me`
Get current authenticated user.

**Response:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "Jagdish Singh",
      "phone": "+91 9041234567",
      "country": "India",
      "state": "Punjab",
      "businessName": "My Business",
      "websiteUrl": "https://example.com",
      "isAdmin": false,
      "role": "user",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### POST `/api/auth/logout`
Logout current user.

**Response:**
```json
{
  "ok": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

## Testing Checklist

- [ ] User can register with all required fields
- [ ] Email validation works (duplicate emails rejected)
- [ ] Password must be at least 8 characters
- [ ] User can login with email + password
- [ ] Invalid credentials show appropriate error
- [ ] Rate limiting works (10 attempts per 15 minutes)
- [ ] Session cookie is set after login
- [ ] Logged-in user redirects from /auth to /dashboard
- [ ] Logged-out user redirects from /dashboard to /auth
- [ ] Admin can login at /admin/login with admin@uprankly.in / jagdish9041
- [ ] Admin login redirects to /admin panel
- [ ] Admin login button is NOT visible on public pages
- [ ] Logout clears session and redirects to login
- [ ] Form validation works client-side (real-time error messages)
- [ ] Form validation works server-side (API returns errors)

## Environment Variables

Ensure these are set in `.env`:
```env
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=development
```

## Next Steps

1. Run database migrations to update schema:
   ```bash
   npm run db:push
   # or
   npx drizzle-kit push
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Admin user will be created automatically on first startup

4. Test the authentication flow:
   - Register at: http://localhost:3000/auth/register
   - Login at: http://localhost:3000/auth
   - Admin login at: http://localhost:3000/admin/login

## Security Notes

- Passwords are hashed using Node.js crypto.scrypt (more secure than SHA-256)
- Sessions use httpOnly cookies (not accessible via JavaScript)
- Rate limiting prevents brute-force attacks
- All routes protected by middleware
- Admin route requires both session AND isAdmin flag verification
- SQL injection protected via Drizzle ORM
- XSS protection via React's default escaping
- CSRF protection via httpOnly session cookies
