import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;
export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const fieldClass =
  'w-full rounded-xl border border-line bg-surface2/60 px-3.5 py-2.5 text-[15px] text-text placeholder:text-faint outline-none transition focus:border-primary/60 focus:bg-surface2 focus:ring-2 focus:ring-primary/20';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldClass, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(fieldClass, 'min-h-[96px] resize-y', className)} {...props} />;
});
