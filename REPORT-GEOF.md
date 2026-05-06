# CarFun — Individual Project Report
### Final Graduating Project | Bath Spa University RAK
### Module: Digital Incubator
### Author: Geof Raneses

---

## The Artefact

CarFun is a carpooling web application created by a five-person team of Bath Spa University RAK students. It was built for the student community at Bath Spa Academic Centre RAK in Ras Al Khaimah, UAE. The premise is simple: students spread across different parts of RAK are all heading to the same place every day. Most of them are making that trip alone, spending money on fuel or ride-hailing services that they could save if they just coordinated with classmates going the same way. CarFun gives them a structured way to do exactly that.

The application is a fully working web platform. Students can register, set up a profile with their residential area and commute schedule, browse available rides, request seats, accept or reject requests, message their driver or passenger directly, and track everything through a personal dashboard. There is also a feature where accepted passengers can drop a precise map pin at their pickup location so the driver knows exactly where to find them. An admin panel handles user management on the backend. The app runs at http://localhost:3000 during development.

The crew that built this has five members. Dhovie Bryan Costimiano and Fareedi Danish Baloch were responsible for the full technical development of the application. I, Geof Raneses, and Kisha Romeo led the marketing strategy and research workstream, which covered market analysis, target audience definition, social media strategy, and the commercial case for CarFun. Anas Imtiaz handled media production, creating the visual and video campaign materials.

The campaign materials that sit alongside the app include branded Instagram posts, Instagram stories, TikTok video scripts, and platform-ready captions and hashtag libraries. These are collected in the `marketing/` folder of the project.

CarFun aligns well with the incubator theme. It targets a specific social segment, university students, who face a genuine and recurring financial burden that the product directly reduces. It also carries a sustainability argument. More shared journeys means fewer cars making the same trip, which reduces fuel use and carbon output on a route travelled hundreds of times a week across a student population. This sits squarely within the United Nations Sustainable Development Goal 11, which calls for inclusive, safe, and sustainable transport systems (United Nations, 2015). The fact that the product can also generate revenue through a service fee model means it supports all stakeholders: students save money, drivers earn contributions, and the platform sustains itself.

The audience is Bath Spa RAK students who commute regularly from residential areas across Ras Al Khaimah.

---

## The Development

### Ideation and Planning

My role in the early stages of this project was to help the crew find a problem worth solving. We had the brief, we had a team, and we had the freedom to build almost anything. That openness is both exciting and difficult because without constraints it is easy to land on ideas that are interesting but not grounded.

The commute idea came up quickly in our first few meetings, partly because it was something all five of us lived. What made it stick was that it passed a basic test I kept applying to everything we discussed: is this a problem that exists whether or not we build a solution for it? If the answer is yes, and there is no decent existing solution, then there is a real gap to fill. The informal carpooling that BathSpa RAK students were already doing in WhatsApp groups told us the behaviour was there. The platform was not.

Once we committed to the direction, Kisha and I took ownership of the research phase. We wanted to understand the problem properly before the developers started building, because a product built on assumptions rather than evidence tends to solve the wrong version of the problem.

We conducted informal surveys and conversations with BathSpa RAK students, asking about their commute habits, how much they were spending on transport, whether they had ever shared a ride with a classmate and what made that work or not work, and what would make them trust and regularly use an app like CarFun. We also looked at existing carpooling platforms including BlaBlaCar, Uber Pool, and local alternatives to understand what they did well and where they fell short for a hyperlocal university audience.

The research shaped the product in concrete ways. The list of supported RAK residential areas in the app came from the areas students actually mentioned when we asked where they lived. The decision to prioritise the recurring commute flow came from students telling us the biggest frustration was the inconsistency of informal coordination. The real-time messaging feature was ranked as essential in almost every conversation we had. None of this was guesswork.

Alongside the user research, I worked with Kisha to develop the marketing strategy, mapping out the social media platforms we would target, the content formats that would reach the audience, the tone of voice for the brand, and the posting cadence for the campaign rollout.

