# LibroTrack Backend Setup Guide

This guide will help you set up the LibroTrack backend on your local machine for the first time.

## Prerequisites

- **Node.js** (v18 or later recommended)
- **Oracle Database** (19c XE or similar)
- **Git**

## 1. Clone the Repository

```
git clone <repo-url>
cd LibroTrack/server
```

## 2. Install Node.js Dependencies

```
npm install
```

## 3. Install Oracle Database

- Download and install Oracle Database Express Edition (XE) from the [official Oracle website](https://www.oracle.com/database/technologies/xe-downloads.html).
- During installation, set a password for the `system` user and remember it.
- After installation, create a new user for the project (optional, but recommended):
  1. Open SQL\*Plus or Oracle SQL Developer.
  2. Connect as `system`.
  3. Run:
     ```sql
     CREATE USER libro IDENTIFIED BY your_password;
     GRANT CONNECT, RESOURCE TO libro;
     ALTER USER libro DEFAULT TABLESPACE users;
     ```

## 4. Configure Environment Variables

- Copy the example environment file:
  ```
  cp .env.example .env
  ```
- Edit `.env` and set your Oracle username, password, and connect string. Example:
  ```
  ORACLE_USER=libro
  ORACLE_PASSWORD=your_password
  ORACLE_CONNECT_STRING=127.0.0.1:1521/orclpdb
  ```
- For most local installs, `127.0.0.1:1521/orclpdb` will work. If not, check your Oracle service name with:
  ```sql
  SELECT name FROM v$services;
  ```

## 5. Start the Backend Server

- For development (auto-reload):
  ```
  npm run dev
  ```
- For production:
  ```
  npm start
  ```

## 6. Test the Database Connection

- Open your browser and go to:
  ```
  http://localhost:3000/dbtest
  ```
- You should see a message like `{ "MESSAGE": "Connected to Oracle!" }`.

## Troubleshooting

- If you get connection errors, ensure:
  - Oracle service and listener are running (`lsnrctl status`)
  - Your `.env` values are correct
  - Port 1521 is open
- Try different connect strings if needed (see above).

## Notes

- Never commit your `.env` file to git.
- Each developer should use their own Oracle credentials.

---

For further help, contact the project maintainer or check the README.
