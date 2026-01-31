import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Default image size for OG images
const size = {
  width: 1200,
  height: 630,
};

// Fetch tournament data
async function getTournament(slug: string) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  try {
    // Try to fetch by slug first
    const response = await fetch(`${API_BASE_URL}/tournaments/by-slug/${slug}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      // Fallback to ID lookup
      const idResponse = await fetch(`${API_BASE_URL}/tournaments/${slug}`, {
        next: { revalidate: 300 },
      });

      if (!idResponse.ok) {
        return null;
      }

      const data = await idResponse.json();
      return data.tournament;
    }

    const data = await response.json();
    return data.tournament;
  } catch (error) {
    console.error('Error fetching tournament for OG image:', error);
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const tournament = await getTournament(slug);

    // If no tournament found, return a default image
    if (!tournament) {
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 48,
              background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 50%, #065F73 100%)',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
            }}
          >
            <span
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: 'white',
              }}
            >
              Tournament Not Found
            </span>
          </div>
        ),
        size
      );
    }

    // Format dates
    const startDate = new Date(tournament.startsAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endDate = new Date(tournament.endsAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // Location text
    const location = tournament.venue
      ? `${tournament.venue.name}${tournament.venue.city ? `, ${tournament.venue.city}` : ''}`
      : tournament.locationNotes || 'Location TBD';

    // Spots info
    const spotsRemaining = tournament.maxParticipants - tournament.currentParticipants;
    const spotsText = spotsRemaining > 0
      ? `${spotsRemaining} spots remaining`
      : 'Registration Full';

    // Status badge color
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'registration_open':
          return '#22C55E'; // green
        case 'in_progress':
          return '#3B82F6'; // blue
        case 'completed':
          return '#8B5CF6'; // purple
        case 'cancelled':
          return '#EF4444'; // red
        default:
          return '#6B7280'; // gray
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'registration_open':
          return 'Registration Open';
        case 'registration_closed':
          return 'Registration Closed';
        case 'in_progress':
          return 'In Progress';
        case 'completed':
          return 'Completed';
        case 'cancelled':
          return 'Cancelled';
        default:
          return 'Coming Soon';
      }
    };

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 50%, #065F73 100%)',
            padding: '50px',
          }}
        >
          {/* Top Section - Logo and Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '30px',
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="10" y="6" width="20" height="26" rx="8" fill="white" />
                <rect x="17" y="30" width="6" height="12" rx="2" fill="white" />
                <circle cx="36" cy="12" r="8" fill="#F97316" />
              </svg>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                PaddleUp
              </span>
            </div>

            {/* Status Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: getStatusColor(tournament.status),
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                {getStatusLabel(tournament.status)}
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Tournament Name */}
            <h1
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: 'white',
                lineHeight: 1.1,
                marginBottom: '20px',
                maxWidth: '900px',
              }}
            >
              {tournament.name}
            </h1>

            {/* Details Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '40px',
                marginBottom: '30px',
              }}
            >
              {/* Date */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span
                  style={{
                    fontSize: 24,
                    color: 'rgba(255,255,255,0.9)',
                  }}
                >
                  {startDate} - {endDate}
                </span>
              </div>

              {/* Location */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span
                  style={{
                    fontSize: 24,
                    color: 'rgba(255,255,255,0.9)',
                  }}
                >
                  {location}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Section - Registration Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 30px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Registration
              </span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {tournament.currentParticipants} / {tournament.maxParticipants} players
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: spotsRemaining > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                borderRadius: '30px',
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: spotsRemaining > 0 && spotsRemaining <= 10 ? '#FDE047' : 'white',
                }}
              >
                {spotsText}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  } catch (error) {
    console.error('Error generating tournament OG image:', error);

    // Return fallback image on error
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 50%, #065F73 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: 'white', fontWeight: 700 }}>PaddleUp Tournament</span>
        </div>
      ),
      size
    );
  }
}
