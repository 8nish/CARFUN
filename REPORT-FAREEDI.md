# CarFun — Individual Project Report
### Final Graduating Project | Bath Spa University RAK
### Module: Digital Incubator
### Author: Fareedi Danish Baloch

---

## The Artefact

CarFun is a full-stack carpooling web application built by our five-person crew for the student community at Bath Spa Academic Centre RAK in Ras Al Khaimah, UAE. The core idea is something every one of us felt personally before we even started the project. Students living across different parts of RAK are making the same trip to campus every single day. Most of them do it alone. Most of them spend more on transport than they should have to. CarFun connects those students so they can share rides, coordinate pickups, and genuinely cut down what the commute costs them each month.

The artefact is a live, working web application that includes user registration and login, a ride listing page with area and date filters, a full ride offering flow for drivers, a request and acceptance system, real-time push notifications, an in-app messaging system between matched drivers and passengers, a Leaflet map for passengers to drop a precise pickup pin, and an admin dashboard for managing users. It is accessible at http://localhost:3000 during development.

Our crew of five had clearly split responsibilities. Dhovie Bryan Costimiano and I, Fareedi Danish Baloch, worked together on the technical development of the application. Geof Raneses and Kisha Romeo covered marketing strategy and research, including audience analysis, the social media content plan, and the commercial case for the product. Anas Imtiaz was responsible for media production, handling the visual and video assets that formed the public-facing campaign.

The campaign materials sit alongside the application and include branded Instagram posts and stories, five TikTok video scripts written specifically for the BathSpa RAK student audience, and platform-ready captions and hashtag sets. They are stored in the project's `marketing/` folder.

CarFun fits the incubator theme in a meaningful way. It targets a real social segment: university students who are financially stretched and transport-dependent. It reduces the cost of a non-optional daily activity. It also contributes to sustainability goals by putting more people in fewer cars, which directly reduces carbon emissions per journey. The UN Sustainable Development Goal 11 focuses on making cities and communities more sustainable through better transport systems, and increasing vehicle occupancy on a fixed commute route is a practical, ground-level version of that goal (United Nations, 2015).

The intended users are Bath Spa RAK students who live across the residential areas of Ras Al Khaimah and need a reliable, affordable way to get to campus. Both drivers with empty seats and passengers looking for rides are served by the platform.

---

## The Development

### Ideation and Planning

When we sat down as a group at the beginning of the module, the brief was open: build something that addresses a real need and has a plausible path to market. We spent the first couple of sessions throwing ideas around before the commute problem emerged clearly. It came up in conversation because it was something all five of us dealt with every day. That grounding in personal experience was useful because it meant we were not guessing about whether the problem was real.

Once we agreed on the direction, Geof and Kisha took ownership of the research phase. They conducted informal interviews with BathSpa RAK students to understand commute patterns, asked about transport spending, and looked at what existing apps were doing in the carpooling space. That research gave Dhovie and me a concrete foundation to build from. We knew which residential areas to support. We knew what kind of matching logic mattered most to users. We knew that the informal carpooling already happening in WhatsApp groups was the behaviour we were trying to formalise rather than replace.

Dhovie and I then planned the technical build in phases. Phase one was the backend infrastructure. Phase two was the frontend. Phase three was the real-time notification system and messaging. Phase four was integration, testing, and producing the campaign assets in collaboration with the marketing and media team.

We held regular crew check-ins throughout and used a shared task list to track who was doing what. In the later stages of the project these check-ins became more frequent, which helped considerably as the deadline approached and different workstreams needed to come together.

### My Contribution

Dhovie and I worked closely throughout the development, but we each took primary ownership of different parts of the system. Dhovie led on the frontend single-page application, the real-time Server-Sent Events layer, the map integration, and the visual design of the application and campaign assets. My primary focus was the backend data models, the API route logic, and the authentication system. Below I want to walk through the decisions I made and explain the reasoning behind them.

**Data Modelling**

