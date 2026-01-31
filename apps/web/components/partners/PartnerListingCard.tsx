'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useContactPartner } from '@/hooks/use-api';
import { toast } from '@/hooks/use-toast';

interface PartnerListingCardProps {
  listing: {
    id: string;
    user: {
      id: string;
      username: string;
      displayName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      avatarUrl?: string | null;
      city?: string | null;
      state?: string | null;
      skillLevel?: string | null;
      rating?: number | null;
      ratingSource?: string | null;
    };
    skillLevelMin?: number | null;
    skillLevelMax?: number | null;
    message?: string | null;
    createdAt: string;
  };
  onContact?: (listingId: string) => void;
  currentUserId?: string;
}

export function PartnerListingCard({ listing, onContact, currentUserId }: PartnerListingCardProps) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const contactPartner = useContactPartner();

  const isOwnListing = currentUserId === listing.user.id;

  const handleContact = async () => {
    if (!contactMessage.trim()) {
      toast.error({
        title: 'Message required',
        description: 'Please enter a message to send to the partner.',
      });
      return;
    }

    try {
      await contactPartner.mutateAsync({
        listingId: listing.id,
        message: contactMessage,
      });

      toast.success({
        title: 'Message sent',
        description: 'Your contact request has been sent to the player.',
      });

      setShowContactForm(false);
      setContactMessage('');
      onContact?.(listing.id);
    } catch (error) {
      // Error toast handled by mutation cache
    }
  };

  const getDisplayName = () => {
    if (listing.user.displayName) return listing.user.displayName;
    if (listing.user.firstName && listing.user.lastName) {
      return `${listing.user.firstName} ${listing.user.lastName}`;
    }
    return listing.user.username;
  };

  const getLocation = () => {
    if (listing.user.city && listing.user.state) {
      return `${listing.user.city}, ${listing.user.state}`;
    }
    return listing.user.city || listing.user.state || null;
  };

  const getSkillRange = () => {
    if (listing.skillLevelMin && listing.skillLevelMax) {
      if (listing.skillLevelMin === listing.skillLevelMax) {
        return listing.skillLevelMin.toFixed(1);
      }
      return `${listing.skillLevelMin.toFixed(1)} - ${listing.skillLevelMax.toFixed(1)}`;
    }
    if (listing.skillLevelMin) return `${listing.skillLevelMin.toFixed(1)}+`;
    if (listing.skillLevelMax) return `Up to ${listing.skillLevelMax.toFixed(1)}`;
    return 'Any level';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {listing.user.avatarUrl ? (
              <img
                src={listing.user.avatarUrl}
                alt={getDisplayName()}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-pickle-100 dark:bg-pickle-900 flex items-center justify-center">
                <span className="text-pickle-600 dark:text-pickle-400 font-medium text-lg">
                  {getDisplayName().charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {getDisplayName()}
              </h3>
              {listing.user.rating && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {listing.user.rating.toFixed(2)}
                  {listing.user.ratingSource === 'dupr' && ' DUPR'}
                </span>
              )}
            </div>

            {getLocation() && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {getLocation()}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Looking for:</span> {getSkillRange()}
              </span>
            </div>

            {listing.message && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                &ldquo;{listing.message}&rdquo;
              </p>
            )}

            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Posted {formatDate(listing.createdAt)}
            </p>
          </div>

          {/* Actions */}
          {!isOwnListing && (
            <div className="flex-shrink-0">
              {!showContactForm ? (
                <Button
                  size="sm"
                  onClick={() => setShowContactForm(true)}
                >
                  Contact
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowContactForm(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}

          {isOwnListing && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
              Your listing
            </span>
          )}
        </div>

        {/* Contact Form */}
        {showContactForm && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label
              htmlFor={`contact-message-${listing.id}`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Your message to {getDisplayName()}
            </label>
            <textarea
              id={`contact-message-${listing.id}`}
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Hi! I'm interested in partnering with you..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pickle-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              rows={3}
              maxLength={1000}
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={handleContact}
                loading={contactPartner.isPending}
              >
                Send Message
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
