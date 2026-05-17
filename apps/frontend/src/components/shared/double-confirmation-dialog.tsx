'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DoubleConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
  warning?: string;
}

/**
 * REQ-20.2 — REQ-20.5: DoubleConfirmationDialog
 * A reusable confirmation dialog with support for warning banners,
 * destructive actions, and loading states.
 */
export function DoubleConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Back',
  variant = 'default',
  isLoading = false,
  warning,
}: DoubleConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {variant === 'destructive' ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Info className="h-5 w-5 text-primary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-base leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {warning && (
          <div
            className={cn(
              'mt-2 flex items-start gap-3 rounded-lg p-3 text-sm transition-colors',
              variant === 'destructive'
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'bg-amber-50 text-amber-800 border border-amber-200',
            )}
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="font-medium">{warning}</p>
          </div>
        )}

        <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
            className={cn('flex-1 sm:flex-none min-w-[120px]', {
              'bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all duration-300':
                variant === 'default',
            })}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
