import { WorkbookSession, canRecordAudio, canTranscribeAudio, getRateLimits } from './workbook-auth'

// Audio file validation constants
export const AUDIO_VALIDATION = {
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB (OpenAI Whisper limit)
  ALLOWED_FORMATS: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
  ALLOWED_MIME_TYPES: [
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/webm',
    'audio/m4a',
    'audio/x-m4a',
    'video/mp4', // For m4a files
    'video/webm' // For webm with audio
  ],
  MAX_DURATION: 3600, // 1 hour in seconds
  MIN_DURATION: 1, // 1 second minimum
}

// Cost management constants
export const WHISPER_COSTS = {
  COST_PER_MINUTE: parseFloat(process.env.NEXT_PUBLIC_WHISPER_COST_PER_MINUTE || '0.006'),
  MAX_DAILY_COST: parseFloat(process.env.NEXT_PUBLIC_MAX_DAILY_TRANSCRIPTION_COST || '50.00'),
  WARNING_COST: parseFloat(process.env.NEXT_PUBLIC_WARN_TRANSCRIPTION_COST || '25.00')
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, Map<string, { count: number; resetTime: number }>>()

// Audio file validation result
export interface AudioValidationResult {
  isValid: boolean
  error?: string
  fileInfo?: {
    name: string
    size: number
    type: string
    extension: string
    estimatedDuration?: number
  }
  estimatedCost?: number
}

// Transcription result
export interface TranscriptionResult {
  success: boolean
  text?: string
  duration?: number
  cost?: number
  error?: string
  usage?: {
    remainingQuota: number
    dailyCost: number
  }
}

// Rate limit check result
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  error?: string
}

/**
 * Validate audio file before processing
 */
export function validateAudioFile(file: File): AudioValidationResult {
  try {
    // Extract file extension
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!extension || !AUDIO_VALIDATION.ALLOWED_FORMATS.includes(extension)) {
      return {
        isValid: false,
        error: `Unsupported file format. Allowed formats: ${AUDIO_VALIDATION.ALLOWED_FORMATS.join(', ')}`
      }
    }

    // Validate MIME type
    if (!AUDIO_VALIDATION.ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `Invalid MIME type: ${file.type}. File may be corrupted or misnamed.`
      }
    }

    // Check file size
    if (file.size > AUDIO_VALIDATION.MAX_FILE_SIZE) {
      const maxSizeMB = AUDIO_VALIDATION.MAX_FILE_SIZE / (1024 * 1024)
      return {
        isValid: false,
        error: `File too large. Maximum size: ${maxSizeMB}MB`
      }
    }

    if (file.size === 0) {
      return {
        isValid: false,
        error: 'File is empty'
      }
    }

    // Estimate duration (rough estimate: 1MB ≈ 1 minute for compressed audio)
    const estimatedDuration = Math.max(1, Math.floor(file.size / (1024 * 1024) * 60))

    if (estimatedDuration > AUDIO_VALIDATION.MAX_DURATION) {
      return {
        isValid: false,
        error: `Audio too long. Maximum duration: ${AUDIO_VALIDATION.MAX_DURATION / 60} minutes`
      }
    }

    // Calculate estimated cost
    const estimatedCost = (estimatedDuration / 60) * WHISPER_COSTS.COST_PER_MINUTE

    return {
      isValid: true,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        extension,
        estimatedDuration
      },
      estimatedCost
    }

  } catch (error) {
    console.error('Audio file validation error:', error)
    return {
      isValid: false,
      error: 'Failed to validate audio file'
    }
  }
}

/**
 * Check rate limits for user
 */
export function checkRateLimit(
  userId: string,
  action: 'audioRecordings' | 'transcriptions' | 'apiCalls',
  userRole: WorkbookSession['role']
): RateLimitResult {
  try {
    const limits = getRateLimits(userRole)
    const actionLimit = limits[action]

    if (!actionLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now(),
        error: 'Invalid action type'
      }
    }

    const now = Date.now()
    const windowStart = now - actionLimit.window * 1000

    // Get user's rate limit data
    if (!rateLimitStore.has(userId)) {
      rateLimitStore.set(userId, new Map())
    }

    const userLimits = rateLimitStore.get(userId)!
    const actionData = userLimits.get(action)

    if (!actionData || actionData.resetTime <= now) {
      // Reset or initialize counter
      userLimits.set(action, {
        count: 1,
        resetTime: now + actionLimit.window * 1000
      })

      return {
        allowed: true,
        remaining: actionLimit.limit - 1,
        resetTime: now + actionLimit.window * 1000
      }
    }

    // Check if limit exceeded
    if (actionData.count >= actionLimit.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: actionData.resetTime,
        error: `Rate limit exceeded. Limit: ${actionLimit.limit} per ${actionLimit.window / 3600} hour(s)`
      }
    }

    // Increment counter
    actionData.count += 1

    return {
      allowed: true,
      remaining: actionLimit.limit - actionData.count,
      resetTime: actionData.resetTime
    }

  } catch (error) {
    console.error('Rate limit check error:', error)
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now(),
      error: 'Rate limit check failed'
    }
  }
}

/**
 * Sanitize audio file content (basic security check)
 */