### My Contribution

My contribution to this project sits across two areas: the research that informed the product, and the marketing strategy and content that formed the campaign.

**Research**

The research work I led with Kisha was the foundation the whole team built on. Before Dhovie and Fareedi wrote a single line of code, Kisha and I had already established who the users were, what they needed, and what would make them trust the product enough to use it regularly.

One of the most important findings from our research was that students were not reluctant to share rides. The problem was not attitude. It was coordination. They did not know who else in their area commuted on the same days, and the informal systems they had were inconsistent and dependent on whoever was willing to post in a group chat that day. This told us that the matching and filtering features in the app were the most critical things to get right, not the social or community features that might seem obvious for a student-targeted product.

We also found that trust was a significant concern, particularly around knowing who you were getting into a car with. The rating and review system built into the app addressed this directly. Knowing that drivers have a visible rating based on past rides gave students a form of social accountability that WhatsApp groups completely lack.

I documented all of this research in my learning journal throughout the module, recording findings after each interview or survey session and noting how they were changing or confirming our assumptions. This running record became a useful reference in team meetings when we were making feature decisions and needed to ground those decisions in what we had actually heard from students.

**Marketing Strategy**

With the research done, Kisha and I developed the full content strategy for CarFun's social media presence. We defined the target personas clearly: the driver who wants to cover fuel costs without any hassle, the passenger who wants a cheap and reliable option that fits their schedule, and the student who has not yet heard of CarFun but uses ride-hailing apps regularly. Each persona shaped what content we created and how we framed the messaging.

We chose Instagram and TikTok as the primary platforms based on the audience's age and behaviour patterns. BathSpa RAK students are in the 18 to 25 age range, which is heavily concentrated on both platforms. Instagram was the right home for polished, branded visual content that communicates credibility. TikTok was the right place for more direct, relatable short-form content that drives awareness and sign-ups.

The five Instagram post concepts I briefed covered five distinct messages: brand awareness, how the product works, the savings argument, driver recruitment, and social proof through community. Each one serves a different stage of the awareness funnel. A student who does not know CarFun exists needs to see the brand. A student who is aware needs to understand how it works. A student who is interested needs to see evidence it is worth trusting.

I also developed the hashtag strategy, building a set of platform-specific tags across three tiers: broad reach tags like #UAE and #StudentLife, mid-tier tags like #RAKStudents and #BathSpaRAK, and niche tags specific to the product like #CarFun and #CarpoolingRAK. Using all three tiers in every post maximises the range of users who might discover the content organically.

The TikTok scripts were written with specific hooks, a clear problem-solution structure, and a direct call to action at the end of each one. I worked with Anas to ensure the scripts were realistic to produce visually and that the spoken pacing would land well in the format.

---

## Routes to Market

### Target Audience

The primary audience is BathSpa RAK students commuting from residential areas in Ras Al Khaimah. Our research identified a community where informal carpooling was already happening but without any structure or reliability. The areas with the highest concentration of students commuting to the RAK campus, based on conversations we had, include Al Nakheel, Al Hamra, Khuzam, and Al Marjan Island, though the app supports all the major RAK areas.

Within that audience, the sub-segments with the strongest immediate motivation are: students currently paying for taxis or ride-hailing services daily (clear financial motivation), students who drive alone and would welcome a contribution towards fuel costs (clear financial motivation), and students who commute on consistent weekly schedules (the product serves them best).

### Market Context

The global carpooling market is large and growing. Valued at approximately USD 185 billion in 2023, it is projected to expand further as fuel costs remain high and environmental consciousness becomes a stronger factor in transport choices among younger demographics (Statista, 2024). The university segment within this market is underserved. Platforms built for intercity travel do not translate naturally to the hyperlocal commuter context of a single campus. CarFun sits in that gap.

Student financial pressure around transport is well established. Over 60% of UK university students cited transport as a top three financial concern in a 2022 study by the National Union of Students (NUS, 2022). The structural conditions in the UAE, where car dependency is high and public transit options limited, make this pressure more acute for BathSpa RAK students specifically.

