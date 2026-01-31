import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Default image size for OG images
const size = {
  width: 1200,
  height: 630,
};

// Fetch league data
async function getLeague(slug: string) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  try {
    // Try to fetch by slug first
    const response = await fetch(`${API_BASE_URL}/leagues/by-slug/${slug}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      // Fallback to ID lookup
      const idResponse = await fetch(`${API_BASE_URL}/leagues/${slug}`, {
        next: { revalidate: 300 },
      });

      if (!idResponse.ok) {
        return null;
      }

      const data = await idResponse.json();
      return data.league;
    }

    const data = await response.json();
    return data.league;
  } catch (error) {
    console.error('Error fetching league for OG image:', error);
    return null;
  }
}

// Format league type for display
function formatLeagueType(type: string): string {
  const typeLabels: Record<string, string> = {
    ladder: 'Ladder League',
    doubles: 'Doubles League',
    king_of_court: 'King of the Court',
    pool_play: 'Pool Play',
    hybrid: 'Hybrid League',
    round_robin: 'Round Robin',
    mixed_doubles: 'Mixed Doubles',
    singles: 'Singles League',
  };
  return typeLabels[type] || 'League';
}

// Get skill level display
function formatSkillLevel(min: number | null, max: number | null): string {
  if (min && max) {
    return `${min.toFixed(1)} - ${max.toFixed(1)}`;
  }
  if (min) {
    return `${min.toFixed(1)}+`;
  }
  return 'All Levels';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const league = await getLeague(slug);

    // If no league found, return a default image
    if (!league) {
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 48,
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)',
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
              League Not Found
            </span>
          </div>
        ),
        size
      );
    }

    // Format dates
    const startDate = new Date(league.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endDate = new Date(league.endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // Location text
    const location = league.venue
      ? `${league.venue.name}${league.venue.city ? `, ${league.venue.city}` : ''}`
      : 'Location TBD';

    // Spots info
    const spotsRemaining = league.maxTeams - league.currentTeams;
    const entityName = league.leagueType === 'singles' || league.leagueType === 'ladder' ? 'players' : 'teams';

    // Status badge color
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'registration':
        case 'registration_open':
          return '#22C55E'; // green
        case 'active':
        case 'in_progress':
          return '#3B82F6'; // blue
        case 'playoffs':
          return '#F97316'; // orange
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
        case 'registration':
        case 'registration_open':
          return 'Registration Open';
        case 'registration_closed':
          return 'Registration Closed';
        case 'active':
        case 'in_progress':
          return 'In Progress';
        case 'playoffs':
          return 'Playoffs';
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
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)',
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
                backgroundColor: getStatusColor(league.status),
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                {getStatusLabel(league.status)}
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
            {/* League Type Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.8)',
                  padding: '6px 14px',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                }}
              >
                {formatLeagueType(league.leagueType)}
              </span>

              {league.isDuprRated && (
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#FDE047',
                    padding: '6px 14px',
                    backgroundColor: 'rgba(253,224,71,0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="#FDE047"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  DUPR Rated
                </span>
              )}
            </div>

            {/* League Name */}
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
              {league.name}
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
              {location !== 'Location TBD' && (
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
              )}

              {/* Skill Level */}
              {(league.skillLevelMin || league.skillLevelMax) && (
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
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  <span
                    style={{
                      fontSize: 24,
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    Skill: {formatSkillLevel(league.skillLevelMin, league.skillLevelMax)}
                  </span>
                </div>
              )}
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
                {league.totalWeeks} weeks | {league.hasPlayoffs ? 'Playoffs included' : 'Regular season only'}
              </span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {league.currentTeams} / {league.maxTeams} {entityName}
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
                  color: spotsRemaining > 0 && spotsRemaining <= 5 ? '#FDE047' : 'white',
                }}
              >
                {spotsRemaining > 0 ? `${spotsRemaining} spots left` : 'Full'}
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
    console.error('Error generating league OG image:', error);

    // Return fallback image on error
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: 'white', fontWeight: 700 }}>PaddleUp League</span>
        </div>
      ),
      size
    );
  }
}
