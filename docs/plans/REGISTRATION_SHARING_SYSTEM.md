# Registration & Sharing System - Master Plan

## Overview

This document outlines the comprehensive plan for implementing event registration and social sharing features for PaddleUp.

**Created:** January 31, 2026
**Status:** In Progress

---

## Current State Summary

| Area | Backend | Frontend | Gap |
|------|---------|----------|-----|
| League Join | ✅ Full (partner, ratings) | ❌ Just a button | Need modal |
| Tournament Register | ✅ Full | ✅ Good | Minor fixes |
| DUPR Integration | ✅ Schema + routes exist | ⚠️ Settings page only | Need verification UI |
| Profile Validation | ✅ Backend validates | ❌ No frontend checks | Need gate |
| Social Sharing | ❌ None | ⚠️ Basic clipboard | Need deep links, OG |
| Partner Marketplace | ❌ None | ❌ None | Critical need |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHAREABLE EVENT DISCOVERY                     │
├─────────────────────────────────────────────────────────────────┤
│  /t/summer-slam-2024  (public, SEO, OG images, QR codes)        │
│  /l/monday-doubles    (public, shareable)                       │
│  ?ref=abc123&utm_source=facebook (tracking)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Profile Gate (required: name, email, DOB, rating)           │
│  2. Rating Verification (DUPR > Internal > Self-reported)       │
│  3. Event Selection (singles/doubles, skill bracket)            │
│  4. Partner Selection (search users OR invite by email)         │
│  5. Waiver Acceptance (click-wrap)                              │
│  6. Payment (Stripe) → Confirmation                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRATION STATES                           │
├─────────────────────────────────────────────────────────────────┤
│  pending_partner → (7 day timeout) → waitlisted                 │
│  pending_payment → (partner pays) → confirmed                   │
│  confirmed (both registered + paid)                             │
│  waitlisted (event full, auto-notify when spot opens)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Critical Path)

#### 1.1 League Registration Modal
- Copy tournament registration pattern
- Partner search within registered users
- Team name input
- Rating eligibility check before submission

**Files to create/modify:**
- `apps/web/components/leagues/LeagueRegistrationModal.tsx`
- `apps/web/app/(dashboard)/leagues/[id]/page.tsx`

#### 1.2 Public Event Pages
```
/t/[slug] → Public tournament landing
/l/[slug] → Public league landing
```
- Unauthenticated users can view
- Dynamic OG metadata for social previews
- "Sign up to Register" CTA

**Files to create:**
- `apps/web/app/(public)/t/[slug]/page.tsx`
- `apps/web/app/(public)/l/[slug]/page.tsx`
- Update `apps/web/middleware.ts`

#### 1.3 Profile Completion Gate
- Block registration if missing: name, email, DOB, gender, rating
- Show profile completion % with prompts
- Direct link to complete profile

**Files to create:**
- `apps/web/components/registration/ProfileCompletionGate.tsx`
- `apps/web/hooks/use-profile-completion.ts`

#### 1.4 Rating Display & Verification
```tsx
<RatingBadge
  rating={3.75}
  source="dupr"       // 'dupr' | 'internal' | 'self_reported'
  reliability={0.72}  // 0-1, show as %
  verified={true}
/>
```

**Files to create:**
- `apps/web/components/ratings/RatingBadge.tsx`
- `apps/web/components/ratings/RatingVerification.tsx`

---

### Phase 2: Partner & Waitlist

#### 2.1 Partner Marketplace
- "Players Needing Partners" directory per event
- Filter by skill level, location
- "Looking for partner" toggle on registration

**Files to create:**
- `apps/web/components/partners/PartnerMarketplace.tsx`
- `apps/web/components/partners/PartnerListingCard.tsx`
- `apps/api/src/routes/partners.ts`

#### 2.2 Partner Invitation Flow
```
1. Player A registers → enters partner email
2. System sends invite email with link
3. Partner has 7 days to register
4. After 7 days → auto-move to waitlist
```

**Files to create:**
- `apps/web/components/partners/PartnerInviteModal.tsx`
- `apps/web/app/(public)/invite/[code]/page.tsx`
- `apps/api/src/routes/invites.ts`

#### 2.3 Waitlist System
- Zero-dollar checkout for waitlisted
- Position transparency
- Auto-notify when spot opens (24hr to accept)

**Files to create:**
- `apps/web/components/registration/WaitlistStatus.tsx`
- `apps/api/src/services/waitlistService.ts`

#### 2.4 Registration States
```typescript
type RegistrationStatus =
  | 'pending_partner'  // waiting for partner
  | 'pending_payment'  // both registered, needs payment
  | 'confirmed'        // fully registered
  | 'waitlisted'       // event full
  | 'withdrawn';
```

---

### Phase 3: Sharing & Virality

#### 3.1 Deep Linking
```
/t/summer-slam?ref=user123&utm_source=facebook
/l/monday-doubles/join?invite=abc123
```

