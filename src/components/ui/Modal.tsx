import type { ReactNode } from 'react';
import SlideOver from './SlideOver';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const sizeToWidth: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[min(1180px,calc(100vw-1rem))]'
};

export function Modal({
  open,
  title,
  subtitle,
  headerRight,
  children,
  footer,
  onClose,
  size = 'md',
  className,
  closeOnEscape = true
}: {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: ModalSize;
  className?: string;
  closeOnEscape?: boolean;
}) {
  return (
    <SlideOver
      open={open}
      title={title}
      subtitle={subtitle}
      headerRight={headerRight}
      footer={footer}
      onClose={onClose}
      widthClass={sizeToWidth[size]}
      className={className}
      closeOnEscape={closeOnEscape}
    >
      {children}
    </SlideOver>
  );
}
