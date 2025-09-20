'use client';

import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/Calendar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Clock, MapPin, Users, CheckCircle } from 'lucide-react';
import type {
  WorkshopSchedule,
  TimeSlot,
  SelectedSchedule,
  WorkshopCalendarProps,
} from '@/types';

export function WorkshopCalendar({
  schedules,
  onScheduleSelect,
  selectedSchedule,
  showTimeSlots = true,
  allowMultipleSelection = false,
  className,
}: WorkshopCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );

  // Get available dates from schedules
  const availableDates = useMemo(() => {
    return schedules
      .filter(schedule => schedule.status === 'scheduled')
      .map(schedule => new Date(schedule.date));
  }, [schedules]);

  // Get schedule for selected date
  const selectedDateSchedule = useMemo(() => {
    if (!selectedDate) return null;
    return schedules.find(schedule => {
      const scheduleDate = new Date(schedule.date);
      return scheduleDate.toDateString() === selectedDate.toDateString();
    });
  }, [selectedDate, schedules]);

  // Check if a date has available workshops
  const isDateAvailable = (date: Date) => {
    return availableDates.some(
      availableDate => availableDate.toDateString() === date.toDateString()
    );
  };

  // Disable dates that don't have workshops or are in the past
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return true;
    return !isDateAvailable(date);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null); // Reset time slot when date changes

    // If there's only one time slot, auto-select it
    const schedule = schedules.find(s => {
      const scheduleDate = new Date(s.date);
      return scheduleDate.toDateString() === date.toDateString();
    });

    if (
      schedule &&
      schedule.timeSlots.length === 1 &&
      schedule.timeSlots[0].isAvailable
    ) {
      handleTimeSlotSelect(schedule.timeSlots[0], schedule);
    }
  };

  const handleTimeSlotSelect = (
    timeSlot: TimeSlot,
    schedule: WorkshopSchedule
  ) => {
    if (!timeSlot.isAvailable) return;

    setSelectedTimeSlot(timeSlot);

    if (onScheduleSelect && selectedDate) {
      const selectedSchedule: SelectedSchedule = {
        scheduleId: schedule.id,
        timeSlotId: timeSlot.id,
        date: selectedDate,
        timeSlot,
        workshop: schedule,
      };
      onScheduleSelect(selectedSchedule);
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateHeader = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Calendar */}
      <div>
        <h3 className='text-lg font-semibold text-text-primary mb-4'>
          Select Workshop Date
        </h3>
        <Calendar
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={isDateDisabled}
          minDate={new Date()}
          className='mx-auto max-w-fit'
        />
      </div>

      {/* Selected Date Info */}
      {selectedDate && selectedDateSchedule && (
        <div className='bg-background-secondary border border-border-primary rounded-xl p-6 shadow-dark'>
          <div className='mb-4'>
            <h4 className='text-xl font-semibold text-text-primary mb-2'>
              {formatDateHeader(selectedDate)}
            </h4>
            <h5 className='text-lg text-tomb45-green font-medium mb-3'>
              {selectedDateSchedule.title}
            </h5>
            <p className='text-text-secondary mb-4'>
              {selectedDateSchedule.description}
            </p>
          </div>

          {/* Location Info */}
          <div className='flex items-start gap-3 mb-4 p-3 bg-background-accent rounded-lg'>
            <MapPin className='h-5 w-5 text-tomb45-green mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-text-primary font-medium'>
                {selectedDateSchedule.location.name}
              </p>
              <p className='text-text-secondary text-sm'>
                {selectedDateSchedule.location.address},{' '}
                {selectedDateSchedule.location.city},{' '}
                {selectedDateSchedule.location.state}{' '}
                {selectedDateSchedule.location.zipCode}
              </p>
            </div>
          </div>

          {/* Instructors */}
          {selectedDateSchedule.instructors.length > 0 && (
            <div className='mb-4'>
              <p className='text-text-primary font-medium mb-2'>Instructors:</p>
              <div className='flex flex-wrap gap-2'>
                {selectedDateSchedule.instructors.map((instructor, index) => (
                  <Badge key={index} variant='secondary'>
                    {instructor}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Time Slots */}
          {showTimeSlots && selectedDateSchedule.timeSlots.length > 0 && (
            <div>
              <h6 className='text-lg font-semibold text-text-primary mb-3'>
                Available Time Slots
              </h6>
              <div className='grid gap-3 sm:grid-cols-2'>
                {selectedDateSchedule.timeSlots.map(timeSlot => {
                  const isSelected = selectedTimeSlot?.id === timeSlot.id;
                  const spotsLeft = timeSlot.capacity - timeSlot.registered;
                  const isFull = spotsLeft <= 0;
                  const isUnavailable = !timeSlot.isAvailable || isFull;

                  return (
                    <button
                      key={timeSlot.id}
                      onClick={() =>
                        handleTimeSlotSelect(timeSlot, selectedDateSchedule)
                      }
                      disabled={isUnavailable}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-all duration-200 focus-ring',
                        'hover:border-tomb45-green disabled:cursor-not-allowed disabled:opacity-50',
                        {
                          'border-tomb45-green bg-tomb45-green/10': isSelected,
                          'border-border-primary bg-background-accent':
                            !isSelected && !isUnavailable,
                          'border-red-500 bg-red-500/10': isUnavailable,
                        }
                      )}
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-2'>
                          <Clock className='h-4 w-4 text-tomb45-green' />
                          <span className='font-medium text-text-primary'>
                            {formatTime(timeSlot.startTime)} -{' '}
                            {formatTime(timeSlot.endTime)}
                          </span>
                          {isSelected && (
                            <CheckCircle className='h-4 w-4 text-tomb45-green' />
                          )}
                        </div>
                        {timeSlot.price && (
                          <span className='text-sm font-medium text-tomb45-green'>
                            ${timeSlot.price}
                          </span>
                        )}
                      </div>

                      <div className='flex items-center justify-between text-sm'>
                        <div className='flex items-center gap-1 text-text-secondary'>
                          <Users className='h-3 w-3' />
                          <span>
                            {timeSlot.registered}/{timeSlot.capacity} registered
                          </span>
                        </div>

                        {isFull ? (
                          <Badge variant='destructive' className='text-xs'>
                            Full
                          </Badge>
                        ) : spotsLeft <= 3 ? (
                          <Badge variant='secondary' className='text-xs'>
                            {spotsLeft} spots left
                          </Badge>
                        ) : (
                          <Badge variant='secondary' className='text-xs'>
                            Available
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workshop Requirements */}
          {selectedDateSchedule.requirements &&
            selectedDateSchedule.requirements.length > 0 && (
              <div className='mt-4 p-3 bg-background-accent rounded-lg'>
                <p className='text-text-primary font-medium mb-2'>
                  Requirements:
                </p>
                <ul className='text-sm text-text-secondary space-y-1'>
                  {selectedDateSchedule.requirements.map(
                    (requirement, index) => (
                      <li key={index} className='flex items-start gap-2'>
                        <span className='text-tomb45-green mt-1'>•</span>
                        {requirement}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

          {/* Materials */}
          {selectedDateSchedule.materials &&
            selectedDateSchedule.materials.length > 0 && (
              <div className='mt-4 p-3 bg-background-accent rounded-lg'>
                <p className='text-text-primary font-medium mb-2'>
                  Materials Provided:
                </p>
                <ul className='text-sm text-text-secondary space-y-1'>
                  {selectedDateSchedule.materials.map((material, index) => (
                    <li key={index} className='flex items-start gap-2'>
                      <span className='text-tomb45-green mt-1'>•</span>
                      {material}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* No Date Selected State */}
      {!selectedDate && (
        <div className='text-center py-8'>
          <p className='text-text-muted'>
            Select a date to view available workshop times
          </p>
        </div>
      )}

      {/* Selected Date but No Schedule */}
      {selectedDate && !selectedDateSchedule && (
        <div className='text-center py-8'>
          <p className='text-text-muted'>
            No workshops available on {selectedDate.toDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
