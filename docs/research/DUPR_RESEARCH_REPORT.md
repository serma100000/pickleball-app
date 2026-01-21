# DUPR and Pickleball Rating Ecosystem Research Report

## Executive Summary

This report provides comprehensive research on DUPR (Dynamic Universal Pickleball Rating) and the broader pickleball rating ecosystem. DUPR has become the dominant rating system in pickleball, recently becoming the official rating partner of USA Pickleball, PPA Tour, and APP Tour. Understanding DUPR's strengths, weaknesses, and integration approach is critical for building a competitive pickleball application.

---

## Table of Contents

1. [DUPR Overview](#1-dupr-overview)
2. [Rating Algorithm Deep Dive](#2-rating-algorithm-deep-dive)
3. [Score Submission & Verification](#3-score-submission--verification)
4. [Club Features](#4-club-features)
5. [Tournament Integration](#5-tournament-integration)
6. [League Features](#6-league-features)
7. [API & Integration](#7-api--integration)
8. [Pricing Model](#8-pricing-model)
9. [Player Experience](#9-player-experience)
10. [Controversies & Complaints](#10-controversies--complaints)
11. [Competitor Analysis](#11-competitor-analysis)
12. [Business Model & Ownership](#12-business-model--ownership)
13. [Integration Opportunities](#13-integration-opportunities)
14. [Competitive Differentiation Opportunities](#14-competitive-differentiation-opportunities)

---

## 1. DUPR Overview

### What is DUPR?

DUPR (Dynamic Universal Pickleball Rating) is a pickleball rating system founded in 2021 by Steve Kuhn, who also founded Major League Pickleball. Originally called "Dreamland Universal Pickleball Rating," it was developed to create a standardized, universal rating system for the rapidly growing sport.

**Key Statistics:**
- Over 1 million DUPR-rated players
- Scale: 2.000 to 8.000 (beginners to professionals)
- Adopted as official rating by USA Pickleball, PPA Tour, and APP Tour (as of late 2025)

**Sources:**
- [DUPR Official Website](https://www.dupr.com/)
- [DUPR Wikipedia](https://en.wikipedia.org/wiki/DUPR)

---

## 2. Rating Algorithm Deep Dive

### Core Algorithm

DUPR uses a **modified Elo algorithm** that analyzes match results, incorporating multiple factors:

**Original System (Pre-July 2025):**
- Based primarily on win/loss outcomes
- Winning increased rating, losing decreased it
- Score margin had limited impact

**July 2025 Algorithm Update - "Performance vs Expectation" Model:**

The July 8, 2025 update was a **major paradigm shift**, replacing win-loss with a point-by-point performance model:

1. **Expected Score Calculation:** Every match has an expected score based on team average ratings
2. **Performance Gap Matters:** A 0.1 DUPR gap equals approximately 1.2 points in an 11-point game
3. **Point Differential:** If you score more points than expected, rating goes up; fewer points = rating goes down
4. **Winning Isn't Everything:** You can win and have your rating drop if you underperformed expectations
5. **Losing Can Help:** Outperforming expectations in a loss can still raise your rating

### Rating Calculation Factors

| Factor | Weight/Impact |
|--------|---------------|
| **Match Outcome** | Base factor - performance vs expected |
| **Score Differential** | How much you over/under-performed |
| **Opponent Rating** | Higher-rated opponents = more impact |
| **Match Type** | Tournament/Club > Self-reported |
| **Recency** | Recent matches weighted more heavily |
| **Match Format** | Longer formats (best of 3) yield more data |

### Separate Ratings

- **Singles and Doubles are completely separate** - strategically different games
- Each player has independent ratings for each format
- Mixed doubles results feed into the unified doubles rating

### Anti-Sandbagging Design

The new algorithm specifically targets sandbagging:
- Higher-rated players farming easy wins get penalized for coasting
- Underdogs earn credit for keeping matches close
- Ratings update within minutes, not days

**Sources:**
- [DUPR Rating Algorithm Explanation](https://dupr.zendesk.com/hc/en-us/articles/26776910169108-How-is-the-DUPR-rating-calculated)
- [New DUPR Algorithm Explained - 11 Pickles](https://www.11pickles.com/post/new-dupr-pickleball-explained)
- [How DUPR Works - Pickleheads](https://www.pickleheads.com/guides/how-dupr-works)

---

## 3. Score Submission & Verification

### Methods of Score Submission

#### 1. Self-Reported Matches
- Any player can submit recreational/open play scores
- All participants must have DUPR profiles
- All players should agree before the game to submit scores
- DUPR notifies opponents to verify the score
- **Lower weight** on rating compared to organized play

#### 2. Club-Reported Matches
- Club directors submit match results
- No player validation required (trusted director)
- **Higher weight** - same as tournament matches
- Automatic validation since trusted organizer submits

#### 3. Tournament Integration (Automatic)
- Integrated platforms automatically upload results
- Highest credibility and weight
- No manual entry required
- Updates as soon as tournament director locks results

#### 4. Coach-Assigned Ratings
- For players without any matches
- Certified DUPR coaches assess players on-court
- Evaluates: Serve, Return, Dinking, 3rd Shot Drop, etc.
- Two options:
  - In-person assessment (coach sets pricing)
  - Video submission via MyDUPRCoach app ($49.99/year subscription)
- Coach can update until player logs first match

### Match Weighting Hierarchy

| Source | Weight |
|--------|--------|
| DUPR Verified Events | **150%** (50% bonus) |
| Tournament/Club Matches | **100%** (standard) |
| Self-Reported Matches | **Lower** (reduced impact) |

### Verification Process

1. Player submits match with all scores
2. All players receive notification to verify
3. Once verified, ratings update (near real-time)
4. Incorrect matches can be corrected by club director or tournament director

**Sources:**
- [DUPR How It Works](https://www.dupr.com/how-it-works)
- [Adding Club Matches](https://dupr.zendesk.com/hc/en-us/articles/20549006556052-How-do-I-add-a-match-using-my-club)
- [Coach-Assigned Ratings](https://www.dupr.com/post/kickstart-your-pickleball-journey-with-coach-assigned-ratings)

---

## 4. Club Features

### DUPR Digital Clubs

DUPR allows anyone to create a "digital club" - **completely free**.

#### Core Club Features

| Feature | Description |
|---------|-------------|
| **Member Roster** | Track all club members in one place |
| **Club Leaderboard** | Rankings within your club |
| **Club Feed** | Social feed for club activity |
| **Match Submission** | Directors add matches directly to DUPR |
| **Bulk Invites** | CSV upload for member invitations |
| **API Partner Access** | Access to integrated tournament software |
| **Dedicated Account Manager** | Support for club management |

#### Club Creation Process

1. Fill out application form (contact info, location, member count)
2. DUPR reviews within 3-5 business days
3. Receive onboarding email and dedicated account manager
4. Begin adding members and running events

#### Club Match Benefits

- **No player validation required** - trusted director submits
- **Full weight** on rating (same as tournaments)
- **Instant updates** - ratings refresh almost immediately

#### Club Director Tools

- Add individual or bulk matches
- Upload via CSV template
- Connect to API partner software
- View member statistics and progress

**Sources:**
- [DUPR Clubs](https://www.dupr.com/clubs)
- [Club Resources](https://www.dupr.com/club-resources)
- [Club Benefits](https://www.support.mydupr.com/post/what-are-the-benefits-of-becoming-a-dupr-club)

---

## 5. Tournament Integration

### Official Integration Partners

DUPR has integrated with major tournament platforms:

1. **PickleballTournaments.com**
2. **PickleballBrackets.com**
3. **Pickleball.com**
4. **Swish Sports App**
5. **Pickleball Den**
6. **CourtReserve**
7. **Playbypoint**
8. **PodPlay**

### How Integration Works

1. **Player Account Linking:** Players connect Pickleball.com profile to DUPR
2. **DUPR ID Required:** All participants need a DUPR ID for automatic processing
3. **Automatic Upload:** Scores flow to DUPR at match completion
4. **Rating Updates:** Updates occur when tournament director locks results

### Key Requirements

- All participants must have linked DUPR accounts
- Unlinked players show indicator in tournament brackets
- If any player isn't linked, that match won't sync to DUPR

### Tournament Director Features

- Choose to run DUPR-rated events
- Seed players based on DUPR ratings
- Set bracket requirements by DUPR level
- Auto-upload all results post-event

### Anti-Sandbagging Benefits

The integration "prevents sandbagging by giving organizers and players the tools to ensure that players are signing up for brackets at their DUPR rating."

**Sources:**
- [DUPR Tournament Integration FAQ](https://www.dupr.com/post/pickleball-tournaments-and-pickleball-brackets-integration-with-dupr---faqs)
- [Integration FAQs - PB Manual](https://www.manula.com/manuals/pickleball-brackets/pbmanual/1/en/topic/dupr-integration-faq)
- [DUPR Integration with Pickleball.com](https://pickleballplaysolutions.wordpress.com/2024/07/26/how-to-connect-your-pickleball-com-profile-to-dupr/)

---

## 6. League Features

### DUPR Sessions

- Two-hour round-robin sessions
- Games to 11 points
- Randomly assigned partners OR pre-partnered events
- Ratings update after each session

### Round Robin Support

DUPR supports round robin format where:
- Every player/team plays every other player/team
- No elimination - everyone gets consistent playtime
- All matches count toward rating

### Minor League Pickleball

DUPR powers Minor League Pickleball format:
- Teams of 4 players (2 women, 2 men)
- Divisions based on combined DUPR rating
- Four 21-point games (2 gendered, 2 mixed)
- Round-robin group play followed by playoffs

### Recreational Play Support

- Self-reported rec matches count (with lower weight)
- No tournament requirement to have a rating
- Sign up for DUPR Sessions or manually log matches

**Sources:**
- [Round Robin Guide](https://www.dupr.com/post/what-is-a-round-robin-and-how-to-run-it)
- [Minor League Pickleball Rules](https://www.dupr.com/minorleague/rules)
- [Tournaments & Leagues Explained](https://www.dupr.com/post/pickleball-tournaments-leagues-explained-your-guide-to-competitive-play)

---

## 7. API & Integration

### Current API Status

**CRITICAL FINDING: DUPR does not have a public API.**

The DUPR API is described as "very much a backend for frontend API" - meaning it's designed for their own applications, not third-party developers.

### What Exists

| Resource | Status |
|----------|--------|
| Public API | **Not Available** |
| Developer Documentation | **Not Available** |
| Swagger UI | Exists at `backend.mydupr.com/swagger-ui/index.html` (partner access only) |
| Partner API Access | Available for approved integration partners |

### How to Get Integration Access

1. **Become a DUPR Club** - Gain access to integrated API partners
2. **Partner with DUPR Directly** - Contact support@mydupr.com
3. **Use Existing Partners** - Leverage platforms that already integrate

### Integration Partner Requirements

- Must work with DUPR account manager
- All participants need DUPR IDs
- Results must include all required match data
- Approval process for becoming official partner

### Scraping Considerations

According to independent research, the DUPR API:
- Uses sequential integer-based keys (not UUIDs)
- Returns data in different formats depending on "screen"
- Would require significant redesign for public API
- Currently optimized for their frontend applications

**Sources:**
- [DUPR Integration FAQ](https://www.manula.com/manuals/pickleball-brackets/pbmanual/1/en/topic/dupr-integration-faq)
- [Scraping DUPR Data - PK Shiu](https://www.pkshiu.com/loft/2023/3/scraping-dupr-data-public-vs-private-api)
- [CourtReserve DUPR Integration](https://courtreserve.com/dupr-integration/)

---

## 8. Pricing Model

### Free Tier (Players)

- Create DUPR account
- Get rated after 1 match
- View your rating and match history
- Join clubs
- Self-report matches
- Basic profile and stats

### DUPR+ Premium ($3.99/month or $29.99/year)

| Feature | Description |
|---------|-------------|
| Ad-free experience | No advertisements |
| Member-only discounts | Deals on JOOLA, Vulcan, Gamma, Diadem, etc. |
| 7-day free trial | Risk-free trial period |
| Cancel anytime | No commitment |

### Club Pricing

**DUPR Clubs are completely FREE.** No subscription costs for:
- Club creation
- Member management
- Match submission
- Leaderboards
- API partner access
- Account manager support

### MyDUPRCoach App

- **Free to download**
- **$49.99/year** for video-based rating assessment
- In-person coach assessments priced by individual coaches

### Third-Party Integrations

Club management platforms with DUPR integration typically charge:
- $99/month for core features
- $199/month for advanced event management

**Sources:**
- [DUPR+ Subscription](https://www.dupr.com/duprplus)
- [DUPR Clubs Pricing](https://www.dupr.com/clubs)

---

## 9. Player Experience

### Profile Features

| Feature | Description |
|---------|-------------|
| **DUPR Rating** | 2.000-8.000 scale |
| **Reliability Score** | 1-100% confidence metric |
| **Separate Ratings** | Singles and Doubles independent |
| **Match History** | Full record of all matches |
| **Win/Loss Record** | Performance tracking |
| **Average Opponent Rating** | Who you play against |
| **Performance Trends** | Progress over time |

### Reliability Score

The Reliability Score (1-100%) measures how dependable your rating is:

**Factors Affecting Reliability:**
- Number of matches played
- Recency of matches
- Diversity of opponents/partners
- Source of matches (rec vs organized play)

**Reliability Thresholds:**
- 60% = "Passing" - recommended minimum for competitive play
- 100% = "Fully Reliable" - maximum confidence

**Half-Life Requirement:**
- 3 results in last 90 days
- 6 results in last 180 days
- 12 results in last 270 days
- Requirements double every 90 days

### Social Features

- **Player Discovery:** Browse profiles by location, rating
- **Direct Messaging:** Connect with other players
- **Social Feed:** Share wins, photos, updates
- **Friend Connections:** Build your network

### Mobile Apps

- iOS App (App Store)
- Android App (Google Play)
- Web application (dupr.com)

**Sources:**
- [DUPR How It Works](https://www.dupr.com/how-it-works)
- [Reliability Score Explained](https://www.dupr.com/post/introducing-the-dupr-reliability-score)
- [DUPR iOS App](https://apps.apple.com/us/app/dupr/id1567932355)

---

## 10. Controversies & Complaints

### Major Issues

#### 1. Sandbagging / Rating Manipulation

**The Problem:**
- Players create fake/duplicate accounts to lower ratings
- Selective score reporting (upload losses, hide wins)
- Strategic inactivity after hot streaks
- Cash tournament fraud in some regions (Phoenix area documented)

**Notable Cases:**
- "Optimusfiner" controversy on Reddit - player accused of gaming the system
- Phoenix area cash tournaments with documented fake DUPR accounts

#### 2. Lack of Verification System

**Key Critique:**
> "DUPR does not have a Verification system. DUPR provides a single rating that takes into account all results, regardless of the source. This has been one of the biggest critiques."

- Players can post fake scores
- Self-reported matches have integrity issues
- Negative tournament experiences from manipulated ratings

#### 3. Trust Erosion

Community sentiment:
> "Beyond the frustration, sandbagging corrodes trust. It discourages new competitors, frustrates honest players, and forces directors into tense conversations no one enjoys."

### DUPR's Response

#### DUPR Verified Program (2026)

Announced solution launching in 2026:

| Feature | Description |
|---------|-------------|
| TSA PreCheck-like screening | Comprehensive player/club vetting |
| DUPR+ requirement | Active subscription required |
| Phone verification | One account per phone number |
| Fairplay Committee | Oversees events and conduct |
| 50% rating boost | Verified matches count more |

**Early Adopters:**
- 300+ clubs committed
- Minor League Pickleball
- Top Tier Pickleball League
- World of Pickleball

#### July 2025 Algorithm Update

Designed to combat sandbagging:
- Higher-rated players farming easy wins get penalized
- Performance vs expectation model
- Underdogs earn credit for close matches

**Sources:**
- [DUPR Fraud Cases - SirShanksAlot](https://sirshanksalot.com/the-case-of-the-dupr-fraud-in-pickleball/)
- [Cash Tournament Problems](https://sirshanksalot.com/the-dark-side-of-cash-tournaments-uncovering-fake-duprs-in-pickleball/)
- [DUPR Verified Announcement](https://pickleballhq.co/dupr-verified-ending-pickleballs-sandbagging-crisis/)
- [Sandbagging Solutions](https://www.pickleballmax.com/2025/01/dupr-pickleball-ratings-sandbagging/)

---

## 11. Competitor Analysis

### UTR-P (Universal Tennis Rating for Pickleball)

**Current Status:** Was USA Pickleball's partner before DUPR took over in late 2025.

| Aspect | UTR-P | DUPR |
|--------|-------|------|
| **Scale** | 1-10 | 2-8 |
| **Official Status** | Former USA Pickleball partner | Current official partner |
| **Verification** | Verified vs Unverified distinction | Single unified rating |
| **Update Frequency** | Every 24 hours | Near real-time |
| **Match Sources** | Sanctioned events weighted more | All sources with different weights |
| **Sandbagging Protection** | Better - players with <6 matches can't affect others | Weaker until July 2025 update |

**April 2025 UTR-P Update:** Adjusted all ratings down 0.5 points to align with other systems.

### UTPR (USA Pickleball Tournament Player Rating)

**Status:** Being phased out/sunsetted

| Aspect | UTPR |
|--------|------|
| **Source** | USA Pickleball sanctioned tournaments only |
| **Update** | Weekly (4-digit), Quarterly (2-digit) |
| **Limitation** | Only tournament players get rated |
| **Scale** | Similar 1-6+ range |

### Other Rating Systems

| System | Description |
|--------|-------------|
| **IPTPA** | International Pickleball Teaching Professional Association - $25 individual membership, certified assessors |
| **WPF Rating** | World Pickleball Federation - for international play |
| **VAIR** | Alternative rating system |
| **Self-Rating** | Player self-assesses against USA Pickleball skill sheets |
| **Computer Vision** | Emerging AI-based ratings from video analysis |

### Competing Apps

#### PicklePlay
- Endorsed by Tyson McGuffin
- Court finder + booking
- Club management software
- Event creation and payments
- Social features

#### Pickleheads
- Official USA Pickleball court finder
- 16,000+ locations
- Game scheduling tools
- Integrates DUPR ratings
- Free with premium tiers ($5-$50)

#### Other Apps
- **PickleUp** - Social networking + local games
- **Pickleball FYI** - Beginner resources
- **PB Vision** - Video analysis with AI ratings

**Sources:**
- [UTR-P Rating](https://usapickleball.org/tournament-player-ratings/)
- [DUPR vs UTPR Comparison](https://pickleballunion.com/dupr-vs-utpr/)
- [Five Rating Systems Explained](https://pickleballunion.com/standardized-pickleball-rating-systems/)
- [Pickleball Apps Comparison](https://pickleball-wiki.com/best-pickleball-apps/)

---

## 12. Business Model & Ownership

### Ownership History

1. **2021:** Founded by Steve Kuhn (also founded Major League Pickleball)
2. **2024 (January):** Controlling interest acquired by consortium led by David Kass
3. **$8 million investment** from new investors

### Current Investors

| Investor | Role |
|----------|------|
| David Kass | Owner and Chairman |
| Andre Agassi | Board member/investor |
| Raine Ventures | Investment firm (subsidiary of The Raine Group) |
| Jay Farner | CEO of Ronin Capital Partners |
| Brian Yeager | Chairman & CEO, The Champions Companies |
| R. Blane Walter | Founder, InChord Communications |
| Hyperspace Ventures | Early investor |

### Connection to Major League Pickleball

- Steve Kuhn founded both DUPR and MLP
- MLP team ownership includes equity in DUPR
- "DUPR gives us a play into the grassroots growth of the game"
- DUPR described as "analytics company with data on grassroots market"

### Broader Pickleball Investment Landscape

- **Tom Dundon (Dundon Capital Partners):** Major footprint - owns Carolina Hurricanes
- **SC Holdings:** Part of $75M injection into United Pickleball Association
- **Celebrity Investors:** Patrick Mahomes, LeBron James, Kevin Durant, Heidi Klum

### Market Size

- 2024 global pickleball market: **$2.2 billion**
- 2034 projection: **$9.1 billion**
- CAGR: **15.3%**

### Revenue Streams

1. **DUPR+ Premium Subscriptions** ($30/year individual)
2. **Partner Integrations** (software platforms)
3. **Data/Analytics** (grassroots market data)
4. **MyDUPRCoach** ($50/year video assessments)
5. **Future: Verified Program** (club subscriptions TBD)

**Sources:**
- [DUPR Investment Announcement](https://www.dupr.com/post/andre-agassi-david-kass-and-raine-ventures-acquire-controlling-interest-in-dupr-invest-dollar8m)
- [MLP-DUPR Relationship - Sportico](https://www.sportico.com/leagues/other-sports/2022/major-league-pickleball-dupr-1234692193/)
- [Pickleball PE Rollup - Front Office Sports](https://frontofficesports.com/how-pickleball-became-one-massive-private-equity-rollup/)

---

## 13. Integration Opportunities

### Integrating WITH DUPR

#### Option 1: Become a DUPR Club
- Free to create
- Access to API partners
- Submit matches directly
- Best for: Physical facilities, organized play groups

#### Option 2: Partner Integration
- Contact DUPR business development
- Requires approval process
- Access to backend API
- Best for: Tournament/league software

#### Option 3: Use Existing Partners
- Leverage PickleballTournaments.com, etc.
- No direct DUPR integration needed
- Results flow through partner
- Best for: Quick launch without partnership

### Technical Requirements for Integration

1. All players need DUPR IDs
2. Match data format must comply with DUPR spec
3. Account manager relationship required
4. Likely approval/certification process

### Data Access Limitations

- No public API for player lookup
- No documented way to query ratings programmatically
- Would need to scrape or partner officially

---

## 14. Competitive Differentiation Opportunities

Based on this research, here are opportunities to differentiate from DUPR:

### 1. Verification-First Approach
**Gap:** DUPR's biggest weakness is lack of verification
**Opportunity:** Build verification into core system, not as premium add-on

### 2. Transparent Algorithm
**Gap:** DUPR algorithm is opaque
**Opportunity:** Open-source or fully documented rating calculation

### 3. Computer Vision Integration
**Gap:** DUPR relies on manual score entry
**Opportunity:** AI-powered automatic scoring from video

### 4. Better Sandbagging Prevention
**Gap:** Despite updates, sandbagging remains problematic
**Opportunity:** Require video verification, limit self-reporting

### 5. Public API
**Gap:** No public developer API
**Opportunity:** Open ecosystem with developer documentation

### 6. Multi-Rating System Support
**Gap:** DUPR is its own silo
**Opportunity:** Aggregate/convert between DUPR, UTR-P, etc.

### 7. Local/Club Focus
**Gap:** DUPR optimized for tournaments
**Opportunity:** Better recreational and club play features

### 8. Skill Development Tools
**Gap:** DUPR rates but doesn't help improve
**Opportunity:** Coaching, drills, video analysis integrated

### 9. Community Trust Features
**Gap:** Player verification is weak
**Opportunity:** Identity verification, reputation systems

### 10. Pricing Transparency
**Gap:** Partner integration costs unclear
**Opportunity:** Clear, affordable pricing for all

---

## Appendix: Key URLs & Resources

### Official DUPR Resources
- Main Site: https://www.dupr.com/
- Help Center: https://dupr.zendesk.com/hc/en-us
- Club Resources: https://www.dupr.com/club-resources
- Support Email: support@mydupr.com

### Integration Partners
- Pickleball.com
- PickleballTournaments.com
- PickleballBrackets.com
- CourtReserve: https://courtreserve.com/dupr-integration/
- Swish Sports: https://swishsportsapp.com/

### Competitor Resources
- UTR-P: https://usapickleball.org/tournament-player-ratings/
- Pickleheads: https://www.pickleheads.com/
- PicklePlay: https://apps.apple.com/us/app/pickleplay-play-pickleball/

### Technical References
- Backend Swagger (Partner Only): backend.mydupr.com/swagger-ui/index.html

---

*Report compiled: January 2026*
*Research sources: DUPR official documentation, industry publications, community discussions*
