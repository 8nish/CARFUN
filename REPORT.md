# CarFun — Individual Project Report
### Final Graduating Project | Bath Spa University RAK
### Module: Digital Incubator
### Author: Dhovie Bryan Costimiano

---

## The Artefact

CarFun is a full-stack carpooling web application built by a team of five Bath Spa RAK students for the student community at Bath Spa Academic Centre RAK, the university's campus in Ras Al Khaimah, UAE. The idea behind it is straightforward: students who live in the same areas of RAK are making the same journey to campus every day, often alone, and often spending far more on transport than they need to. CarFun is a platform that connects those students so they can share rides, split fuel costs, and reduce how much the daily commute takes out of their pockets each month.

The artefact is a live, functional web application accessible at http://localhost:3000 during development. It includes a registration and login system, a ride browsing and filtering interface, a ride offering flow for drivers, a request and acceptance system, real-time in-app notifications, an in-app messaging system for matched riders, a Leaflet-powered map for passengers to drop their pickup location pin, and an admin panel for user management.

The crew behind CarFun consists of five members with clearly defined roles. Fareedi Danish Baloch and I, Dhovie Bryan Costimiano, handled the full technical development of the application. Geof Raneses and Kisha Romeo led the marketing strategy and research, covering audience analysis, the social media content plan, and the commercial direction of the project. Anas Imtiaz handled the media side of the campaign, which includes the visual and video content production.

The campaign materials produced alongside the application include a full set of Instagram posts and stories designed in the brand's visual identity, five TikTok video scripts targeting BathSpa RAK students, and captions and hashtag sets for every piece of content. These are stored in the `marketing/` folder of the project repository and were developed through a close collaboration between the development team and the marketing and media members.

CarFun aligns closely with the incubator theme in two important ways. First, it addresses a real social need. University students are a community that often lives on tight budgets, and transport costs are one of the most consistent and unavoidable expenses in that budget. By facilitating carpooling among students who already share a campus and often already know each other, CarFun removes friction from a money-saving behaviour that was previously informal and inconsistent. Second, the app has a clear sustainability angle. Carpooling directly reduces the number of individual car journeys being made, which lowers fuel consumption and carbon emissions per passenger trip. The UN's Sustainable Development Goal 11 specifically calls for sustainable urban transport systems, and a tool that increases vehicle occupancy rates on a regular commute route is a meaningful contribution to that goal, even at a small scale (United Nations, 2015).

The intended audience is Bath Spa RAK students who commute from residential areas across Ras Al Khaimah. This includes both students who own cars and are currently driving alone, and students who are paying for ride-hailing services or other transport options. The app is designed to serve both groups: drivers earn fuel contributions from passengers, and passengers pay far less than a solo taxi or ride-hail fare.

---

## The Development

### Ideation and Planning

The idea for CarFun came out of early group discussions where we asked each other a simple question: what is a problem that every BathSpa RAK student actually has? The answer that kept coming up was the daily commute. Every student in our crew had felt it personally. It costs too much to travel alone. Classmates from the same area are making the same trip at the same time, but nobody has a reliable way to coordinate. The information to arrange a carpool already exists in WhatsApp groups and word of mouth. What was missing was a proper system to surface it.

From that starting point we mapped out the user types the app would need to serve: students who own cars and want to offer seats, students who need rides, and an admin to manage the platform. Geof and Kisha then led a focused research phase, looking at existing carpooling platforms, interviewing students about their commute habits and pain points, and establishing what features would actually matter to the target audience versus what would just add complexity. Their research directly shaped the feature priorities Fareedi and I built to. Rather than guessing what users wanted, we had real input from our team's research before we wrote a line of code.

Anas began working on the media direction in parallel, developing the visual tone and thinking about how the product would be presented to students on social platforms. Having that conversation early meant that the app's design language and the marketing materials ended up feeling consistent rather than like two separate things made by different teams.

For development planning, Fareedi and I broke the technical work into phases. Phase one was the backend: setting up the server, connecting the database, building the data models, and creating the API routes. Phase two was the frontend: building the single-page interface, connecting it to the backend, and making the user flows feel smooth. Phase three was the real-time layer: the Server-Sent Events system for push notifications and the in-app messaging. Phase four was design polish and the production of campaign assets, done in collaboration with Geof, Kisha, and Anas.

### Team Roles and My Contribution

Within the development team, Fareedi and I divided the work based on our individual strengths while staying closely aligned throughout. Fareedi contributed to the backend structure and worked on key parts of the route and model logic. My personal responsibility covered the full application architecture: the database schema design, the authentication system, the real-time notification layer, the frontend single-page application, the map integration, and the visual design of both the interface and the social media campaign assets.

Below I want to walk through the key decisions I made and explain why I made them.

**Backend and API Design**

