/**
 * Database seed script for development
 *
 * Run with: npx tsx src/db/seed.ts
 *
 * This script populates the database with sample data for local development.
 * It creates users, venues, courts, clubs, games, tournaments, leagues,
 * achievements, and all related data.
 */

import { db, sql, closeDatabase } from './index.js';
import {
  users,
  userRatings,
  venues,
  courts,
  courtReviews,
  clubs,
  clubMemberships,
  clubEvents,
  games,
  gameParticipants,
  tournaments,
  tournamentDivisions,
  tournamentRegistrations,
  tournamentRegistrationPlayers,
  tournamentBrackets,
  leagues,
  leagueSeasons,
  leagueParticipants,
  leagueParticipantPlayers,
  userFriendships,
  achievements,
  userAchievements,
  notifications,
  activityFeedEvents,
  systemSettings,
} from './schema.js';

// Helper to generate random items from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Sample data generators
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
];

const cities = [
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.074 },
  { city: 'Scottsdale', state: 'AZ', lat: 33.4942, lng: -111.9261 },
  { city: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797 },
  { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { city: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572 },
  { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
];

const venueNames = [
  'Recreation Center', 'Community Park', 'Sports Complex', 'Athletic Club',
  'Town Center Courts', 'Fitness Center', 'Country Club', 'Municipal Courts',
];

const clubNames = [
  'Paddle Masters', 'Dink Dynasty', 'Net Ninjas', 'Kitchen Kings',
  'Serve & Volley', 'Third Shot Drop', 'Pickleball Pros', 'Court Crushers',
];

const skillLevels = ['beginner', 'intermediate', 'advanced', 'pro'] as const;
const gameFormats = ['singles', 'doubles', 'mixed_doubles'] as const;
const surfaces = ['concrete', 'asphalt', 'sport_court', 'wood', 'indoor', 'turf'] as const;
const venueTypes = ['public', 'private', 'club', 'recreation_center', 'school', 'gym'] as const;

async function seed() {
  console.log('Starting database seed...');

  try {
    // Clear existing data (in reverse dependency order)
    console.log('Clearing existing data...');
    await db.delete(activityFeedEvents);
    await db.delete(notifications);
    await db.delete(userAchievements);
    await db.delete(achievements);
    await db.delete(userFriendships);
    await db.delete(leagueParticipantPlayers);
    await db.delete(leagueParticipants);
    await db.delete(leagueSeasons);
    await db.delete(leagues);
    await db.delete(tournamentRegistrationPlayers);
    await db.delete(tournamentRegistrations);
    await db.delete(tournamentBrackets);
    await db.delete(tournamentDivisions);
    await db.delete(tournaments);
    await db.delete(gameParticipants);
    await db.delete(games);
    await db.delete(clubEvents);
    await db.delete(clubMemberships);
    await db.delete(clubs);
    await db.delete(courtReviews);
    await db.delete(courts);
    await db.delete(venues);
    await db.delete(userRatings);
    await db.delete(users);
    await db.delete(systemSettings);

    // Create users
    console.log('Creating users...');
    const createdUsers = await db
      .insert(users)
      .values(
        Array.from({ length: 50 }, (_, i) => {
          const location = randomItem(cities);
          const firstName = randomItem(firstNames);
          const lastName = randomItem(lastNames);
          const skillLevel = randomItem(skillLevels);

          return {
            email: `user${i + 1}@example.com`,
            username: `player${i + 1}`,
            passwordHash: '$2b$10$K7L1OJ45/4YqGJ8dIqLFqOuDH.vGRH.kgT6h6O3h3e3e3e3e3e3e3', // hashed "password123"
            firstName,
            lastName,
            displayName: `${firstName} ${lastName.charAt(0)}.`,
            bio: `Passionate pickleball player from ${location.city}. Love ${randomItem(['competitive', 'recreational', 'social'])} play!`,
            city: location.city,
            state: location.state,
            country: 'USA',
            latitude: (location.lat + (Math.random() - 0.5) * 0.1).toFixed(7),
            longitude: (location.lng + (Math.random() - 0.5) * 0.1).toFixed(7),
            skillLevel,
            playStyle: randomItem(['aggressive', 'defensive', 'balanced', 'finesse']),
            dominantHand: randomItem(['left', 'right', 'ambidextrous']),
            yearsPlaying: Math.floor(Math.random() * 10) + 1,
            preferredPlayTimes: ['morning', 'afternoon', 'evening'].filter(() => Math.random() > 0.5),
            preferredGameTypes: gameFormats.filter(() => Math.random() > 0.3),
            willingToTravelMiles: Math.floor(Math.random() * 50) + 5,
            emailVerified: true,
            isActive: true,
          };
        })
      )
      .returning();

    // Create user ratings
    console.log('Creating user ratings...');
    for (const user of createdUsers) {
      for (const format of gameFormats) {
        // Generate a random rating between 2.5 and 5.5
        const baseRating = 2.5 + Math.random() * 3;

        await db.insert(userRatings).values({
          userId: user.id,
          ratingType: 'internal',
          gameFormat: format,
          rating: baseRating.toFixed(2),
          reliabilityScore: (0.5 + Math.random() * 0.5).toFixed(2),
          gamesPlayed: Math.floor(Math.random() * 100) + 10,
          wins: Math.floor(Math.random() * 50) + 5,
          losses: Math.floor(Math.random() * 50) + 5,
        });
      }
    }

    // Create venues
    console.log('Creating venues...');
    const createdVenues = await db
      .insert(venues)
      .values(
        cities.flatMap((location, cityIndex) =>
          Array.from({ length: 3 }, (_, venueIndex) => {
            const venueName = `${location.city} ${randomItem(venueNames)}`;
            return {
              name: venueName,
              slug: venueName.toLowerCase().replace(/\s+/g, '-'),
              description: `Premier pickleball facility in ${location.city} with multiple courts and great amenities.`,
              venueType: randomItem(venueTypes),
              streetAddress: `${100 + cityIndex * 10 + venueIndex} Main Street`,
              city: location.city,
              state: location.state,
              country: 'USA',
              zipCode: `${85000 + cityIndex * 100 + venueIndex}`,
              latitude: (location.lat + (Math.random() - 0.5) * 0.05).toFixed(7),
              longitude: (location.lng + (Math.random() - 0.5) * 0.05).toFixed(7),
              amenities: ['restrooms', 'water_fountain', 'parking', 'lights'].filter(
                () => Math.random() > 0.3
              ),
              operatingHours: {
                monday: { open: '06:00', close: '22:00' },
                tuesday: { open: '06:00', close: '22:00' },
                wednesday: { open: '06:00', close: '22:00' },
                thursday: { open: '06:00', close: '22:00' },
                friday: { open: '06:00', close: '22:00' },
                saturday: { open: '07:00', close: '20:00' },
                sunday: { open: '08:00', close: '18:00' },
              },
              averageRating: (3.5 + Math.random() * 1.5).toFixed(1),
              totalReviews: Math.floor(Math.random() * 50) + 5,
              ownerId: randomItem(createdUsers).id,
              isVerified: Math.random() > 0.3,
              isActive: true,
            };
          })
        )
      )
      .returning();

    // Create courts for each venue
    console.log('Creating courts...');
    const createdCourts: Array<{ id: string; venueId: string }> = [];
    for (const venue of createdVenues) {
      const numCourts = Math.floor(Math.random() * 6) + 4; // 4-10 courts per venue
      const venueCourts = await db
        .insert(courts)
        .values(
          Array.from({ length: numCourts }, (_, i) => ({
            venueId: venue.id,
            name: `Court ${i + 1}`,
            courtNumber: i + 1,
            surface: randomItem(surfaces),
            isIndoor: Math.random() > 0.7,
            hasLights: Math.random() > 0.3,
            isCovered: Math.random() > 0.8,
            isReservable: true,
            requiresMembership: Math.random() > 0.7,
            hourlyRate: Math.random() > 0.5 ? (10 + Math.random() * 20).toFixed(2) : null,
            isActive: true,
          }))
        )
        .returning();
      createdCourts.push(...venueCourts);
    }

    // Create court reviews
    console.log('Creating court reviews...');
    for (const venue of createdVenues.slice(0, 10)) {
      const reviewers = createdUsers.slice(0, Math.floor(Math.random() * 10) + 3);
      for (const reviewer of reviewers) {
        await db.insert(courtReviews).values({
          venueId: venue.id,
          userId: reviewer.id,
          rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
          title: randomItem([
            'Great facility!',
            'Nice courts',
            'Could be better',
            'Excellent experience',
            'Highly recommend',
          ]),
          content: 'Courts are well maintained and the atmosphere is friendly.',
          surfaceQuality: Math.floor(Math.random() * 3) + 3,
          netQuality: Math.floor(Math.random() * 3) + 3,
          lightingQuality: Math.floor(Math.random() * 3) + 3,
          cleanliness: Math.floor(Math.random() * 3) + 3,
          isApproved: true,
        });
      }
    }

    // Create clubs
    console.log('Creating clubs...');
    const createdClubs = await db
      .insert(clubs)
      .values(
        cities.slice(0, 8).map((location, i) => ({
          name: `${location.city} ${clubNames[i]}`,
          slug: `${location.city.toLowerCase()}-${clubNames[i].toLowerCase().replace(/\s+/g, '-')}`,
          description: `A vibrant pickleball community in ${location.city}. Join us for competitive and recreational play!`,
          city: location.city,
          state: location.state,
          country: 'USA',
          latitude: location.lat.toFixed(7),
          longitude: location.lng.toFixed(7),
          homeVenueId: createdVenues[i * 3].id, // First venue in each city
          isPublic: Math.random() > 0.3,
          requiresApproval: Math.random() > 0.5,
          maxMembers: Math.floor(Math.random() * 100) + 50,
          memberCount: 0,
          activeMemberCount: 0,
          createdBy: createdUsers[i].id,
          isActive: true,
        }))
      )
      .returning();

    // Create club memberships
    console.log('Creating club memberships...');
    for (const club of createdClubs) {
      const memberCount = Math.floor(Math.random() * 20) + 10;
      const members = createdUsers.slice(0, memberCount);

      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        await db.insert(clubMemberships).values({
          clubId: club.id,
          userId: member.id,
          role: i === 0 ? 'owner' : i < 3 ? 'admin' : 'member',
          status: 'active',
          joinedAt: randomDate(new Date(2023, 0, 1), new Date()),
          gamesPlayed: Math.floor(Math.random() * 50),
          eventsAttended: Math.floor(Math.random() * 20),
        });
      }
    }

    // Create club events
    console.log('Creating club events...');
    for (const club of createdClubs) {
      const numEvents = Math.floor(Math.random() * 5) + 2;
      for (let i = 0; i < numEvents; i++) {
        const startsAt = randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
        await db.insert(clubEvents).values({
          clubId: club.id,
          title: randomItem([
            'Weekly Open Play',
            'Beginner Clinic',
            'Advanced Practice',
            'Social Night',
            'Tournament Prep',
          ]),
          description: 'Join us for a fun evening of pickleball!',
          eventType: randomItem(['open_play', 'clinic', 'social', 'practice']),
          venueId: createdVenues.find((v) => v.id === club.homeVenueId)?.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000), // 2 hours
          maxParticipants: Math.floor(Math.random() * 20) + 8,
          currentParticipants: Math.floor(Math.random() * 10),
          waitlistEnabled: true,
          membersOnly: Math.random() > 0.5,
          createdBy: createdUsers[0].id,
        });
      }
    }

    // Create games
    console.log('Creating games...');
    const createdGames: Array<{ id: string }> = [];
    for (let i = 0; i < 100; i++) {
      const gameFormat = randomItem(gameFormats);
      const scheduledAt = randomDate(new Date(2024, 0, 1), new Date());
      const isCompleted = scheduledAt < new Date();

      const game = await db
        .insert(games)
        .values({
          gameType: randomItem(['casual', 'competitive']),
          gameFormat,
          status: isCompleted ? 'completed' : 'scheduled',
          venueId: randomItem(createdVenues).id,
          courtId: randomItem(createdCourts).id,
          scheduledAt,
          startedAt: isCompleted ? scheduledAt : null,
          completedAt: isCompleted
            ? new Date(scheduledAt.getTime() + 45 * 60 * 1000)
            : null,
          durationMinutes: isCompleted ? Math.floor(Math.random() * 30) + 30 : null,
          winningTeam: isCompleted ? (Math.random() > 0.5 ? 1 : 2) : null,
          scores: isCompleted
            ? [
                { team1: 11, team2: Math.floor(Math.random() * 10) },
                { team1: Math.floor(Math.random() * 10), team2: 11 },
                { team1: 11, team2: Math.floor(Math.random() * 10) },
              ].slice(0, Math.random() > 0.5 ? 2 : 3)
            : [],
          pointsToWin: 11,
          winBy: 2,
          bestOf: 3,
          isRated: true,
          ratingProcessed: isCompleted,
          createdBy: randomItem(createdUsers).id,
        })
        .returning();

      createdGames.push(...game);

      // Add participants
      const playersPerTeam = gameFormat === 'singles' ? 1 : 2;
      const selectedPlayers = createdUsers
        .sort(() => Math.random() - 0.5)
        .slice(0, playersPerTeam * 2);

      for (let j = 0; j < selectedPlayers.length; j++) {
        await db.insert(gameParticipants).values({
          gameId: game[0].id,
          userId: selectedPlayers[j].id,
          team: j < playersPerTeam ? 1 : 2,
          position: gameFormat !== 'singles' ? (j % 2 === 0 ? 'left' : 'right') : null,
          ratingAtGame: (3.0 + Math.random() * 2).toFixed(2),
          ratingChange: isCompleted ? ((Math.random() - 0.5) * 0.2).toFixed(2) : null,
          isConfirmed: true,
          confirmedAt: new Date(),
        });
      }
    }

    // Create tournaments
    console.log('Creating tournaments...');
    const createdTournaments = await db
      .insert(tournaments)
      .values(
        [
          {
            name: 'Phoenix Open Championship',
            description: 'Annual championship tournament featuring top players from Arizona.',
            tournamentFormat: 'double_elimination' as const,
            gameFormat: 'doubles' as const,
          },
          {
            name: 'SoCal Summer Showdown',
            description: 'The biggest pickleball event in Southern California.',
            tournamentFormat: 'round_robin' as const,
            gameFormat: 'mixed_doubles' as const,
          },
          {
            name: 'Texas State Championship',
            description: 'State-level competition for Texas players.',
            tournamentFormat: 'single_elimination' as const,
            gameFormat: 'singles' as const,
          },
          {
            name: 'Florida Sunshine Classic',
            description: 'Premier tournament on the East Coast.',
            tournamentFormat: 'pool_play' as const,
            gameFormat: 'doubles' as const,
          },
        ].map((t, i) => ({
          ...t,
          slug: t.name.toLowerCase().replace(/\s+/g, '-'),
          organizerId: createdUsers[i].id,
          clubId: createdClubs[i % createdClubs.length].id,
          venueId: createdVenues[i * 3].id,
          startsAt: randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
          endsAt: randomDate(
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            new Date(Date.now() + 100 * 24 * 60 * 60 * 1000)
          ),
          registrationOpensAt: new Date(),
          registrationClosesAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          maxParticipants: 64,
          currentParticipants: Math.floor(Math.random() * 30) + 10,
          waitlistEnabled: true,
          pointsToWin: 11,
          winBy: 2,
          bestOf: 3,
          isRated: true,
          minRating: '2.50',
          maxRating: '5.50',
          status: 'registration_open' as const,
        }))
      )
      .returning();

    // Create tournament divisions
    console.log('Creating tournament divisions...');
    for (const tournament of createdTournaments) {
      await db.insert(tournamentDivisions).values([
        {
          tournamentId: tournament.id,
          name: '3.0-3.5',
          gameFormat: tournament.gameFormat,
          minRating: '3.00',
          maxRating: '3.50',
          maxTeams: 16,
          sortOrder: 1,
        },
        {
          tournamentId: tournament.id,
          name: '4.0-4.5',
          gameFormat: tournament.gameFormat,
          minRating: '4.00',
          maxRating: '4.50',
          maxTeams: 16,
          sortOrder: 2,
        },
        {
          tournamentId: tournament.id,
          name: '5.0+',
          gameFormat: tournament.gameFormat,
          minRating: '5.00',
          maxRating: '5.50',
          maxTeams: 16,
          sortOrder: 3,
        },
      ]);
    }

    // Create leagues
    console.log('Creating leagues...');
    const createdLeagues = await db
      .insert(leagues)
      .values(
        [
          { name: 'Phoenix Premier League', city: 'Phoenix', state: 'AZ' },
          { name: 'San Diego Ladder League', city: 'San Diego', state: 'CA' },
          { name: 'Austin Round Robin', city: 'Austin', state: 'TX' },
          { name: 'Miami Mixed Doubles League', city: 'Miami', state: 'FL' },
        ].map((l, i) => ({
          name: l.name,
          slug: l.name.toLowerCase().replace(/\s+/g, '-'),
          description: `Competitive league play in ${l.city}. Join to test your skills!`,
          organizerId: createdUsers[i].id,
          clubId: createdClubs[i % createdClubs.length].id,
          venueId: createdVenues[i * 3].id,
          gameFormat: randomItem(gameFormats),
          isRated: true,
          minRating: '2.50',
          maxRating: '5.00',
          status: 'in_progress' as const,
        }))
      )
      .returning();

    // Create league seasons
    console.log('Creating league seasons...');
    for (const league of createdLeagues) {
      const season = await db
        .insert(leagueSeasons)
        .values({
          leagueId: league.id,
          name: 'Spring 2024',
          seasonNumber: 1,
          startsAt: new Date(2024, 2, 1), // March 1
          endsAt: new Date(2024, 5, 30), // June 30
          registrationOpensAt: new Date(2024, 1, 1),
          registrationClosesAt: new Date(2024, 2, 15),
          maxParticipants: 32,
          matchesPerWeek: 1,
          matchDay: 'saturday',
          defaultMatchTime: '10:00',
          pointsForWin: 3,
          pointsForDraw: 1,
          pointsForLoss: 0,
          status: 'in_progress' as const,
        })
        .returning();

      // Create league participants
      const participantCount = Math.floor(Math.random() * 12) + 8;
      for (let i = 0; i < participantCount; i++) {
        const participant = await db
          .insert(leagueParticipants)
          .values({
            seasonId: season[0].id,
            teamName:
              league.gameFormat === 'singles'
                ? null
                : `Team ${String.fromCharCode(65 + i)}`,
            matchesPlayed: Math.floor(Math.random() * 10),
            wins: Math.floor(Math.random() * 8),
            losses: Math.floor(Math.random() * 5),
            draws: Math.floor(Math.random() * 2),
            points: 0, // Will be calculated
            rank: i + 1,
            status: 'active' as const,
          })
          .returning();

        // Add players to participant
        const playersPerTeam = league.gameFormat === 'singles' ? 1 : 2;
        const playerIndices = createdUsers
          .sort(() => Math.random() - 0.5)
          .slice(i * playersPerTeam, (i + 1) * playersPerTeam);

        for (let j = 0; j < playerIndices.length; j++) {
          await db.insert(leagueParticipantPlayers).values({
            participantId: participant[0].id,
            userId: playerIndices[j].id,
            isCaptain: j === 0,
            ratingAtRegistration: (3.0 + Math.random() * 2).toFixed(2),
          });
        }
      }
    }

    // Create friendships
    console.log('Creating friendships...');
    for (let i = 0; i < createdUsers.length; i++) {
      const numFriends = Math.floor(Math.random() * 10) + 3;
      const friendIndices = new Set<number>();

      while (friendIndices.size < numFriends) {
        const friendIndex = Math.floor(Math.random() * createdUsers.length);
        if (friendIndex !== i) {
          friendIndices.add(friendIndex);
        }
      }

      for (const friendIndex of friendIndices) {
        // Only create if not already exists (check both directions)
        if (i < friendIndex) {
          await db.insert(userFriendships).values({
            requesterId: createdUsers[i].id,
            addresseeId: createdUsers[friendIndex].id,
            status: Math.random() > 0.2 ? 'accepted' : 'pending',
            respondedAt: Math.random() > 0.2 ? new Date() : null,
          });
        }
      }
    }

    // Create achievements
    console.log('Creating achievements...');
    const createdAchievements = await db
      .insert(achievements)
      .values([
        {
          code: 'first_game',
          name: 'First Match',
          description: 'Complete your first pickleball game',
          category: 'games',
          tier: 'bronze',
          requirements: { type: 'games_played', count: 1 },
          points: 10,
          isActive: true,
        },
        {
          code: 'games_10',
          name: 'Getting Started',
          description: 'Play 10 games',
          category: 'games',
          tier: 'bronze',
          requirements: { type: 'games_played', count: 10 },
          points: 25,
          isActive: true,
        },
        {
          code: 'games_50',
          name: 'Regular Player',
          description: 'Play 50 games',
          category: 'games',
          tier: 'silver',
          requirements: { type: 'games_played', count: 50 },
          points: 50,
          isActive: true,
        },
        {
          code: 'games_100',
          name: 'Centurion',
          description: 'Play 100 games',
          category: 'games',
          tier: 'gold',
          requirements: { type: 'games_played', count: 100 },
          points: 100,
          isActive: true,
        },
        {
          code: 'win_streak_5',
          name: 'Hot Streak',
          description: 'Win 5 games in a row',
          category: 'skill',
          tier: 'silver',
          requirements: { type: 'win_streak', count: 5 },
          points: 75,
          isActive: true,
        },
        {
          code: 'rating_3_5',
          name: 'Rising Star',
          description: 'Reach a 3.5 rating',
          category: 'skill',
          tier: 'bronze',
          requirements: { type: 'rating_reached', rating: 3.5 },
          points: 50,
          isActive: true,
        },
        {
          code: 'rating_4_0',
          name: 'Skilled Player',
          description: 'Reach a 4.0 rating',
          category: 'skill',
          tier: 'silver',
          requirements: { type: 'rating_reached', rating: 4.0 },
          points: 100,
          isActive: true,
        },
        {
          code: 'rating_4_5',
          name: 'Expert',
          description: 'Reach a 4.5 rating',
          category: 'skill',
          tier: 'gold',
          requirements: { type: 'rating_reached', rating: 4.5 },
          points: 200,
          isActive: true,
        },
        {
          code: 'rating_5_0',
          name: 'Master',
          description: 'Reach a 5.0 rating',
          category: 'skill',
          tier: 'platinum',
          requirements: { type: 'rating_reached', rating: 5.0 },
          points: 500,
          isActive: true,
        },
        {
          code: 'club_member',
          name: 'Club Member',
          description: 'Join a pickleball club',
          category: 'social',
          tier: 'bronze',
          requirements: { type: 'club_joined', count: 1 },
          points: 25,
          isActive: true,
        },
        {
          code: 'tournament_entry',
          name: 'Competitor',
          description: 'Enter your first tournament',
          category: 'tournament',
          tier: 'bronze',
          requirements: { type: 'tournament_entered', count: 1 },
          points: 50,
          isActive: true,
        },
        {
          code: 'tournament_win',
          name: 'Champion',
          description: 'Win a tournament',
          category: 'tournament',
          tier: 'gold',
          requirements: { type: 'tournament_won', count: 1 },
          points: 200,
          isActive: true,
        },
      ])
      .returning();

    // Assign achievements to users
    console.log('Assigning user achievements...');
    for (const user of createdUsers) {
      // Give everyone the first game achievement
      await db.insert(userAchievements).values({
        userId: user.id,
        achievementId: createdAchievements[0].id, // first_game
        sourceType: 'game',
      });

      // Randomly assign other achievements
      const numAchievements = Math.floor(Math.random() * 5) + 1;
      const shuffledAchievements = createdAchievements
        .slice(1)
        .sort(() => Math.random() - 0.5)
        .slice(0, numAchievements);

      for (const achievement of shuffledAchievements) {
        await db.insert(userAchievements).values({
          userId: user.id,
          achievementId: achievement.id,
        });
      }
    }

    // Create notifications
    console.log('Creating notifications...');
    for (const user of createdUsers.slice(0, 20)) {
      const numNotifications = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < numNotifications; i++) {
        await db.insert(notifications).values({
          userId: user.id,
          type: randomItem([
            'game_invite',
            'game_reminder',
            'friend_request',
            'achievement_earned',
            'system',
          ]),
          title: randomItem([
            'New game invitation',
            'Upcoming match reminder',
            'New friend request',
            'Achievement unlocked!',
            'Welcome to PicklePlay',
          ]),
          message: 'Click to view details and take action.',
          isRead: Math.random() > 0.5,
          readAt: Math.random() > 0.5 ? new Date() : null,
          emailSent: Math.random() > 0.3,
          pushSent: Math.random() > 0.3,
        });
      }
    }

    // Create activity feed events
    console.log('Creating activity feed events...');
    for (const user of createdUsers.slice(0, 30)) {
      const numEvents = Math.floor(Math.random() * 10) + 3;
      for (let i = 0; i < numEvents; i++) {
        await db.insert(activityFeedEvents).values({
          userId: user.id,
          eventType: randomItem([
            'game_completed',
            'achievement_earned',
            'rating_changed',
            'club_joined',
            'friend_added',
          ]),
          eventData: {
            description: 'User activity recorded',
            timestamp: new Date().toISOString(),
          },
          isPublic: Math.random() > 0.2,
          createdAt: randomDate(new Date(2024, 0, 1), new Date()),
        });
      }
    }

    // Create system settings
    console.log('Creating system settings...');
    await db.insert(systemSettings).values([
      {
        key: 'app_name',
        value: 'PicklePlay',
        description: 'Application name displayed throughout the app',
      },
      {
        key: 'default_rating',
        value: { singles: 3.0, doubles: 3.0, mixed_doubles: 3.0 },
        description: 'Default rating for new users by game format',
      },
      {
        key: 'rating_system',
        value: { k_factor: 32, min_games: 10, reliability_threshold: 0.8 },
        description: 'Rating calculation parameters',
      },
      {
        key: 'maintenance_mode',
        value: false,
        description: 'Enable maintenance mode to restrict access',
      },
      {
        key: 'feature_flags',
        value: {
          tournaments: true,
          leagues: true,
          clubs: true,
          matchmaking: true,
          achievements: true,
        },
        description: 'Feature flag toggles',
      },
    ]);

    console.log('Seed completed successfully!');
    console.log(`Created:`);
    console.log(`  - ${createdUsers.length} users`);
    console.log(`  - ${createdVenues.length} venues`);
    console.log(`  - ${createdCourts.length} courts`);
    console.log(`  - ${createdClubs.length} clubs`);
    console.log(`  - ${createdGames.length} games`);
    console.log(`  - ${createdTournaments.length} tournaments`);
    console.log(`  - ${createdLeagues.length} leagues`);
    console.log(`  - ${createdAchievements.length} achievements`);
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Run seed
seed().catch(console.error);
