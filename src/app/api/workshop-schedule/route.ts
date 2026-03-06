import { NextRequest, NextResponse } from 'next/server'
import type { WorkshopSchedule, TimeSlot } from '@/types'

// Deterministic function to replace Math.random() and prevent hydration errors
function getDeterministicCount(seed: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % max;
}

// Mock workshop schedule data - in production this would come from a database
const generateMockSchedules = (): WorkshopSchedule[] => {
  const today = new Date()
  const schedules: WorkshopSchedule[] = []

  // Generate workshops for the next 60 days
  for (let i = 7; i < 60; i += 7) { // Weekly workshops, starting next week
    const workshopDate = new Date(today)
    workshopDate.setDate(today.getDate() + i)

    // Skip Sundays and Mondays for workshops
    if (workshopDate.getDay() === 0 || workshopDate.getDay() === 1) {
      continue
    }

    const dateString = workshopDate.toISOString().split('T')[0]

    // Create morning and afternoon time slots
    const morningSlot: TimeSlot = {
      id: `${dateString}-morning`,
      startTime: `${dateString}T09:00:00Z`,
      endTime: `${dateString}T12:00:00Z`,
      isAvailable: true,
      capacity: 25,
      registered: getDeterministicCount(`${dateString}-morning`, 20), // Deterministic registration count
      price: 497
    }

    const afternoonSlot: TimeSlot = {
      id: `${dateString}-afternoon`,
      startTime: `${dateString}T14:00:00Z`,
      endTime: `${dateString}T17:00:00Z`,
      isAvailable: true,
      capacity: 25,
      registered: getDeterministicCount(`${dateString}-afternoon`, 20), // Deterministic registration count
      price: 497
    }

    // Deterministically make some slots full or unavailable
    if (getDeterministicCount(`${dateString}-morning-full`, 100) < 10) { // 10% chance of being full
      morningSlot.registered = morningSlot.capacity
      morningSlot.isAvailable = false
    }

    if (getDeterministicCount(`${dateString}-afternoon-unavailable`, 100) < 5) { // 5% chance of being unavailable
      afternoonSlot.isAvailable = false
    }

    const schedule: WorkshopSchedule = {
      id: `workshop-${dateString}`,
      title: '6FB Methodologies Mastery Workshop',
      description: 'Master the proven systems that have helped barbershops scale to 6-figure revenues. Learn customer acquisition, retention strategies, pricing optimization, and operational excellence.',
      date: dateString,
      location: {
        name: '6FB Training Center',
        address: '123 Barbershop Boulevard',
        city: 'Las Vegas',
        state: 'NV',
        zipCode: '89101'
      },
      timeSlots: [morningSlot, afternoonSlot],
      maxCapacity: 50,
      totalRegistered: morningSlot.registered + afternoonSlot.registered,
      status: 'scheduled' as const,
      instructors: ['Dre', 'Nate', 'Industry Expert'],
      requirements: [
        'Bring a notebook and pen for taking notes',
        'Come prepared with questions about your business',
        'Bring business cards for networking',
        'Laptop or tablet for digital worksheets (optional)'
      ],
      materials: [
        'Digital workbook and templates',
        'Business assessment tools',
        'Pricing calculator spreadsheet',
        'Marketing template library',
        'Lunch and refreshments included',
        'Certificate of completion'
      ]
    }

    // Mark as full if total registration exceeds capacity
    if (schedule.totalRegistered >= schedule.maxCapacity * 0.9) {
      schedule.status = 'full'
    }

    schedules.push(schedule)
  }

  return schedules
}

// Cache the schedules to maintain consistency during development
let cachedSchedules: WorkshopSchedule[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const getSchedules = (): WorkshopSchedule[] => {
  const now = Date.now()

  if (!cachedSchedules || (now - cacheTimestamp) > CACHE_DURATION) {
    cachedSchedules = generateMockSchedules()
    cacheTimestamp = now
  }

  return cachedSchedules
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeUnavailable = searchParams.get('includeUnavailable') === 'true'

    let schedules = getSchedules()

    // Filter by date range if provided
    if (startDate) {
      schedules = schedules.filter(schedule => schedule.date >= startDate)
    }

    if (endDate) {
      schedules = schedules.filter(schedule => schedule.date <= endDate)
    }

    // Filter out unavailable schedules unless explicitly requested
    if (!includeUnavailable) {
      schedules = schedules.filter(schedule =>
        schedule.status === 'scheduled' &&
        schedule.timeSlots.some(slot => slot.isAvailable && slot.registered < slot.capacity)
      )
    }

    // Sort by date
    schedules.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: schedules,
      total: schedules.length,
      cached: true
    })

  } catch (error) {
    console.error('Workshop schedule error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error fetching schedules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { scheduleId, timeSlotId, action = 'reserve' } = await request.json()

    if (!scheduleId || !timeSlotId) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID and Time Slot ID are required' },
        { status: 400 }
      )
    }

    const schedules = getSchedules()
    const schedule = schedules.find(s => s.id === scheduleId)

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Workshop schedule not found' },
        { status: 404 }
      )
    }

    const timeSlot = schedule.timeSlots.find(ts => ts.id === timeSlotId)

    if (!timeSlot) {
      return NextResponse.json(
        { success: false, error: 'Time slot not found' },
        { status: 404 }
      )
    }

    if (!timeSlot.isAvailable) {
      return NextResponse.json(
        { success: false, error: 'Time slot is not available' },
        { status: 400 }
      )
    }

    if (action === 'reserve') {
      if (timeSlot.registered >= timeSlot.capacity) {
        return NextResponse.json(
          { success: false, error: 'Time slot is full' },
          { status: 400 }
        )
      }

      // Reserve a spot (in production, this would update the database)
      timeSlot.registered += 1
      schedule.totalRegistered += 1

      // Mark as full if capacity reached
      if (timeSlot.registered >= timeSlot.capacity) {
        timeSlot.isAvailable = false
      }

      if (schedule.totalRegistered >= schedule.maxCapacity) {
        schedule.status = 'full'
      }

      return NextResponse.json({
        success: true,
        message: 'Time slot reserved successfully',
        data: {
          schedule,
          timeSlot,
          spotsRemaining: timeSlot.capacity - timeSlot.registered
        }
      })
    }

    if (action === 'release') {
      if (timeSlot.registered > 0) {
        timeSlot.registered -= 1
        schedule.totalRegistered -= 1
        timeSlot.isAvailable = true
        schedule.status = 'scheduled'
      }

      return NextResponse.json({
        success: true,
        message: 'Time slot released successfully',
        data: {
          schedule,
          timeSlot,
          spotsRemaining: timeSlot.capacity - timeSlot.registered
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "reserve" or "release"' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Workshop reservation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error processing reservation' },
      { status: 500 }
    )
  }
}