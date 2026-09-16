import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { DrawablyButton } from 'drawably/react';
import { Button as ShadButton, type ButtonProps as ShadButtonProps } from '@/components/ui/button';
import { useUiStyleStore } from '@/stores/ui-style-store';

/**
 * Vỏ Button chọn phong cách theo store UI:
 *   hand -> DrawablyButton (vẽ tay)
 *   flat -> shadcn Button (phẳng theo token)
 *
 * Nơi dùng chỉ gọi <Button>, không cần biết đang phong cách nào.
 */

interface StyleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ShadButtonProps['variant'];
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, StyleButtonProps>(
  ({ variant, children, ...props }, ref) => {
    const style = useUiStyleStore((s) => s.style);

    if (style === 'hand') {
      // drawably chưa hỗ trợ full variant map của shadcn; giữ prop cơ bản.
      // variant destructive/outline map sang tone drawably tương ứng nếu có.
      const drawablyVariant = variant === 'destructive' ? 'solid' : 'solid';
      const drawablyTone = variant === 'outline' || variant === 'ghost' ? 'neutral' : undefined;
      return (
        <DrawablyButton
          ref={ref}
          variant={drawablyVariant}
          tone={drawablyTone}
          {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
        </DrawablyButton>
      );
    }

    return (
      <ShadButton ref={ref} variant={variant} {...props}>
        {children}
      </ShadButton>
    );
  },
);
Button.displayName = 'Button';
