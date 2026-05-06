# CarFun — Full Project Documentation
### Written by the Developer | First-Person Perspective

---

## Introduction

CarFun is a full-stack carpooling web application I built specifically for students at Bath Spa Academic Centre RAK — the Ras Al Khaimah campus of Bath Spa University in the UAE. The idea is simple: students living in different parts of RAK all share the same destination every day. They drive past each other's neighbourhoods, they have overlapping schedules, and they all have the same problem — commuting alone is expensive. CarFun is my answer to that problem.

This document is a full walkthrough of the project. Not just what I built, but why I built it the way I did. The decisions behind the tech stack, the database design, the backend architecture, the frontend approach, the real-time features, and the design choices. I want this to read like a genuine account of how the project came to life, because I think that context matters a lot when you're trying to understand a piece of software.

---

## The Problem I Was Trying to Solve

Before I even wrote a single line of code, I thought hard about what the actual problem was. It wasn't just "students need a carpool app." There are plenty of generic carpooling apps out there — Uber, Careem, local alternatives. The problem was something more specific.

BathSpa RAK is a university campus. The students are spread across multiple residential areas in RAK — Al Nakheel, Al Hamra, Khuzam, Al Mairid, Digdaga, Al Marjan Island, and several others. Most of them commute daily, and most of them either drive alone or pay for a ride-hailing service. Over a month, that adds up to somewhere around AED 260 for the average student. That's not a small amount for a university student on a budget.

The interesting part is that these students already know each other. They're in the same lectures, the same seminars, the same WhatsApp groups. The information to coordinate a carpool already exists informally — someone posts in a group chat, someone replies, they figure out a pickup time. But it's messy, it's inconsistent, and there's no structure to it. There's no way to know who else in your area is commuting on the same days, at the same time, on a recurring basis.

That's what CarFun is meant to solve. Not just connecting random strangers for a one-off ride, but building a system where students can see who in their area has the same schedule, match with them properly, and build something consistent over a semester.

---

## Why I Chose This Tech Stack

### Node.js + Express

I chose Node.js and Express for the backend because this is a project that needs to be practical and deployable quickly. I'm not working in a large engineering team where everyone has strong opinions about Java or Go. I wanted a stack where I could move fast, where the language is the same on both the frontend and backend (JavaScript), and where the ecosystem has everything I need already figured out.

Express is deliberately minimal. It doesn't make assumptions about how you structure your app, and I like that. I've worked with more opinionated frameworks before, and while they're great for large teams with strict conventions, for a project like this I wanted full control over the structure. I decided where the routes go, how the middleware chains together, and how errors are handled. That clarity is important to me.

The fact that Node.js handles I/O asynchronously also mattered here. CarFun has a real-time component — Server-Sent Events for push notifications — and Node's event loop model is a natural fit for holding many open connections without blocking.

### MongoDB + Mongoose

This was probably my most deliberate choice. I went with MongoDB because the data in this app isn't highly relational in the traditional sense. The most complex relationship in the system is between a Ride and its requests — and I chose to embed those requests directly inside the Ride document rather than creating a separate table for them.

That decision made sense to me for a few reasons. Every time a driver opens their dashboard, they need to see their rides and the requests on those rides. If I was using a relational database, that would be a JOIN query every single time. With MongoDB, it's a single document read. The ride and its requests travel together, which matches how I actually think about the data.

I also used Mongoose on top of MongoDB rather than the raw MongoDB driver, because Mongoose gives me schema validation, virtuals, middleware hooks, and a clean model-based API. The `pre('save')` hooks are a perfect example — I use one on the User model to hash passwords before they're stored, and another on the Ride model to automatically update the status to `'full'` when all seats are booked. This logic lives at the model level, not scattered across route handlers, which keeps everything clean.

One thing I want to be honest about: if this application were to scale significantly, I'd revisit the conversation model. Right now, I'm storing messages as an array embedded inside the Conversation document. That's fine for a university-scale app where conversations are short. But if conversations grew to thousands of messages, you'd start hitting MongoDB's 16MB document size limit. I know that limitation going in, and for this use case, it's acceptable.

### JWT Authentication

I chose JSON Web Tokens over session-based authentication because I wanted the server to be stateless. There's no session store to manage, no sticky sessions to worry about if I ever scale to multiple server instances. The client holds the token in localStorage and sends it with every request via the Authorization header.