The backend runs on Node.js with Express. I chose this combination because JavaScript runs on both the server and the client, which means there is no constant switching between languages or mental models when working across the full stack. Express is deliberately minimal, which gave me full control over the structure without an opinionated framework making assumptions I would have to work around. The API is organised into five route files: auth, rides, users, messages, and events. Each file handles one clear domain of responsibility.

For the database I chose MongoDB with Mongoose. The most important design decision was embedding ride requests as subdocuments inside the Ride document rather than creating a separate collection for them. When a driver opens their dashboard, they need to see their rides and the pending requests on those rides together. With a relational database that would require a JOIN query every time. With MongoDB it is a single document read, which is simpler and faster for this specific access pattern. Mongoose also allows logic to live at the model level through save hooks, so the Ride model automatically updates its status to full when all seats are booked, without any route handler needing to manage that separately.

**Authentication**

I used JSON Web Tokens for authentication rather than server-side sessions. The practical reason is that stateless authentication fits naturally with a project that could eventually run across multiple server instances. The token lives in localStorage on the client and travels with every request in the Authorization header. Passwords are hashed with bcrypt at salt factor 12 before they are stored, and the password field on the User model has select: false applied, meaning it is never returned in a query unless explicitly requested. These are not complicated measures but they are the correct ones for an application that handles real student credentials.

**Real-Time Notifications**

Building the real-time notification system was the most technically challenging part of the project for me personally. When a driver accepts a passenger's request, that passenger needs to know straight away. When a new message comes in, the recipient should not have to refresh the page.

I implemented this using Server-Sent Events rather than WebSockets. SSE is unidirectional, browser-native, and uses a standard HTTP connection. There is no additional library, no socket handshake complexity, and the browser handles reconnection automatically. On the server I maintain an in-memory Map that stores open response objects keyed by user ID. When an event fires, the server writes directly to every open connection for that user across all their browser tabs.

I am aware the in-memory approach has a limitation: if the server restarts, any events fired during that window are lost. For a production deployment I would back this with Redis Pub/Sub. For a university deployment the current approach is acceptable and keeps the codebase clean.

**Frontend Architecture**

I chose not to use a JavaScript framework like React for the frontend. The app has eight views. The routing system is showing one div and hiding the others. The state consists of three variables. There is no deeply nested component tree or complex reactive data flow that would benefit from a virtual DOM. Adding React would have added a build pipeline and a layer of abstraction that solves no actual problem I had here. The resulting page loads fast because there is nothing to compile on the client side.

**Map Integration**

For the pickup pin feature I used Leaflet.js with OpenStreetMap tiles. After a driver accepts a passenger's request, the passenger can open a map, drop a pin at their exact pickup location, and save it. The driver can then view that pin from their dashboard. I chose Leaflet over Google Maps because it is open-source, the tiles are free with no API key required for basic use, and it loads significantly less than Google Maps. There is one technical detail worth noting: the map uses an 80 millisecond timeout before Leaflet initialises. This is because Leaflet needs to read the rendered container dimensions, and without a brief pause, it runs before the browser has finished painting the modal.

**Design**

The visual design uses a dark background with lime green as the primary accent. I chose this because it is high contrast, accessible, and deliberately does not look like a standard university web portal. I wanted the product to feel like something students would choose to use, not something they were required to. I used Syne for headings and DM Sans for body text. Syne at heavy weights gives the interface a confident, product-like quality. The layout is fully responsive with breakpoints at 900px and 600px.

**Campaign Assets**

Working closely with Geof, Kisha, and Anas, I designed five branded Instagram posts and two Instagram stories using the CarFun brand colours and typography. Each asset targets a specific message: the brand introduction, how the app works, the savings comparison, a driver recruitment post, and a community social proof post. The marketing copy, hashtag strategies, and audience targeting decisions in these assets came from Geof and Kisha's research. Anas shaped the overall visual tone and led on the video content direction. My role was translating those inputs into production-ready visual assets.

---

## Routes to Market

### Target Audience

The primary audience is Bath Spa RAK students commuting from residential areas across Ras Al Khaimah. The app currently covers Al Nakheel, Al Hamra, Khuzam, Al Mairid, Al Qusaidat, Al Rams, Digdaga, Julfar, Al Marjan Island, Wadi Shah, and surrounding areas. These are students making a regular, predictable journey to a single destination, which is exactly the right condition for a carpooling product. This audience insight came directly from Geof and Kisha's research phase, where they surveyed and spoke to students about their commute habits before the build began.

### Market Context

The global ride-sharing and carpooling market was valued at approximately USD 185 billion in 2023 and is projected to grow significantly through the end of the decade, driven by rising fuel costs, environmental awareness, and the growth of app-based peer-to-peer services (Statista, 2024). Within that broader market, university-specific carpooling sits in a genuinely underserved niche. Large platforms like BlaBlaCar operate at national and regional scale, which creates friction for hyperlocal use cases like a single campus community.

