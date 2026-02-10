'use client';

import { useEffect, useCallback, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useDuprSsoCallback, useDuprSsoUrl } from '@/hooks/use-api';

interface DuprSsoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DuprPostMessageData {
  userToken?: string;
  refreshToken?: string;
  id?: string;
  duprId?: string;
  stats?: {
    singles?: number | null;
    doubles?: number | null;
    mixedDoubles?: number | null;
  };
}

export function DuprSsoModal({ open, onOpenChange, onSuccess }: DuprSsoModalProps) {
  const { data: ssoData, isLoading: loadingSsoUrl } = useDuprSsoUrl();
  const ssoCallback = useDuprSsoCallback();
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      // Only accept messages from DUPR domains
      if (
        !event.origin.includes('dupr.gg') &&
        !event.origin.includes('dupr.com')
      ) {
        return;
      }

      const data = event.data as DuprPostMessageData;

      if (!data?.userToken || !data?.duprId) {
        return;
      }

      try {
        await ssoCallback.mutateAsync({
          userToken: data.userToken,
          refreshToken: data.refreshToken,
          id: data.id,
          duprId: data.duprId,
          stats: data.stats,
        });

        toast.success({
          title: 'DUPR account linked',
          description: 'Your DUPR account has been connected successfully.',
        });

        onOpenChange(false);
        onSuccess?.();
      } catch (error) {
        console.error('DUPR SSO callback failed:', error);
        toast.error({
          title: 'Failed to link DUPR account',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      }
    },
    [ssoCallback, onOpenChange, onSuccess]
  );

  useEffect(() => {
    if (!open) return;

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, handleMessage]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg max-h-[85vh] bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Link with DUPR
            </Dialog.Title>
            <Dialog.Close className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="w-5 h-5 text-gray-500" />
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-4">
            {loadingSsoUrl ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              </div>
            ) : ssoData?.url ? (
              <div className="relative w-full" style={{ height: '500px' }}>
                {!iframeLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                  </div>
                )}
                <iframe
                  src={ssoData.url}
                  className="w-full h-full border-0 rounded-lg"
                  title="Login with DUPR"
                  onLoad={() => setIframeLoaded(true)}
                  allow="same-origin"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                DUPR integration is not configured
              </div>
            )}

            {ssoCallback.isPending && (
              <div className="mt-4 flex items-center gap-2 text-brand-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Linking your DUPR account...
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            Log in to your DUPR account in the window above to link it.
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