The tokens are signed with a secret stored in the environment, and they expire after 30 days, which is a reasonable duration for a regular commuter who opens the app daily. I set the password hashing to use bcrypt with a salt round of 12 — not the fastest, but security matters more than registration speed here.

One nuance I handled carefully: the `/api/events` endpoint for Server-Sent Events. EventSource in the browser can't send custom headers, which means it can't send the Authorization Bearer token the normal way. So for that one endpoint, I accept the JWT as a query parameter — `?token=<jwt>`. This is a known pattern for SSE with JWT auth and I documented it clearly in the code.

### Vanilla JavaScript (No Frontend Framework)

This was my most controversial decision and I want to explain it properly. I did not use React, Vue, or any other frontend framework. The entire frontend is a single HTML file with vanilla JavaScript.

Here's why. The app is fundamentally a Single Page Application with eight views. The routing is simple — show one `<div>`, hide the others. The state is minimal — `currentUser`, `selectedRole`, `activeConvoId`. There's no deeply nested component tree, no complex reactive state that needs a diffing algorithm, no build pipeline required.

I've used React on plenty of projects. I'm comfortable with it. But choosing React for this project would have meant adding a build step, adding node_modules to the frontend, adding Babel or Vite or webpack, and adding a layer of abstraction that doesn't solve any actual problem I have here. The app works fine without it. Loading the page takes milliseconds because there's nothing to compile or bundle on the client side.

I also think this was the right educational choice for this project. It demonstrates that I understand what frontend frameworks are actually doing underneath, rather than just being fluent in a specific library's API. Writing the DOM manipulation by hand, managing fetch calls manually, handling SSE event listeners directly — these are foundational skills.

---

## Database Design Decisions

### The User Model

The User model is the most complete model in the system. It does a lot of heavy lifting. Beyond the obvious fields like name, email, and password, it stores the user's RAK area, their commute schedule (days of the week they commute, preferred departure and return times), and for drivers, their car registration, model, and seats available.

The area field uses a strict enum — I listed all the major residential areas in RAK. This is intentional. Free-text area fields create a mess. "Al Nakheel", "al nakheel", "AL NAKHEEL", "Nakheel", "near Nakheel" all mean the same thing but would never match each other programmatically. The enum forces consistency and makes filtering actually work.

The `commuteDays` field is an array of strings from Monday to Friday. This means the match algorithm I wrote for `/api/users/matches` can use MongoDB's `$in` operator to find users whose commute days overlap with the current user's. That query is genuinely useful — if I commute on Monday, Wednesday, and Friday, I want to see drivers who cover at least one of those days.

I added virtuals for `fullName` and `initials` on the User model. Initials in particular get used a lot in the UI — every avatar in the app shows two-letter initials rather than requiring a profile photo. This keeps the UI functional even when users haven't uploaded a photo.

The password field has `select: false` set. This means password is never returned in queries by default. You have to explicitly call `.select('+password')` to get it. I added this because it's a very easy mistake to accidentally leak the hashed password in an API response, and this model-level protection prevents that from happening.

### The Ride Model

The Ride model has an interesting design. Each ride has an array of `requests` embedded inside it. Each request is a subdocument with its own schema — it tracks the passenger, the status (pending/accepted/rejected/cancelled), the request timestamp, an optional message, and a pickup location (lat/lng).

The pickup location inside the request subdocument is something I'm particularly proud of. After a driver accepts a passenger, the passenger can open a Leaflet map in the app and drop a pin at their exact pickup location. That pin is stored on their specific request inside the ride document. The driver can then view that pin. This solves a very real problem: "where exactly should I pick you up?" No more back-and-forth messages, no ambiguity about which building entrance or which road corner.

The `pre('save')` hook on the Ride model automatically flips the status to `'full'` when `seatsBooked >= seatsTotal`, and flips it back to `'active'` if a seat frees up. This means I never have to manually manage this logic in route handlers — the model handles it.

### The Conversation Model

Conversations are simple by design. Each conversation is anchored to a specific ride and involves exactly one driver and one passenger. The unique index on `{ ride, passenger }` ensures you can't accidentally create two conversations for the same ride-passenger pair.

Conversations are created automatically when a driver accepts a passenger request — I use `findOneAndUpdate` with `upsert: true` so it's idempotent. The driver doesn't have to manually start a conversation. The moment they hit Accept, a chat is ready.

---

## Backend Architecture

### Route Structure

