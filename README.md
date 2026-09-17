# StitchesnSpice Counselling & Wellness — Backend

Backend API for the StitchesnSpice Counselling & Wellness (SnS) platform.

The backend provides authentication, client management, counselling services, appointments, intake information, workshops, resources, testimonials, FAQs, contact messages, availability management, notifications, administrative operations, and audit logging.

---

## 1. Overview

The SnS backend is a RESTful API built with:

* **Node.js**
* **Express.js**
* **TypeScript**
* **MongoDB**
* **Mongoose**
* **JWT**
* **bcrypt**
* **HTTP-only cookies**
* **Zod** for request validation

The application uses role-based access control with two primary roles:

* `client`
* `admin`

Clients can access their own information and client portal features, while administrators can manage the wider platform.

---

## 2. Technology Stack

| Technology | Purpose                       |
| ---------- | ----------------------------- |
| Node.js    | JavaScript runtime            |
| Express    | REST API framework            |
| TypeScript | Type-safe development         |
| MongoDB    | Database                      |
| Mongoose   | MongoDB ODM                   |
| JWT        | Authentication                |
| bcrypt     | Password hashing              |
| Zod        | Request validation            |
| dotenv     | Environment variables         |
| tsx        | TypeScript development runner |

---

## 3. Project Structure

A typical backend structure is:

```text
src/
├── config/
│   └── db.ts
│
├── controllers/
│   ├── authController.ts
│   ├── appointmentController.ts
│   ├── clientController.ts
│   ├── serviceController.ts
│   ├── availabilityController.ts
│   ├── intakeFormController.ts
│   ├── workshopController.ts
│   ├── testimonialController.ts
│   ├── resourceController.ts
│   ├── faqController.ts
│   ├── contactMessageController.ts
│   ├── notificationController.ts
│   └── ...
│
├── middleware/
│   ├── authMiddleware.ts
│   ├── validateMiddleware.ts
│   ├── errorMiddleware.ts
│   └── ...
│
├── models/
│   ├── User.ts
│   ├── Client.ts
│   ├── Appointment.ts
│   ├── Service.ts
│   ├── Availability.ts
│   ├── IntakeForm.ts
│   ├── Workshop.ts
│   ├── Testimonial.ts
│   ├── Resource.ts
│   ├── FAQ.ts
│   ├── ContactMessage.ts
│   └── ...
│
├── routes/
│   ├── authRoutes.ts
│   ├── appointmentRoutes.ts
│   ├── clientRoutes.ts
│   ├── serviceRoutes.ts
│   ├── availabilityRoutes.ts
│   ├── intakeFormRoutes.ts
│   ├── workshopRoutes.ts
│   └── ...
│
├── services/
│   ├── authService.ts
│   └── ...
│
├── scripts/
│   └── createAdmin.ts
│
├── utils/
│   ├── appError.ts
│   ├── asyncHandler.ts
│   ├── jwt.ts
│   ├── password.ts
│   └── validation.ts
│
└── server.ts
```

The exact structure may evolve as additional features are added.

---

# 4. Getting Started

## Prerequisites

Make sure the following are installed:

* Node.js 18+
* npm
* MongoDB or a MongoDB Atlas database
* Git

Check your Node.js version:

```bash
node -v
```

Check npm:

```bash
npm -v
```

---

# 5. Installation

Clone the repository and enter the backend directory:

```bash
git clone <repository-url>
cd sns-server
```

Install dependencies:

```bash
npm install
```

---

# 6. Environment Variables

Create a `.env` file in the backend root:

```env
NODE_ENV=development

PORT=5000

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sns

JWT_SECRET=your-long-random-secret

JWT_EXPIRES_IN=15m

COOKIE_NAME=accessToken

CLIENT_URL=https://www.stitchesnspices.org

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password
```

## Important

Never commit `.env` to Git.

Your `.gitignore` should contain:

```gitignore
.env
.env.local
.env.*.local
node_modules/
dist/
```

---

# 7. Database

The application uses MongoDB through Mongoose.

The database connection is handled by:

```text
src/config/db.ts
```

The connection uses:

```ts
mongoose.connect(process.env.MONGODB_URI);
```

When the connection succeeds, the server reports:

```text
MongoDB connected
```

---

# 8. Authentication

Authentication is based on JWT access tokens.

After successful login, the server creates an access token and stores it in an HTTP-only cookie.

The cookie is named:

```text
accessToken
```

unless overridden by:

```env
COOKIE_NAME
```

## Login Flow

```text
Client
   ↓
POST /api/auth/login
   ↓
Validate credentials
   ↓
Find user
   ↓
Compare password
   ↓
Generate JWT
   ↓
Set HTTP-only cookie
   ↓
Return authenticated user
```

The password is never returned to the frontend.

---

# 9. User Roles

The system currently supports:

```ts
export type UserRole = "client" | "admin";
```

## Client

Clients can:

* Manage their profile
* View their appointments
* Book appointments
* Complete their client information
* View notifications
* Access available services
* Access their client portal

## Admin

Administrators can:

* Manage clients
* Manage appointments
* Manage services
* Manage availability
* Review client information
* Manage workshops
* Manage testimonials
* Manage resources
* Manage FAQs
* Manage contact messages
* Manage users
* View audit logs
* Manage website content
* Manage media
* Manage system settings

---

# 10. Creating the First Administrator

Administrators should not be created through the public registration endpoint.

Use the admin creation script:

```bash
npx tsx src/scripts/createAdmin.ts
```

The script uses:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
```

The password is hashed before being stored.

The script also prevents duplicate administrators and does not automatically promote an existing client account.

---

# 11. API Structure

API endpoints are grouped by feature.

A typical API structure is:

```text
/api/auth
/api/clients
/api/appointments
/api/services
/api/availability
/api/intake-forms
/api/workshops
/api/testimonials
/api/resources
/api/faqs
/api/contact-messages
/api/notifications
/api/users
/api/audit-logs
/api/website-content
/api/media-assets
/api/settings
```

The exact prefix depends on the configuration in `server.ts`.

---

# 12. Authentication Endpoints

## Register

```http
POST /api/auth/register
```

Creates a client account.

Example request:

```json
{
  "email": "client@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "08012345678"
}
```

---

## Login

```http
POST /api/auth/login
```

Example:

```json
{
  "email": "client@example.com",
  "password": "SecurePassword123!"
}
```

A successful login sets the authentication cookie.

---

## Current User

```http
GET /api/auth/me
```

Requires authentication.

Returns the currently authenticated user.

---

## Logout

```http
POST /api/auth/logout
```

Clears the authentication cookie.

---

# 13. Request Validation

Incoming requests are validated before reaching controllers.

Validation is handled using schemas defined in:

```text
src/utils/validation.ts
```

The validation middleware ensures that invalid requests are rejected consistently.

Example:

```ts
router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(login),
);
```

This prevents controllers from having to manually validate every field.

---

# 14. Error Handling

Application errors should use the application's custom error class:

```ts
AppError
```

Example:

```ts
throw new AppError(
  "Authentication required.",
  401,
);
```

Common HTTP status codes include:

| Status | Meaning                 |
| ------ | ----------------------- |
| 200    | Successful request      |
| 201    | Resource created        |
| 400    | Invalid request         |
| 401    | Authentication required |
| 403    | Access denied           |
| 404    | Resource not found      |
| 409    | Conflict                |
| 422    | Validation error        |
| 500    | Server error            |

Errors are handled centrally by the Express error middleware.

---

# 15. Async Controllers

Asynchronous route handlers should use:

```ts
asyncHandler()
```

Example:

```ts
router.get(
  "/me",
  requireAuth,
  asyncHandler(me),
);
```

This prevents unhandled rejected promises from bypassing the application's error handling system.

---

# 16. Services

Business logic should be separated from controllers whenever practical.

For example:

```text
Controller
    ↓
Service
    ↓
Model
    ↓
MongoDB
```

Authentication currently follows this pattern:

```text
authController.ts
        ↓
authService.ts
        ↓
User / Client models
        ↓
MongoDB
```

This makes the application easier to test and maintain.

---

# 17. Models

MongoDB collections are represented using Mongoose models.

Important models include:

### User

Stores authentication and account information.

```text
email
password
role
isEmailVerified
isActive
lastLoginAt
createdAt
updatedAt
```

Passwords are stored as hashes, not plain text.

---

### Client

Stores client-specific information associated with a User account.

The relationship is:

```text
User
  │
  └── Client
```

---

### Appointment

Stores client appointments and scheduling information.

---

### Service

Stores counselling and wellness services offered by SnS.

A service includes information such as:

```text
service name
slug
description
duration
currency
price
active status
```

The `slug` is used as the URL-friendly identifier.

Example:

```text
Individual Counselling Session
```

becomes:

```text
individual-counselling-session
```

---

### Availability

Stores available counselling dates and times.

---

### IntakeForm

Stores information submitted by clients before counselling sessions.

The internal technical name remains `IntakeForm`, while the administrative interface can present it to users as **Client Information**.

---

### Workshop

Stores workshop information including:

* Title
* Description
* Date
* Time
* Location
* Capacity
* Status

---

### Resource

Stores resources published on the public website.

Resources may include:

* Articles
* Videos
* Downloads

---

### Testimonial

Stores approved client testimonials.

---

### FAQ

Stores frequently asked questions displayed on the website.

---

### ContactMessage

Stores messages submitted through the public contact form.

---

# 18. Access Control

Protected routes use authentication middleware.

Example:

```ts
router.get(
  "/me",
  requireAuth,
  asyncHandler(me),
);
```

The authentication middleware verifies the JWT and attaches the authenticated user to:

```ts
req.user
```

Role-specific access should be enforced separately where required.

---

# 19. Security

The backend follows several basic security principles.

### Password Hashing

Passwords are hashed using bcrypt.

Plain-text passwords must never be stored.

### HTTP-only Authentication Cookie

Authentication tokens are stored in HTTP-only cookies to reduce exposure to client-side JavaScript.

### Environment Variables

Secrets and configuration values are stored in environment variables.

### Input Validation

Requests are validated before processing.

### Role-Based Access

Administrative operations require an administrator account.

### Active Account Checks

Deactivated accounts cannot authenticate.

---

# 20. Development

Start the backend in development mode:

```bash
npm run dev
```

The development server should restart automatically when source files change.

If the project uses `tsx` directly, the server can also be started with:

```bash
npx tsx watch src/server.ts
```

---

# 21. Production Build

Build the TypeScript application:

```bash
npm run build
```

Then start the compiled application:

```bash
npm start
```

The exact commands depend on the scripts configured in `package.json`.

---

# 22. API Testing

Recommended tools for API testing include:

* Postman
* Insomnia
* Thunder Client
* Frontend application

When testing authenticated endpoints, make sure the authentication cookie is preserved between requests.

A typical authentication test is:

```text
POST /api/auth/login
        ↓