Research consistently shows that students are highly motivated by cost savings on transport. A 2022 study by the National Union of Students in the UK found that transport was among the top three financial concerns for university students, with over 60% citing it as a significant burden on their monthly budget (NUS, 2022). In the RAK context, where public transport infrastructure is limited and car-dependency is high, this pressure is amplified.

### Monetisation

CarFun is currently free for all users, which is the right call for an early-stage product trying to grow a community. Monetisation becomes viable once the user base reaches a meaningful size. The most direct path is a small service fee on transactions between drivers and passengers, similar to the model BlaBlaCar introduced across several markets. A two to three percent fee on accepted ride contributions would generate revenue without noticeably changing the user experience.

A second route is advertising partnerships with businesses that serve the student demographic, such as local food and beverage brands or stationery suppliers. Sponsored content within the app could generate revenue without requiring users to pay anything directly.

A third option is a formal partnership with Bath Spa University. Universities increasingly carry sustainability targets around student commuting. A tool that demonstrably reduces single-occupancy car journeys maps onto those institutional goals and could attract university funding or endorsement.

---

## Evaluation

### Project and Digital Campaign

CarFun as a working prototype achieves what it set out to do. The core user journeys work end to end: a student can register, find a ride, request it, get accepted, receive a real-time notification, open a conversation with their driver, drop a pickup pin on a map, and complete a ride. Each of those steps is functional. The campaign materials are complete, on-brand, and platform-appropriate.

The honest gaps are the areas the application still needs before a real public launch. There is no email verification flow even though the database model has the field ready for it. The profile photo upload is wired into the UI but has no backend endpoint. There is no password reset. The real-time notification system does not reach users when the browser tab is closed. These are all things that a production product would need.

The campaign materials would benefit from real footage. The static social media posts are visually strong, but TikTok especially rewards video over stills. Anas's media work covers this gap, and integrating actual screen recordings of the app into the TikTok scripts would make those assets significantly more effective.

The most important feature still to build is recurring rides. The Ride model already has the fields for it, but the frontend flow is not there yet. For a daily commuter tool, the ability to post one recurring ride for Monday, Wednesday, and Friday rather than three separate entries every week is arguably the single highest-value feature that is missing.

### Team Collaboration

Working as a five-person crew gave CarFun a depth it could not have had with a smaller team. Having Geof and Kisha lead the research and marketing meant that the product decisions Fareedi and I made were grounded in what students actually said they wanted rather than what we assumed they wanted. Their insight into the target audience shaped the feature set directly. Anas's media work gave the project a visual identity that felt genuine rather than generic. That identity then fed back into the app design itself.

The collaboration was not without its friction. The development and marketing workstreams moved at different speeds. Building and testing the backend took longer than initially planned, which put pressure on the final phase when everything needed to come together for the campaign. We managed this by shifting to daily check-ins in the last two weeks of the project rather than the less frequent meetings we had earlier on. That change helped considerably.

One thing I would do differently is establish a shared timeline with fixed milestones across all workstreams from the very beginning of the project. We defined roles clearly from day one, which was the right call. What was less structured was the sequencing of handoffs between teams. Clearer deadlines shared across all five members would have avoided some of the late crunch.

### Individual Development

This project improved me in three specific areas.

On the technical side, the Server-Sent Events implementation was genuinely new territory for me. I had built REST APIs before but had never implemented a persistent server-to-client stream from scratch. Working through the EventSource reconnection behaviour, the in-memory client registry, and the token-via-query-parameter pattern forced me to think carefully about how the browser and server interact at a lower level than a typical API call. That is the kind of learning that sticks.

On the design side, I learned what it feels like to design for a specific audience with specific constraints rather than a hypothetical user. Every decision, from the list of RAK residential areas to the commute days selector to the colour palette, was informed by knowing exactly who would be sitting in front of this. Working alongside Kisha and Geof's research gave me material to design against, and that made the design work more grounded and more honest.

On collaboration, I learned that the development and non-development parts of a project need to stay in closer contact than I naturally default to. I am inclined to go quiet during heavy build phases and surface again when something is ready to show. That habit does not work well in a multi-role team where other people's work depends on knowing where the product is at any given moment. I made a deliberate effort to communicate progress more openly in the second half of the project, and the team coordination improved noticeably as a result.

CarFun is something I am genuinely proud of. It is a tool built for a real community, shaped by real research, and developed with care across every layer of the stack. What it needs now is the final polish to close the gap between working prototype and product that students would trust with their daily routine.

---

## References

National Union of Students (2022). *Student Experience Survey: Financial Wellbeing Report*. NUS UK.

Statista (2024). *Ride-sharing and carpooling market size worldwide 2023–2030*. Statista Research Department.

United Nations (2015). *Transforming our world: the 2030 Agenda for Sustainable Development*. United Nations General Assembly. Resolution A/RES/70/1.

BlaBlaCar (2023). *Impact Report 2023: Community and Sustainability*. BlaBlaCar SAS.
