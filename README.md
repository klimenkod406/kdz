# kdz — Internal Ticket System

A two-server ticket management system for company employees. Employees
submit tickets through a web form (Server 1) which forwards them on a
schedule to the central archive and admin panel (Server 2).

The repository also ships with an interactive installer that walks the
operator through dependency setup, database creation and service
registration.

## Architecture

```
Employees ──► Server 1 (port 3001) ──cron──► Server 2 (port 3002)
              intake & temporary             archive, admin panel,
              storage, file uploads          authentication,
                                             history, ZIP export
```

Both servers share a common module (`shared/`) and use PostgreSQL via
the `pg` driver. Inter-server communication is gated by a shared
`SYNC_SECRET`.

## Components

### Server 1 — Intake
- Accepts tickets from employees via a web form
- Temporarily stores them for a configurable retention period
- Forwards tickets to Server 2 on a cron schedule (interval from
  `SYNC_INTERVAL_MINUTES`)
- Marks tickets as sent after successful delivery to Server 2
- Accepts file uploads (photos, videos, documents)
- CORS not required — the form and the API share the same origin

**Default port:** 3001

### Server 2 — Archive & Admin
- Permanent storage of all tickets
- Admin panel for ticket management
- Administrator authentication (sessions in PostgreSQL)
- Status changes, comments, history
- Logging system (`security.log`, `error.log`)
- Download all ticket files as a ZIP archive
- Rate limiting against password brute force
- Receives synchronizations from Server 1 with `SYNC_SECRET` validation

**Default port:** 3002

### Installer (`installer/`)
- Interactive CLI setup script
- Creates the PostgreSQL databases and roles
- Generates `SYNC_SECRET` and `.env` files
- Supports both Windows and Linux/macOS consoles

## Project status

Latest verification (see commit history) covers:
- `node --check` for `server1`, `server2`, `shared`, `installer`
- `npm install` in each of the above folders

## Requirements

- **Node.js 18+** (verified on 24.x)
- **PostgreSQL** (tested on 14+)
- The installer works on Windows, Linux and macOS consoles

## Installation (Windows, no code changes)

1. Double-click `install-dependencies.bat` — installs npm packages in
   `installer/`.
2. Double-click `Установить сервер.bat` — runs the interactive
   installer.
3. After the installer finishes, use the desktop shortcuts:
   `Start Server 1.bat` and `Start Server 2.bat`.

## Installation (any OS, manual)

```bash
git clone https://github.com/klimenkod406/kdz.git
cd kdz

# 1. Install the installer's own deps
( cd installer && npm install )

# 2. Run the installer
node installer/setup.js

# 3. Start the servers
( cd server1 && node src/index.js ) &
( cd server2 && node src/index.js )
```

The installer will create `.env` files for `server1` and `server2`,
provision the database, and print the URLs to open in your browser.

## Project layout

```
kdz/
├── installer/         # setup.js + its own package.json
├── server1/           # Intake server (Express, port 3001)
├── server2/           # Archive + admin server (Express, port 3002)
├── shared/            # Common helpers shared between the servers
├── install-dependencies.bat
├── Start Server 1.bat
├── Start Server 2.bat
└── Установить сервер.bat
```

## Documentation

- `INSTALLER-GUIDE.md` — full installer walk-through.
- `LOGGING-SYSTEM.md` — log format, locations, rotation.
- `START_HERE.md` — quick-start guide.
- `ИНСТРУКЦИЯ.txt` / `ЧТЕНИЕ.txt` — Russian-language notes.

## Security

- `SYNC_SECRET` must match between `server1` and `server2`.
- Rate limiting on Server 2 protects the admin login from brute force.
- Session storage in PostgreSQL (not in memory) so restarts don't drop
  logins.

## License

MIT — see `LICENSE`.