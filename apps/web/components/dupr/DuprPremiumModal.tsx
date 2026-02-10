'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Shield, Star, ExternalLink } from 'lucide-react';
import { DuprSsoModal } from './DuprSsoModal';

interface DuprPremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredLevel: 'linked' | 'premium' | 'verified';
  onSuccess?: () => void;
}

export function DuprPremiumModal({
  open,
  onOpenChange,
  requiredLevel,
  onSuccess,
}: DuprPremiumModalProps) {
  const [showSso, setShowSso] = useState(false);

  const levelInfo = {
    linked: {
      title: 'DUPR Account Required',
      description: 'This event requires a linked DUPR account to register.',
      icon: Shield,
      action: 'Link your DUPR Account',
    },
    premium: {
      title: 'DUPR+ Required',
      description:
        'This event requires a DUPR+ (Premium) membership. DUPR+ provides verified ratings, priority matchmaking, and more.',
      icon: Star,
      action: 'Upgrade to DUPR+',
    },
    verified: {
      title: 'DUPR Verified Required',
      description:
        'This event requires DUPR Verified status, the highest level of rating authentication. Verified players have had their identity and skill confirmed.',
      icon: Shield,
      action: 'Get DUPR Verified',
    },
  };

  const info = levelInfo[requiredLevel];
  const Icon = info.icon;

  if (showSso) {
    return (
      <DuprSsoModal
        open={showSso}
        onOpenChange={(isOpen) => {
          setShowSso(isOpen);
          if (!isOpen) onOpenChange(false);
        }}
        onSuccess={() => {
          setShowSso(false);
          onOpenChange(false);
          onSuccess?.();
        }}
      />
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 p-6">
          <Dialog.Close className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </Dialog.Close>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto">
              <Icon className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            </div>

            <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
              {info.title}
            </Dialog.Title>

            <Dialog.Description className="text-gray-600 dark:text-gray-300">
              {info.description}
            </Dialog.Description>

            <div className="space-y-3 pt-2">
              {requiredLevel === 'linked' ? (
                <button
                  onClick={() => setShowSso(true)}
                  className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors"
                >
                  {info.action}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowSso(true)}
                    className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors"
                  >
                    {info.action}
                  </button>
                  <a
                    href="https://mydupr.com/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-medium"
                  >
                    Learn more about DUPR membership
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}

              <button
                onClick={() => onOpenChange(false)}
                className="w-full px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
              >
                Maybe later
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
