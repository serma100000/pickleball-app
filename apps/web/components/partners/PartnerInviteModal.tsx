'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useCreateTeamInvite, usePlayerSearch } from '@/hooks/use-api';
import { toast } from '@/hooks/use-toast';

// Types for user search results
interface SearchUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  skillLevel?: string | null;
}

interface SearchResults {
  users: SearchUser[];
}

interface PartnerInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId?: string;
  leagueId?: string;
  eventId?: string;
  eventName?: string;
}

export function PartnerInviteModal({
  isOpen,
  onClose,
  tournamentId,
  leagueId,
  eventId,
  eventName,
}: PartnerInviteModalProps) {
  const [mode, setMode] = useState<'search' | 'email'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    displayName?: string | null;
    username: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [message, setMessage] = useState('');

  const { data: searchResults, isLoading: isSearching } = usePlayerSearch(searchQuery);
  const createInvite = useCreateTeamInvite();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setMode('search');
      setSearchQuery('');
      setSelectedUser(null);
      setInviteeEmail('');
      setTeamName('');
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendInvite = async () => {
    if (mode === 'search' && !selectedUser) {
      toast.error({
        title: 'Select a partner',
        description: 'Please search and select a user to invite.',
      });
      return;
    }

    if (mode === 'email' && !inviteeEmail) {
      toast.error({
        title: 'Enter email',
        description: 'Please enter an email address to send the invite to.',
      });
      return;
    }

    // Email validation
    if (mode === 'email' && inviteeEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteeEmail)) {
        toast.error({
          title: 'Invalid email',
          description: 'Please enter a valid email address.',
        });
        return;
      }
    }

    try {
      await createInvite.mutateAsync({
        tournamentId,
        leagueId,
        eventId,
        inviteeUserId: selectedUser?.id,
        inviteeEmail: mode === 'email' ? inviteeEmail : undefined,
        teamName: teamName || undefined,
        message: message || undefined,
      });

      toast.success({
        title: 'Invitation sent!',
        description: selectedUser
          ? `Invitation sent to ${selectedUser.displayName || selectedUser.username}.`
          : `Invitation sent to ${inviteeEmail}. They have 7 days to accept.`,
      });

      onClose();
    } catch (error) {
      // Error toast handled by mutation cache
    }
  };

  const getDisplayName = (user: { displayName?: string | null; username: string }) => {
    return user.displayName || user.username;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle>Invite a Partner</CardTitle>
          {eventName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              For {eventName}
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-grow overflow-y-auto p-6 space-y-6">
          {/* Mode Tabs */}
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'search'
                  ? 'bg-pickle-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => {
                setMode('search');
                setInviteeEmail('');
              }}
            >
              Search Users
            </button>
            <button
              type="button"
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'email'
                  ? 'bg-pickle-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => {
                setMode('email');
                setSelectedUser(null);
                setSearchQuery('');
              }}
            >
              Invite by Email
            </button>
          </div>

          {/* Search Mode */}
          {mode === 'search' && (
            <div className="space-y-4">
              {selectedUser ? (
                <div className="flex items-center justify-between p-3 bg-pickle-50 dark:bg-pickle-900/20 border border-pickle-200 dark:border-pickle-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    {selectedUser.avatarUrl ? (
                      <img
                        src={selectedUser.avatarUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-pickle-100 dark:bg-pickle-800 flex items-center justify-center">
                        <span className="text-pickle-600 dark:text-pickle-300 font-medium">
                          {getDisplayName(selectedUser).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getDisplayName(selectedUser)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{selectedUser.username}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedUser(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="partner-search"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Search for a player
                    </label>
                    <input
                      id="partner-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or username..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pickle-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Search Results */}
                  {searchQuery.length >= 2 && (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                      {isSearching ? (
                        <div className="p-4 text-center text-gray-500">
                          Searching...
                        </div>
                      ) : (searchResults as SearchResults | undefined)?.users?.length ? (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                          {(searchResults as SearchResults).users.map((user: SearchUser) => (
                            <li key={user.id}>
                              <button
                                type="button"
                                className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                onClick={() => setSelectedUser(user)}
                              >
                                {user.avatarUrl ? (
                                  <img
                                    src={user.avatarUrl}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
                                    <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                                      {getDisplayName(user).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-grow min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">
                                    {getDisplayName(user)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    @{user.username}
                                    {user.skillLevel && ` - ${user.skillLevel}`}
                                  </p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Email Mode */}
          {mode === 'email' && (
            <div>
              <label
                htmlFor="invitee-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Partner&apos;s email address
              </label>
              <input
                id="invitee-email"
                type="email"
                value={inviteeEmail}
                onChange={(e) => setInviteeEmail(e.target.value)}
                placeholder="partner@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pickle-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                They&apos;ll receive an email invitation and have 7 days to accept.
              </p>
            </div>
          )}

          {/* Team Name */}
          <div>
            <label
              htmlFor="team-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Team Name (optional)
            </label>
            <input
              id="team-name"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="The Pickle Pros"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pickle-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="invite-message"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Personal Message (optional)
            </label>
            <textarea
              id="invite-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hey! Want to team up for this tournament?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pickle-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              rows={3}
              maxLength={500}
            />
          </div>
        </CardContent>

        <CardFooter className="border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSendInvite}
            loading={createInvite.isPending}
            disabled={
              (mode === 'search' && !selectedUser) ||
              (mode === 'email' && !inviteeEmail)
            }
          >
            Send Invitation
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
