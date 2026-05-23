'use client'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

export const AdminHoverCard = () => {
  return (
    <div className="flex justify-center mt-4">
      <p className="text-center text-sm text-muted-foreground">
        Нет доступа?{' '}
        <HoverCard>
          <HoverCardTrigger delay={10} closeDelay={100}>
            <button
              className="font-medium cursor-pointer text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded px-0.5"
              type="button"
            >
              Связаться с администратором
            </button>
          </HoverCardTrigger>

          <HoverCardContent className="w-64 text-sm" side="top" align="center">
            <div className="space-y-2">
              <div>
                <span className="block font-medium">Администратор:</span>
                <span className="block text-foreground/80">Цыганок Евгений Сергеевич</span>
              </div>
              <div>
                <span className="block font-medium">Внутренний номер:</span>
                <span className="block text-foreground/80">1767</span>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </p>
    </div>
  )
}