GET /api/auth/me
        ↓
POST /api/auth/logout
```

---

# 23. Frontend Integration

The frontend communicates with the backend through HTTP requests.

Authenticated requests must include credentials so that the HTTP-only cookie is sent.

For browser requests using `fetch`:

```ts
fetch("/api/auth/me", {
  credentials: "include",
});
```

For Axios:

```ts
axios.get("/api/auth/me", {
  withCredentials: true,
});
```

The backend CORS configuration must also allow the frontend origin.

---

# 24. API Response Convention

Successful responses generally follow this structure:

```json
{
  "success": true,
  "message": "Request successful.",
  "data": {}
}
```

Example:

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "_id": "...",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

Error responses should provide a meaningful message without exposing sensitive implementation details.

---

# 25. Development Guidelines

When adding a new feature:

1. Create the Mongoose model.
2. Create the service layer if business logic is required.
3. Create the controller.
4. Add request validation.
5. Add the route.
6. Apply authentication/role protection where required.
7. Register the route in `server.ts` or the central router.
8. Test the endpoint.
9. Connect the frontend.
10. Update this README if the feature introduces important backend behavior.

---

# 26. Naming Conventions

Use clear and consistent naming.

### Files

```text
camelCase.ts
```

Examples:

```text
authController.ts
authService.ts
authRoutes.ts
```

### React/backend API concepts

Keep technical names stable where they are already established.

For example:

```text
intakeForm
```

can remain the internal/backend name even if the user-facing interface calls it:

```text
Client Information
```

This separation allows developers to maintain consistent code while presenting terminology that clients and administrators can easily understand.

---

# 27. Git Workflow

Before committing changes:

```bash
git status
```

Review changed files:

```bash
git diff
```

Install dependencies only when required:

```bash
npm install
```

Build before pushing significant changes:

```bash
npm run build
```

Never commit:

```text
.env
passwords
JWT secrets
database credentials
private API keys
```

---

# 28. Production Checklist

Before deploying the backend:

* [ ] Set `NODE_ENV=production`
* [ ] Configure production `MONGODB_URI`
* [ ] Configure a strong `JWT_SECRET`
* [ ] Configure the production frontend URL
* [ ] Enable secure cookies
* [ ] Verify CORS configuration
* [ ] Create the production admin account
* [ ] Confirm database connection
* [ ] Run the production build
* [ ] Test authentication
* [ ] Test protected routes
* [ ] Test client access
* [ ] Test admin access
* [ ] Verify error handling
* [ ] Verify audit logging
* [ ] Verify environment variables
* [ ] Confirm `.env` is not committed

---

# 29. Troubleshooting

## MongoDB connection fails

Check:

```env
MONGODB_URI=...
```

Make sure the URI begins with a valid MongoDB scheme, such as:

```text
mongodb://
```

or:

```text
mongodb+srv://
```

Also verify that the database user and password are correct and that the server IP is permitted by MongoDB Atlas.

---

## Authentication fails

Check:

* JWT secret
* Cookie configuration
* Frontend API URL
* CORS configuration
* `credentials: "include"`
* `withCredentials: true`
* Browser cookie settings

---

## Admin cannot access an admin route

Verify:

```text
req.user.role === "admin"
```

and confirm that the authenticated account is actually an administrator in MongoDB.

---

## Changes are not reflected

Restart the development server:

```bash
npm run dev
```

If necessary, remove the build output and rebuild:

```bash
npm run build
```

---

# 30. Architecture Summary

The backend follows a layered architecture:

```text
                FRONTEND
                    │
                    ▼
                 ROUTES
                    │
                    ▼
               MIDDLEWARE
          ┌─────────┴─────────┐
          │                   │
     Authentication       Validation
          │                   │
          └─────────┬─────────┘
                    ▼
               CONTROLLER
                    │
                    ▼
                SERVICE
                    │
                    ▼
                 MODEL
                    │
                    ▼
                MONGOOSE
                    │
                    ▼
                 MONGODB
```

This separation keeps routing, authentication, validation, business logic, and database operations organized and maintainable.

---

# 31. License

This project is proprietary software developed for **StitchesnSpice Counselling & Wellness**.

Unauthorized copying, redistribution, or commercial use is prohibited unless explicitly permitted by the project owner.
