import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { DrawablyCard } from 'drawably/react';
import { Card as ShadCard } from '@/components/ui/card';
import { useUiStyleStore } from '@/stores/ui-style-store';

/**
 * Vỏ Card chọn phong cách:
 *   hand -> DrawablyCard (khung vẽ tay)
 *   flat -> shadcn Card (viền + shadow theo token)
 */

interface StyleCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, StyleCardProps>(({ children, ...props }, ref) => {
  const style = useUiStyleStore((s) => s.style);

  if (style === 'hand') {
    return (
      <DrawablyCard {...(props as HTMLAttributes<HTMLDivElement>)}>
        <div ref={ref}>{children}</div>
      </DrawablyCard>
    );
  }

  return (
    <ShadCard ref={ref} {...props}>
      {children}
    </ShadCard>
  );
});
Card.displayName = 'Card';
