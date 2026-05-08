# University Timetable System (Group7)

A full-stack university timetable management app. It provides role-based access (admin, faculty, student), manages courses/rooms/faculty/students, and builds a timetable with conflict prevention. The backend is a Node.js/Express API backed by SQL Server, and the frontend is a React + Vite UI.

## Tech stack
- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express, mssql (msnodesqlv8 driver)
- Database: Microsoft SQL Server

## Project structure
- backend/ - Express API server
- frontend/ - React UI
- Group7.sql - Schema, procedures, triggers, and seed data

## How to run

### 1) Database
1. Install Microsoft SQL Server and ODBC Driver 17 (Windows).
2. Create a database named `project1`.
3. Run the SQL script at `Group7.sql` to create tables, procedures, triggers, and seed data.

### 2) Install dependencies
From the repo root:
```
npm install
```
Then install the backend and frontend dependencies:
```
cd backend
npm install
cd ../frontend
npm install
```

### 3) Start the backend
From the repo root:
```
node backend/index.js
```
The API runs on http://localhost:3000.

### 4) Start the frontend
In a new terminal:
```
cd frontend
npm run dev
```
Vite will start the UI (usually at http://localhost:5173).

## Notes
- The backend uses Windows authentication and connects to the local SQL Server instance. If your SQL Server or auth differs, update the `connectionString` in `backend/index.js`.
- The frontend expects the API at `http://localhost:3000` (see `frontend/src/api.js`).