export async function sanitizeAudioFile(file: File): Promise<{ safe: boolean; error?: string }> {
  try {
    // Read first few bytes to check file signature
    const buffer = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Check for common audio file signatures
    const signatures = {
      mp3: [0xFF, 0xFB], // MP3
      mp3_id3: [0x49, 0x44, 0x33], // MP3 with ID3
      wav: [0x52, 0x49, 0x46, 0x46], // WAV (RIFF)
      m4a: [0x66, 0x74, 0x79, 0x70], // M4A (ftyp)
      webm: [0x1A, 0x45, 0xDF, 0xA3], // WebM
    }

    let validSignature = false

    // Check if file starts with any valid audio signature
    for (const [format, signature] of Object.entries(signatures)) {
      if (signature.every((byte, index) => bytes[index] === byte)) {
        validSignature = true
        break
      }
    }

    if (!validSignature) {
      return {
        safe: false,
        error: 'File does not appear to be a valid audio file'
      }
    }

    // Additional checks for suspicious content could be added here
    // For example, scanning for embedded scripts or malicious patterns

    return { safe: true }

  } catch (error) {
    console.error('Audio file sanitization error:', error)
    return {
      safe: false,
      error: 'Failed to validate file content'
    }
  }
}

/**
 * Secure audio transcription with OpenAI Whisper
 */
export async function transcribeAudio(
  audioFile: File,
  session: WorkbookSession,
  options: {
    language?: string
    prompt?: string
    temperature?: number
  } = {}
): Promise<TranscriptionResult> {
  try {
    // Check permissions
    if (!canTranscribeAudio(session)) {
      return {
        success: false,
        error: 'Insufficient permissions for audio transcription'
      }
    }

    // Check rate limits
    const rateLimit = checkRateLimit(session.userId, 'transcriptions', session.role)
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: rateLimit.error || 'Rate limit exceeded'
      }
    }

    // Validate audio file
    const validation = validateAudioFile(audioFile)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Sanitize file content
    const sanitization = await sanitizeAudioFile(audioFile)
    if (!sanitization.safe) {
      return {
        success: false,
        error: sanitization.error
      }
    }

    // Check daily cost limit
    const estimatedCost = validation.estimatedCost || 0
    // In production, you'd fetch actual daily usage from database
    const dailyCost = 0 // Placeholder for daily cost tracking

    if (dailyCost + estimatedCost > WHISPER_COSTS.MAX_DAILY_COST) {
      return {
        success: false,
        error: `Daily transcription cost limit exceeded ($${WHISPER_COSTS.MAX_DAILY_COST})`
      }
    }

    // Prepare form data for OpenAI API
    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('model', process.env.NEXT_PUBLIC_WHISPER_MODEL || 'whisper-1')

    if (options.language) {
      formData.append('language', options.language)
    }

    if (options.prompt) {
      // Sanitize prompt to prevent injection
      const sanitizedPrompt = options.prompt.slice(0, 244) // OpenAI limit
      formData.append('prompt', sanitizedPrompt)
    }

    if (options.temperature !== undefined) {
      formData.append('temperature', Math.max(0, Math.min(1, options.temperature)).toString())
    }

    formData.append('response_format', 'json')

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', response.status, errorData)

      return {
        success: false,
        error: `Transcription failed: ${errorData.error?.message || response.statusText}`
      }
    }

    const result = await response.json()
    const duration = validation.fileInfo?.estimatedDuration || 0
    const actualCost = (duration / 60) * WHISPER_COSTS.COST_PER_MINUTE

    console.log('✅ Audio transcription successful:', {
      userId: session.userId,
      duration,
      cost: actualCost,
      textLength: result.text?.length || 0
    })

    return {
      success: true,
      text: result.text,
      duration,
      cost: actualCost,
      usage: {
        remainingQuota: rateLimit.remaining,
        dailyCost: dailyCost + actualCost
      }
    }

  } catch (error) {
    console.error('Audio transcription error:', error)
    return {
      success: false,
      error: 'Transcription service unavailable'
    }
  }
}

/**
 * Get user's current usage statistics
 */
export function getUserUsageStats(userId: string, userRole: WorkbookSession['role']) {
  const limits = getRateLimits(userRole)
  const userLimits = rateLimitStore.get(userId) || new Map()
  const now = Date.now()

  const stats = {
    audioRecordings: {
      used: 0,
      limit: limits.audioRecordings.limit,
      remaining: limits.audioRecordings.limit,
      resetTime: now + limits.audioRecordings.window * 1000
    },
    transcriptions: {
      used: 0,
      limit: limits.transcriptions.limit,
      remaining: limits.transcriptions.limit,
      resetTime: now + limits.transcriptions.window * 1000
    },
    apiCalls: {
      used: 0,
      limit: limits.apiCalls.limit,
      remaining: limits.apiCalls.limit,
      resetTime: now + limits.apiCalls.window * 1000
    }
  }

  // Update with actual usage
  for (const [action, actionData] of userLimits.entries()) {
    if (actionData.resetTime > now && stats[action as keyof typeof stats]) {
      const statEntry = stats[action as keyof typeof stats]
      statEntry.used = actionData.count
      statEntry.remaining = Math.max(0, statEntry.limit - actionData.count) as typeof statEntry.remaining
      statEntry.resetTime = actionData.resetTime
    }
  }

  return stats
}

/**
 * Clean up expired rate limit entries (should be called periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now()

  for (const [userId, userLimits] of rateLimitStore.entries()) {
    for (const [action, actionData] of userLimits.entries()) {
      if (actionData.resetTime <= now) {
        userLimits.delete(action)
      }
    }

    if (userLimits.size === 0) {
      rateLimitStore.delete(userId)
    }
  }
}