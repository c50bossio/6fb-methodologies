'use client';

/**
 * Toaster Component
 *
 * Renders all active toast notifications
 * Add this to your root layout to enable toasts throughout your app
 *
 * @example
 * // In your layout.tsx
 * import { Toaster } from '@/components/ui/Toaster';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <Toaster />
 *       </body>
 *     </html>
 *   );
 * }
 */

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  getToastIcon,
} from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex items-start gap-3 w-full">
              {/* Icon based on variant */}
              {props.variant && getToastIcon(props.variant)}

              {/* Content */}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>

              {/* Action button */}
              {action}
            </div>

            {/* Close button */}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