I organized the routes into five files: auth, rides, users, messages, and events. Each file maps to a clean domain of responsibility. The `auth` routes handle identity — who you are. The `rides` routes handle the core carpooling flow. The `users` routes handle profiles, matching, and administration. The `messages` routes handle conversations. The `events` route handles the SSE stream.

I have three middleware variants: `protect` (requires a valid JWT), `optionalAuth` (attaches user if token present, doesn't fail if not), `driverOnly`, and `adminOnly`. The `optionalAuth` is used on the rides listing endpoints because passengers and unauthenticated visitors can both browse rides — they just can't request them without logging in.

### Real-Time Notifications with SSE

This was the most technically interesting part of the backend to build. I needed a way to push events to specific users — things like "your ride request was accepted" or "you have a new message." WebSockets are the common choice here, but they require a persistent bidirectional connection and a bit more setup. Server-Sent Events are simpler — they're unidirectional (server to client), they're built into browsers natively, they reconnect automatically on drop, and they're just an HTTP connection with a specific content type.

My SSE implementation is in `utils/sse.js`. I maintain an in-memory Map that maps userId strings to a Set of response objects. A single user could have multiple browser tabs open, so the Set allows me to write to all of them simultaneously.

When a driver accepts a request, the server calls `sendEvent(passengerId, 'ride-accepted', { ... })`. This writes the event directly to all of the passenger's open SSE connections. On the frontend, the client has registered an event listener for `'ride-accepted'` and reacts immediately — showing a toast notification, refreshing the dashboard, making the messages tab visible.

I'm honest about the limitation here: this is in-memory storage. If the server restarts, all SSE clients reconnect within 5 seconds (the EventSource browser API handles reconnection automatically), but any events that fired during the downtime are lost. For a production system with high reliability requirements, I'd back this with Redis Pub/Sub or a proper message broker. For a university-scale deployment, this in-memory approach is completely fine.

---

## Frontend Architecture

### Single HTML File SPA

The entire frontend is one `index.html` file with eight page `<div>` elements. The CSS class `.page` hides all of them by default, and `.page.active` shows the current one. The `showPage(name)` function in `app.js` removes `active` from all pages and adds it to the target one. That's the entire routing system.

It sounds basic, but it works perfectly for this use case. The page transitions have a CSS `fadeIn` animation — opacity and translateY — that makes it feel smooth without any JavaScript animation library.

### State Management

The app has three pieces of global state: `currentUser` (the logged-in user object), `selectedRole` (for the registration form), and `activeConvoId` (for the messaging view). That's it. No Redux, no Context API, no state machine. Three variables.

On page load, `init()` checks localStorage for a token. If found, it calls `/api/auth/me` to restore the session. If that call fails, the token is cleared. This means sessions survive page refreshes without requiring the user to log in again.

### Map Integration

For the pickup pin feature, I used Leaflet.js with OpenStreetMap tiles. I chose Leaflet over Google Maps for two reasons. First, it's open-source and the tiles are free — no API key required for basic usage. Second, it's lighter. Google Maps loads a lot of things I don't need. Leaflet loads exactly what I ask it to.

The map initializes centered on RAK's coordinates (`[25.7889, 55.9432]`). In "set" mode (passenger setting their pin), clicking the map places or moves a marker and enables the Save button. In "view" mode (driver viewing a passenger's pin), the map is read-only and opens a popup with the passenger's name.

The 80ms `setTimeout` before initializing the Leaflet map is intentional. The map modal display goes from `none` to `flex` via JavaScript, and without a brief delay, Leaflet tries to calculate the container's dimensions before the browser has rendered the layout. The `setTimeout` gives the browser one paint cycle to settle.

---

## Design Decisions

### Dark Theme with Lime Green

The colour palette was the first design decision I made. Dark background (`#1A1A1A`), with lime green (`#C8F03A`) as the primary accent. I wanted something that felt modern and tech-forward without being generic. Every university app I've seen uses either a pale blue or their institutional colours. I didn't want CarFun to look like a student portal. I wanted it to look like a product someone would actually want to use.

The lime green is high-contrast against the dark background, which means it's accessible and readable. It also photographs well on screen, which matters for social media and marketing screenshots.

### Typography

I used two typefaces from Google Fonts: Syne for headings and DM Sans for body text. Syne is a geometric sans-serif with a strong personality — the 800 weight used for headings gives the interface a confident, editorial quality. DM Sans is neutral and legible at small sizes, which makes it perfect for form labels, metadata, and supporting text. Together they create a clear visual hierarchy.