The three core models in the application are User, Ride, and Conversation. Getting these right early on was the most important thing I could do for the project, because almost every other technical decision in the backend follows from the shape of the data.

The User model needed to hold more than just basic identity fields. For CarFun to work, the platform needs to know where a student lives and when they typically commute. So the User model stores the user's RAK residential area from a fixed list of options, their commute days as an array of weekday strings, and their preferred departure and return times. It also holds driver-specific fields like car registration, car model, and available seats. The reason I used a strict enum for the area field rather than a free-text input is consistency. If matching is based on area, the area values have to be identical across users. Free text creates variations that silently break matching.

The Ride model has an embedded array of request subdocuments. Each request stores the passenger who made it, the current status of that request, and a pickup location with latitude and longitude coordinates. Embedding requests inside the ride document rather than keeping them in a separate collection was a decision Dhovie and I discussed together. The reasoning was access pattern. Every time a driver views their dashboard, they need the ride and its requests at once. Embedding those together means one database read rather than two.

The Conversation model anchors each chat thread to a specific ride and a specific passenger. A unique compound index on ride and passenger ensures the same conversation cannot be created twice for the same pair. Conversations are created automatically when a request is accepted, which means drivers and passengers never have to manually start a chat.

**API Routes**

I built out the route structure across five files: auth, rides, users, messages, and events. The separation was deliberate. Each file owns one domain. Auth handles identity. Rides handles the core carpooling workflow. Users handles profiles, matching, and administration. Messages handles conversations. Events handles the Server-Sent Events stream.

Within the rides routes, the logic for accepting and rejecting passenger requests includes two things that are worth explaining. When a driver accepts a request, the backend increments the seatsBooked counter on the ride, checks the pre-save hook which automatically marks the ride as full if needed, and simultaneously creates the conversation between driver and passenger if one does not already exist. All of this happens in a single request handler. The alternative would have been separate API calls from the frontend, which would introduce timing issues and the risk of partial state.

**Authentication**

For auth I used JSON Web Tokens with bcrypt for password hashing. JWTs are stateless, which means the server does not need to maintain session state. The token is signed with a secret stored in the environment and expires after 30 days. I set the bcrypt salt rounds to 12, which is a meaningful security level without being impractically slow at registration time.

The middleware layer has four variants: protect, optionalAuth, driverOnly, and adminOnly. protect is used on any route that requires a logged-in user. optionalAuth attaches the user object if a token is present but does not reject requests without one, which is used on the public rides listing so that unauthenticated visitors can browse but cannot request rides. driverOnly and adminOnly sit on top of protect and enforce role-specific access.

**Testing**

Testing was done manually across the main user flows: registration as both driver and passenger, posting a ride, requesting a ride, accepting and rejecting requests, sending messages, and using the admin panel. We also tested the SSE notifications by having two browser windows open simultaneously and confirming that events arrived in real time without page refresh. There is no automated test suite in the current version of the project, which is something I would add before any real deployment.

---

## Routes to Market

### Target Audience

The primary audience is Bath Spa RAK students commuting from residential areas in Ras Al Khaimah. The app currently supports Al Nakheel, Al Hamra, Khuzam, Al Mairid, Al Qusaidat, Al Rams, Digdaga, Julfar, Al Marjan Island, Wadi Shah, and surrounding areas. These are students making a predictable, recurring journey to a single destination, which is the best possible condition for a carpooling product. The research Geof and Kisha conducted before the build confirmed that informal carpooling coordination was already happening among students. The market was not something we had to create. It already existed without a platform.

### Market Context

The global carpooling and ride-sharing market was valued at approximately USD 185 billion in 2023 and is expected to grow steadily through the rest of the decade as fuel costs rise and sustainability awareness increases (Statista, 2024). The university carpooling niche within that market is notably underserved. Platforms like BlaBlaCar are designed for intercity travel between strangers. They are not built for a community of a few hundred students making the same five-kilometre trip every weekday.

