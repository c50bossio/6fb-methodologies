'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

interface CalendarProps {
  selected?: Date | null
  onSelect?: (date: Date) => void
  disabled?: (date: Date) => boolean
  minDate?: Date
  maxDate?: Date
  className?: string
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function Calendar({
  selected,
  onSelect,
  disabled,
  minDate,
  maxDate,
  className
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const startOfCalendar = new Date(startOfMonth)
  startOfCalendar.setDate(startOfMonth.getDate() - startOfMonth.getDay())

  const endOfCalendar = new Date(endOfMonth)
  const daysToAdd = 6 - endOfMonth.getDay()
  endOfCalendar.setDate(endOfMonth.getDate() + daysToAdd)

  const calendarDays = []
  const current = new Date(startOfCalendar)
  while (current <= endOfCalendar) {
    calendarDays.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  const isDateDisabled = (date: Date) => {
    if (disabled && disabled(date)) return true
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  const isDateSelected = (date: Date) => {
    if (!selected) return false
    return date.toDateString() === selected.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date) || !onSelect) return
    onSelect(date)
  }

  return (
    <div className={cn(
      'bg-background-secondary border border-border-primary rounded-xl p-4 shadow-dark',
      className
    )}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth('prev')}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h2 className="text-lg font-semibold text-text-primary">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth('next')}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map(day => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-xs font-medium text-text-muted"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const disabled = isDateDisabled(date)
          const selected = isDateSelected(date)
          const currentMonth = isCurrentMonth(date)
          const today = isToday(date)

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={cn(
                'h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200 focus-ring',
                'hover:bg-background-accent disabled:cursor-not-allowed',
                {
                  // Current month dates
                  'text-text-primary': currentMonth && !disabled,
                  // Other month dates
                  'text-text-muted': !currentMonth,
                  // Selected date
                  'bg-tomb45-green text-white hover:bg-tomb45-green-hover': selected,
                  // Today
                  'ring-1 ring-tomb45-green': today && !selected,
                  // Disabled dates
                  'opacity-30': disabled,
                  // Hover states
                  'hover:bg-tomb45-green/20': !selected && !disabled && currentMonth,
                }
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}