#### 3.2 Dynamic OG Images
- API route: `/api/og/tournament/[slug]`
- Event name, date, location, spots remaining
- PaddleUp branding

**Files to create:**
- `apps/web/app/api/og/tournament/[slug]/route.tsx`
- `apps/web/app/api/og/league/[slug]/route.tsx`

#### 3.3 Share Components
- Facebook, Twitter/X, WhatsApp, LinkedIn, Email
- Copy link with toast
- QR code generation + download

**Files to create:**
- `apps/web/components/sharing/ShareButtons.tsx`
- `apps/web/components/sharing/QRCodeGenerator.tsx`
- `apps/web/lib/sharing.ts`

#### 3.4 Referral System
- Unique referral codes per user
- Track conversions
- Reward milestones ($5 credit for first referral)

**Files to create:**
- `apps/web/components/referrals/ReferralDashboard.tsx`
- `apps/api/src/routes/referrals.ts`

---

### Phase 4: DUPR Ready

#### 4.1 Mock DUPR Service
```typescript
interface DuprService {
  getPlayer(duprId: string): Promise<DuprPlayer>;
  verifyRating(duprId: string): Promise<Verification>;
}
```

#### 4.2 Rating Fallback Chain
```
DUPR Verified (60%+ reliability)
  → DUPR Linked (lower reliability)
    → Internal Rating
      → Self-Reported
```

#### 4.3 Tournament Settings
- `requiresDupr: boolean`
- `minReliability: number`
- `acceptSelfReported: boolean`

**Files to create:**
- `apps/api/src/services/duprService.ts`
- `apps/api/src/services/ratingService.ts`

---

## Database Schema Additions

```sql
-- Team invitations for doubles
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  event_id UUID,
  inviter_id UUID NOT NULL REFERENCES users(id),
  invitee_email VARCHAR(255),
  invitee_user_id UUID REFERENCES users(id),
  invite_code VARCHAR(50) UNIQUE NOT NULL,
  team_name VARCHAR(100),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending/accepted/declined/expired
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral tracking
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  event_type VARCHAR(50), -- tournament/league/general
  event_id UUID,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
  referred_user_id UUID NOT NULL REFERENCES users(id),
  conversion_type VARCHAR(50) NOT NULL, -- signup/registration/purchase
  event_id UUID,
  reward_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partner marketplace listings
CREATE TABLE partner_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  event_id UUID,
  skill_level_min DECIMAL(4,2),
  skill_level_max DECIMAL(4,2),
  message TEXT,
  status VARCHAR(20) DEFAULT 'active', -- active/matched/expired
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_team_invites_inviter ON team_invites(inviter_id);
CREATE INDEX idx_team_invites_code ON team_invites(invite_code);
CREATE INDEX idx_team_invites_status ON team_invites(status);
CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_partner_listings_tournament ON partner_listings(tournament_id);
CREATE INDEX idx_partner_listings_league ON partner_listings(league_id);
CREATE INDEX idx_partner_listings_status ON partner_listings(status);
```

---

## Key UI Components

| Component | Purpose | Location |
|-----------|---------|----------|
| LeagueRegistrationModal | Partner selection, team name, rating check | `components/leagues/` |
| PublicEventPage | Unauthenticated landing with CTA | `app/(public)/` |
| ProfileCompletionGate | Block registration if incomplete | `components/registration/` |
| RatingBadge | Source, reliability, verified indicator | `components/ratings/` |
| PartnerMarketplace | "Looking for partner" listings | `components/partners/` |
| PartnerInviteModal | Search users or enter email | `components/partners/` |
| ShareButtons | Social platforms + QR + copy link | `components/sharing/` |
| WaitlistStatus | Position, expected wait, notifications | `components/registration/` |

---

## API Endpoints to Add

### Partners & Invites
- `GET /api/partners/listings` - Get partner marketplace listings
- `POST /api/partners/listings` - Create a partner listing
- `DELETE /api/partners/listings/:id` - Remove listing
- `POST /api/invites` - Create team invite
- `GET /api/invites/:code` - Get invite details
- `POST /api/invites/:code/accept` - Accept invite
- `POST /api/invites/:code/decline` - Decline invite

### Referrals
- `GET /api/referrals/code` - Get user's referral code
- `GET /api/referrals/stats` - Get referral statistics
- `POST /api/referrals/track` - Track referral visit

### Ratings
- `GET /api/users/:id/effective-rating` - Get effective rating with fallback
- `POST /api/registrations/validate` - Validate registration eligibility

---

## Success Metrics

- Registration completion rate
- Partner match rate (marketplace)
- Social share click-through rate
- Referral conversion rate
- Time to complete registration
- Waitlist conversion rate

---

## References

- Competitor Research: Pickleplay, DUPR, Pickleball Tournaments
- Best Practices: Registration flows, waitlist management, waivers
- DUPR Integration: Rating system, reliability scores, API patterns
- Social Sharing: OG tags, deep links, UTM tracking
