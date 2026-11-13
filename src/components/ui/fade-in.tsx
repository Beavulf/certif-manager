'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type FadeInProps = {
  children: ReactNode;
  /** Задержка перед началом анимации, секунды (для стаггера списков). */
  delay?: number;
  className?: string;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * Лёгкое появление блока при монтировании: прозрачность + сдвиг на 6px.
 * Используется для стаггера виджетов дашборда и карточек.
 */
export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE_OUT, delay }}
      className={cn('min-w-0', className)}
    >
      {children}
    </motion.div>
  );
}
