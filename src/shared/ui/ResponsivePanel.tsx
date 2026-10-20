import { useSyncExternalStore, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
function subscribe(callback: () => void) {
  const media = window.matchMedia('(max-width: 700px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
const isMobile = () => window.matchMedia('(max-width: 700px)').matches;
// Sheet-style accessible primitive: focus trap, escape, overlay and focus restoration are Radix-owned.
export function ResponsivePanel({
  children,
  className,
  title,
  side,
}: {
  children: ReactNode;
  className: string;
  title: string;
  side: 'left' | 'right';
}) {
  const mobile = useSyncExternalStore(subscribe, isMobile, () => false);
  if (!mobile) return <aside className={className}>{children}</aside>;
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className={`mobile-panel-trigger ${side}`}>{title}</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className={`sheet-content ${className}`}>
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Explore the catalog and calculated satellite information. Press
            Escape to return to Earth.
          </Dialog.Description>
          <Dialog.Close
            className="sheet-close"
            aria-label={`Close ${title.toLowerCase()}`}
          >
            <X size={17} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
