# SplitSmart — Phase 1

SplitSmart is a client-side JavaScript expense-sharing mini project. Phase 1 intentionally uses **HTML, CSS, vanilla JavaScript and LocalStorage only**. There is no backend, database, API, payment gateway or cloud authentication.

## Phase 1 syllabus alignment

The project demonstrates:

- JavaScript variables, data types, operators and conditionals
- `for`, `while`, `for...of`, `for...in`
- Functions, parameters, return values and arrow functions
- Scope and arrays
- Array methods: `push`, `pop`, `shift`, `unshift`, `splice`, `slice`
- Higher-order functions: `forEach`, `map`, `filter`, `reduce`, `sort`
- Objects, nested objects, destructuring and JSON
- DOM selection/manipulation
- Events, event objects and `preventDefault()`
- Form validation and error messages
- LocalStorage and browser data management
- ES6 template literals, spread/rest and default parameters

The later syllabus topics (Promises, async/await and Fetch/REST API integration) are intentionally **not required for Phase 1**.

## Main application pages

- `index.html` — product landing page
- `signup.html` — local profile creation
- `signin.html` — local profile sign-in
- `login.html` — login alias that routes to Sign In
- `forgot-password.html` — local profile reset/recovery explanation
- `dashboard.html` — overview
- `groups.html` — group management
- `group-details.html` — group ledger and member balances
- `expenses.html` — expense management and split methods
- `settlement.html` — optimized settlement plan
- `activity.html` — local activity timeline
- `analytics.html` — spending analytics
- `profile.html` — profile, storage, backup/restore and settings
- `how-it-works.html` — product workflow and settlement explanation
- `use-cases.html` — trips, roommates, restaurants, events, students and families
- `help.html` — FAQ and Phase 1 limitations
- `about.html` — project and syllabus overview

## Local account note

Sign Up and Sign In are **local onboarding pages**, not production authentication. They do not send credentials anywhere. The local profile is stored in LocalStorage because Phase 1 explicitly does not use a backend.

## Data safety

Profile Settings includes JSON backup/export and restore/import. Browser/site-data clearing can still remove LocalStorage, so exporting a backup before clearing site data is recommended.

## Demo data

Demo mode creates an anonymous sample workspace with generic member labels. It never creates or displays a named personal profile.

## Core settlement model

`Net Balance = Paid - Owed`

- Positive balance → member should receive money.
- Negative balance → member needs to pay money.
- Debtors and creditors are matched to simplify the settlement plan.

Money is handled internally in integer cents/paise-equivalent units so equal and percentage splits reconcile exactly.

## Latest UI Refresh

- Dashboard redesigned as a modern command-center layout with a net-position hero, quick actions, recent activity panels and contextual insights.
- App navigation is now fully hidden by default on desktop and mobile; the hamburger button opens it as an overlay.
- Navigation closes when a link is selected, the overlay is clicked, or Escape is pressed.
- Dashboard remains fully local/Phase-1 compliant and uses LocalStorage only.