### No Profile Photo Requirement

I made the deliberate decision not to require profile photos. Every avatar in the app uses two-letter initials instead — derived from the first letter of the first name and first letter of the last name. This serves two purposes. First, it lowers the barrier to entry for signing up. Second, it's more private — students in a university community may not want their photo visible to everyone.

The `initials` virtual on the User model computes this automatically, and the frontend renders it consistently everywhere an avatar appears: the navbar chip, ride cards, admin user rows, conversation items.

### Responsive Layout

The CSS uses three breakpoints: the default desktop layout, a 900px breakpoint for tablets, and a 600px breakpoint for mobile. At 900px, the hero section collapses from two columns to one, and the rides grid goes from three columns to two. At 600px, most grids collapse to a single column, the navigation links hide (a mobile menu would be the next improvement), and the map modal shrinks.

I used CSS Grid throughout rather than Flexbox for anything that needed multi-dimensional layout. The ride cards grid, the steps grid, the form grid, the chat layout — these are all CSS Grid. Flexbox handles one-dimensional alignment (nav items, button rows, individual card internals). This distinction kept the layout code predictable.

---

## Security Considerations

I thought carefully about security even though this is a student project. Passwords are hashed with bcrypt at salt rounds of 12 before they ever touch the database. The password field on the User model has `select: false`, so it can never be accidentally returned in a query. JWT secrets are stored in environment variables, not hardcoded.

The admin email (`th.car.fun@gmail.com`) is hardcoded in the registration route — any account registered with that email automatically receives `isAdmin: true`. This is a simple approach that works for a single-admin system. It's not sophisticated, but it's transparent and secure enough for this context.

Route-level authorization is enforced through middleware. `driverOnly` blocks passengers from posting rides. `adminOnly` blocks non-admins from seeing the full user list or deleting accounts. These checks happen before any database queries are executed.

The SSE endpoint accepts the JWT as a query parameter because EventSource doesn't support custom headers. I validated this approach — while query parameters in URLs can appear in server logs, the JWT is short-lived (30 days) and the risk in a university internal application is acceptable.

---

## What I'd Improve Next

If I were to continue developing CarFun beyond its current state, these are the things I'd prioritize.

**Email verification.** The `isVerified` field already exists on the User model. What's missing is the actual email flow — sending a verification link on signup and gating certain features behind it. Right now, anyone can register with any email address.

**Profile photo upload.** The "Change Photo" button on the profile page and the `profilePicture` field on the User model are both in place, but there's no upload endpoint. I'd add Multer for file handling and serve photos as static assets, or upload them to an object storage service.

**Push notifications.** SSE works well for delivering notifications while the app is open, but it does nothing when the tab is closed. Service Workers with the Push API would allow background notifications — a natural evolution for a tool people use for daily commute planning.

**Recurring rides.** The `recurring` and `recurringDays` fields on the Ride model exist specifically for this. A student who drives to campus every Monday, Wednesday, and Friday should be able to post one recurring ride rather than creating three separate ones per week. The backend fields are ready; the UI flow is what needs building.

**Rate limiting.** Right now there's nothing stopping someone from hammering the registration endpoint or the login endpoint. Adding Express Rate Limit middleware to sensitive routes would be a straightforward improvement.

---

## Closing Thoughts

Building CarFun taught me a lot about making pragmatic decisions. Every decision in this project — using vanilla JavaScript instead of React, embedding requests inside ride documents instead of normalizing them, using SSE instead of WebSockets — was a deliberate trade-off, not a shortcut. I chose the simpler option in each case because the simpler option was the right fit for the problem.

What I'm most proud of isn't any single feature. It's the fact that the app is coherent. The backend models reflect the real-world relationships between students, rides, and requests. The frontend mirrors that structure in a way that feels natural to use. The real-time layer adds polish without adding unnecessary complexity.

CarFun is built for a real community with a real problem. That grounding — knowing exactly who the users are, where they live, and what frustration they're trying to solve — made every design decision clearer. I wasn't building for an abstract user. I was building for students at BathSpa RAK, and I think that shows in the product.

---

*Tech Stack: Node.js · Express · MongoDB · Mongoose · JWT · Vanilla JS · Leaflet.js · Server-Sent Events*
*Total source files (excl. node_modules): 19*
*Lines of code (approx): ~2,400*
