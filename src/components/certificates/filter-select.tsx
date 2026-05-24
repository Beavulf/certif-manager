import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react";


export function FilterSelect(
  {items, onChange}: {items:{label: string, value: string}[], onChange: (value: string) => void}
) {  
  return (
    <Select items={items}>
      <SelectTrigger className="w-full max-w-48">
        <SelectValue placeholder="Поиск по"/>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Поиск по</SelectLabel>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                // checked={item.checked}
                onChange={() => onChange(item.value)}
                className="mr-2"
                tabIndex={-1}
                onClick={e => e.stopPropagation()}
              />
              {item.label}
            </SelectItem>
          ))}
    
    
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