Student transport costs are a well-documented pressure point. Research from the National Union of Students found that over 60% of UK university students cited transport as one of their top three financial concerns in 2022 (NUS, 2022). In the UAE context, where personal vehicle dependency is significantly higher than in countries with strong public transit, this financial pressure is even more pronounced.

### Monetisation

The product launches free, which is the right approach for building initial trust and user numbers in a small community. Once the platform has a critical mass of regular users, a small service fee on ride contributions is the most natural first revenue model. BlaBlaCar uses a similar structure and has shown that even a modest percentage fee is tolerable for users when the platform consistently delivers value (BlaBlaCar, 2023).

A second option is local advertising partnerships with brands targeting the student demographic. A third is a formal arrangement with Bath Spa University, which would have strong motivation to support a tool that visibly reduces the environmental footprint of its student community's commuting.

---

## Evaluation

### Project and Digital Campaign

The prototype works. The full user journey from registration through to a completed ride with real-time notifications and in-app messaging is functional. The campaign materials are polished and consistent with the app's design identity.

The gaps are real and worth being honest about. Email verification is missing. Password reset is not built. The profile photo feature exists in the UI but has no backend support. These are not minor cosmetic issues. They are things that would block a real public launch. They represent the gap between a working prototype and a production-ready product, and closing that gap would be the first priority if the project were to continue.

The recurring rides feature is probably the highest-value missing piece from a user perspective. A student who commutes four days a week does not want to create four separate ride listings every week. The data model already supports it. The frontend flow needs to be built.

### Team Collaboration

The team dynamic worked well because the role split was genuine rather than nominal. Geof and Kisha actually conducted research. Anas actually produced media assets. Dhovie and I actually built the application. Nobody was a passenger on someone else's contribution. That made collaboration feel meaningful rather than procedural.

The challenge was synchronisation. Development moves at an uneven pace. There are phases where progress is fast and visible, and phases where you are deep in a problem that takes days to surface from. The marketing and media team needed updates on where the product was so they could align their content. We managed this reasonably well in the back half of the project once we moved to more frequent check-ins, but earlier structure would have prevented some of the catch-up work in the final weeks.

If I were doing this again I would push for a shared milestone document at the project's start, owned collectively rather than by one person, with clear handoff dates that all five members signed up to.

### Individual Development

The part of this project I found most difficult was also the part I learned the most from: data modelling under uncertainty. At the start of the project I did not know exactly what features would be built or how the frontend would use the data. Writing models that would hold up across all those unknowns required thinking a few steps ahead and making decisions I could not fully validate yet. Some of those decisions held up well. A few required changes mid-build when the frontend usage did not match what I had assumed. That experience gave me a much more practical sense of how important early schema design is, and how to think about it with more flexibility built in from the start.

On the collaboration side, working in a paired development team with Dhovie was genuinely productive. We are both technical, which meant we could review each other's code, challenge each other's decisions, and catch things that solo development would have missed. I want to bring that habit of peer review into future projects regardless of team structure.

On time management, I learned that the phases I had planned for were not wrong, but the time I allocated to each was too optimistic. The testing phase in particular took significantly longer than I had budgeted. Real user flows surface edge cases that do not show up when you are the developer testing your own assumptions. I would plan for more generous testing time in future.

CarFun is something our whole crew can be proud of. It is a real product with a real use case, built on solid technical foundations, and supported by thoughtful marketing and media work. Getting it to a fully launchable state from where it is now is a matter of weeks of focused work, not months of rebuilding.

---

## References

National Union of Students (2022). *Student Experience Survey: Financial Wellbeing Report*. NUS UK.

Statista (2024). *Ride-sharing and carpooling market size worldwide 2023–2030*. Statista Research Department.

United Nations (2015). *Transforming our world: the 2030 Agenda for Sustainable Development*. United Nations General Assembly. Resolution A/RES/70/1.

BlaBlaCar (2023). *Impact Report 2023: Community and Sustainability*. BlaBlaCar SAS.