The informal behaviour we observed during our research also tells us something important: the market is not theoretical. Students are already trying to carpool without a platform. That organic behaviour is the strongest possible signal that a structured solution would be used.

### Monetisation

The platform launches free to build the community and establish trust. Once the user base is stable, a small service fee on accepted ride contributions is the natural first revenue stream. BlaBlaCar demonstrated across multiple markets that a percentage fee on transactions is acceptable to users as long as the platform consistently delivers value (BlaBlaCar, 2023).

Beyond transaction fees, advertising partnerships with student-relevant local businesses represent a low-friction revenue stream that does not change the user experience. A partnership with Bath Spa University directly is worth pursuing, given the institution's interest in sustainability metrics and student welfare outcomes. Sponsoring or endorsing CarFun would align with both.

---

## Evaluation

### Project and Digital Campaign

The artefact is a genuinely functional product. The technical team delivered an application that covers all the core user needs we identified in research. The campaign materials are well-aligned with the brand and the audience. Looking at the social media posts and TikTok scripts alongside the app itself, they feel like they come from the same place, which is something that only happens when the product development and the marketing development are in close enough communication throughout.

The areas I would develop further in the campaign are around real footage and real testimonials. The current assets are built around designed graphics and written scripts, which work well for a launch phase. But the most effective long-term social media content for a product like CarFun would be students talking about their experience in their own words. Real user-generated content and driver or passenger testimonials on camera would build trust faster than any polished branded post.

The content calendar we developed for the campaign rolls out across four weeks of initial posts. Extending that into a sustained monthly content schedule would keep the brand visible and continue to grow the community beyond the initial launch burst.

### Team Collaboration

Our team collaborated well overall. The clearest evidence of this is that the product and the campaign feel consistent. The app's design reflects the brand positioning. The marketing materials reflect the actual features of the app. That alignment does not happen without communication between the teams, and we had that.

There were moments where the pace difference between development and marketing created tension. Marketing planning can move faster than software development, which means we sometimes had campaign assets ready before the features they were promoting were finalized. This is a fairly standard challenge in product development, and we managed it by staying flexible in the campaign plan and keeping close contact with the developers on timing.

The most effective period of collaboration was the final two weeks, when we moved to daily check-ins and everyone had a clear shared view of what was still to be done. Earlier implementation of that cadence would have smoothed out the middle section of the project.

### Individual Development

This project improved my understanding of research as a design input rather than just an academic exercise. Going into conversations with real students and asking direct questions about their behaviour and pain points was more valuable than any secondary source I could have read. The findings shaped the product in measurable ways, and seeing those decisions reflected in the final application made the research feel meaningful.

On the marketing side, I developed a more structured approach to campaign planning. In previous projects I had tended to jump to creative execution without enough clarity on the audience and the message. Working through audience personas, platform selection, content pillars, and posting strategy before producing any actual content made everything that came after more purposeful and more coherent.

Where I want to improve is in managing the handoff between strategy and execution. I developed the strategy, but the translation of that strategy into the individual assets was sometimes less precise than it could have been because the briefing process was informal. A written creative brief for each asset, even a short one, would have sharpened the output and made it easier for Anas to execute exactly what we had planned.

CarFun is something I believe in as a product. It solves a real problem in a real community using a straightforward tool. The market is there, the behaviour is there, and the platform is built. What comes next is growing the user base, and that is where the marketing and research work our team laid down becomes the most important thing of all.

---

## References

National Union of Students (2022). *Student Experience Survey: Financial Wellbeing Report*. NUS UK.

Statista (2024). *Ride-sharing and carpooling market size worldwide 2023–2030*. Statista Research Department.

United Nations (2015). *Transforming our world: the 2030 Agenda for Sustainable Development*. United Nations General Assembly. Resolution A/RES/70/1.

BlaBlaCar (2023). *Impact Report 2023: Community and Sustainability*. BlaBlaCar SAS.
