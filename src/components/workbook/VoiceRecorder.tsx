'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Square, Play, Pause, Trash2, Download, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  AudioRecorder,
  AudioRecording,
  RecordingState,
  formatDuration,
  formatFileSize,
  getAudioLevelColor,
  detectBrowserCompatibility
} from '@/lib/audio-recording'

// Component Props
interface VoiceRecorderProps {
  userId: string
  sessionInfo?: {
    day: 1 | 2
    session: string
    speaker?: string
  }
  autoSave?: boolean
  showVisualizer?: boolean
  className?: string
  onRecordingComplete?: (recording: AudioRecording) => void
  onError?: (error: string) => void
}

// Audio Level Visualizer Component
const AudioLevelVisualizer: React.FC<{ level: number; isActive: boolean }> = ({ level, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw background
    ctx.fillStyle = '#242424' // background-secondary
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw level bars
    const barCount = 20
    const barWidth = canvas.width / barCount
    const maxHeight = canvas.height

    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.random() * level * maxHeight
      const alpha = isActive ? 0.8 : 0.3

      ctx.fillStyle = `rgba(${level > 0.5 ? '220, 53, 69' : level > 0.3 ? '255, 193, 7' : '0, 200, 81'}, ${alpha})`
      ctx.fillRect(i * barWidth, maxHeight - barHeight, barWidth - 2, barHeight)
    }
  }, [level, isActive])

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className="border border-border-primary rounded bg-background-accent"
    />
  )
}

// Recording Status Component
const RecordingStatus: React.FC<{ state: RecordingState; duration: number }> = ({ state, duration }) => {
  const getStatusColor = () => {
    switch (state) {
      case 'recording': return 'text-red-500'
      case 'paused': return 'text-warning'
      case 'processing': return 'text-info'
      case 'error': return 'text-error'
      default: return 'text-text-muted'
    }
  }

  const getStatusText = () => {
    switch (state) {
      case 'recording': return 'Recording'
      case 'paused': return 'Paused'
      case 'processing': return 'Processing'
      case 'error': return 'Error'
      default: return 'Ready'
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${state === 'recording' ? 'animate-pulse bg-red-500' : 'bg-text-muted'}`} />
      <span className={`font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {duration > 0 && (
        <span className="text-text-secondary">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  )
}

// Recording Controls Component
interface RecordingControlsProps {
  state: RecordingState
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onClear: () => void
  disabled: boolean
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  state,
  onStart,
  onPause,
  onResume,
  onStop,
  onClear,
  disabled
}) => {
  return (
    <div className="flex items-center space-x-2">
      {state === 'idle' && (
        <Button
          onClick={onStart}
          disabled={disabled}
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          <Mic className="w-4 h-4 mr-2" />
          Start Recording
        </Button>
      )}

      {state === 'recording' && (
        <>
          <Button
            onClick={onPause}
            disabled={disabled}
            className="bg-warning hover:bg-yellow-600 text-white"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          <Button
            onClick={onStop}
            disabled={disabled}
            className="bg-text-muted hover:bg-text-secondary text-background-primary"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </>
      )}

      {state === 'paused' && (
        <>
          <Button
            onClick={onResume}
            disabled={disabled}
            className="bg-success hover:bg-green-600 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Resume
          </Button>
          <Button
            onClick={onStop}
            disabled={disabled}
            className="bg-text-muted hover:bg-text-secondary text-background-primary"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </>
      )}

      {(state === 'idle' || state === 'error') && (
        <Button
          onClick={onClear}
          disabled={disabled}
          variant="outline"
          className="text-text-muted"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  )
}

// Main VoiceRecorder Component
export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  userId,
  sessionInfo,
  autoSave = true,
  showVisualizer = true,
  className = '',
  onRecordingComplete,
  onError
}) => {
  // State
  const [recorder] = useState(() => new AudioRecorder())
  const [state, setState] = useState<RecordingState>('idle')
  const [currentRecording, setCurrentRecording] = useState<AudioRecording | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const durationInterval = useRef<number | null>(null)
  const startTime = useRef<Date | null>(null)

  // Event handlers setup
  useEffect(() => {
    // Check browser support
    const compatibility = detectBrowserCompatibility()
    setIsSupported(compatibility !== 'unsupported')

    if (compatibility === 'unsupported') {
      setError('Audio recording is not supported in this browser')
      return
    }

    // Setup recorder event listeners
    const handleStateChange = (recorderState: any) => {
      setState(recorderState.state)
      if (recorderState.error) {
        setError(recorderState.error)
        onError?.(recorderState.error)
      }
    }

    const handleAudioLevel = (level: number) => {
      setAudioLevel(level)
    }

    const handleRecordingStarted = () => {
      startTime.current = new Date()
      setDuration(0)
      setError(null)

      // Start duration timer
      durationInterval.current = window.setInterval(() => {
        if (startTime.current) {
          const elapsed = (Date.now() - startTime.current.getTime()) / 1000
          setDuration(elapsed)
        }
      }, 100)
    }

    const handleRecordingStopped = async (recording: AudioRecording) => {
      setCurrentRecording(recording)

      // Stop duration timer
      if (durationInterval.current) {
        window.clearInterval(durationInterval.current)
        durationInterval.current = null
      }

      // Auto-save if enabled
      if (autoSave) {
        try {
          await recorder.saveRecording(userId, recording, true)
        } catch (error) {
          console.error('Auto-save failed:', error)
          setError('Failed to save recording')
        }
      }

      // Call completion callback
      onRecordingComplete?.(recording)
    }

    const handleRecordingPaused = () => {
      if (durationInterval.current) {
        window.clearInterval(durationInterval.current)
        durationInterval.current = null
      }
    }

    const handleRecordingResumed = () => {
      if (!durationInterval.current && startTime.current) {
        durationInterval.current = window.setInterval(() => {
          if (startTime.current) {
            const elapsed = (Date.now() - startTime.current.getTime()) / 1000
            setDuration(elapsed)
          }
        }, 100)
      }
    }

    // Attach event listeners
    recorder.on('stateChanged', handleStateChange)
    recorder.on('audioLevel', handleAudioLevel)
    recorder.on('recordingStarted', handleRecordingStarted)
    recorder.on('recordingStopped', handleRecordingStopped)
    recorder.on('recordingPaused', handleRecordingPaused)
    recorder.on('recordingResumed', handleRecordingResumed)

    // Cleanup
    return () => {
      recorder.off('stateChanged', handleStateChange)
      recorder.off('audioLevel', handleAudioLevel)
      recorder.off('recordingStarted', handleRecordingStarted)
      recorder.off('recordingStopped', handleRecordingStopped)
      recorder.off('recordingPaused', handleRecordingPaused)
      recorder.off('recordingResumed', handleRecordingResumed)

      if (durationInterval.current) {
        window.clearInterval(durationInterval.current)
      }

      recorder.destroy()
    }
  }, [recorder, userId, autoSave, onRecordingComplete, onError])

  // Action handlers
  const handleStartRecording = useCallback(async () => {
    try {
      setError(null)
      await recorder.initialize()
      await recorder.startRecording(sessionInfo)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [recorder, sessionInfo, onError])

  const handlePauseRecording = useCallback(() => {
    recorder.pauseRecording()
  }, [recorder])

  const handleResumeRecording = useCallback(() => {
    recorder.resumeRecording()
  }, [recorder])

  const handleStopRecording = useCallback(async () => {
    try {
      await recorder.stopRecording()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [recorder, onError])

  const handleClearRecording = useCallback(() => {
    setCurrentRecording(null)
    setDuration(0)
    setAudioLevel(0)
    setError(null)
    startTime.current = null

    if (durationInterval.current) {
      window.clearInterval(durationInterval.current)
      durationInterval.current = null
    }
  }, [])

  const handleDownloadRecording = useCallback(async () => {
    if (!currentRecording) return

    try {
      const audioUrl = await recorder.exportRecording(userId, currentRecording.id, 'url') as string
      const link = document.createElement('a')
      link.href = audioUrl
      link.download = `recording_${currentRecording.id}.webm`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(audioUrl)
    } catch (error) {
      console.error('Download failed:', error)
      setError('Failed to download recording')
    }
  }, [currentRecording, recorder, userId])

  // Don't render if not supported
  if (!isSupported) {
    return (
      <Card className={`bg-red-900/20 border-red-500/30 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-400">
            <MicOff className="w-5 h-5" />
            <span>Audio recording is not supported in this browser</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`bg-background-secondary border-border-primary shadow-dark-lg ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-tomb45-green" />
          <span>Voice Recorder</span>
        </CardTitle>
        {sessionInfo && (
          <div className="text-sm text-text-secondary">
            {sessionInfo.session} - Day {sessionInfo.day}
            {sessionInfo.speaker && ` - ${sessionInfo.speaker}`}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-red-400">
              <MicOff className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Recording Status */}
        <RecordingStatus state={state} duration={duration} />

        {/* Audio Level Visualizer */}
        {showVisualizer && (
          <div className="flex justify-center">
            <AudioLevelVisualizer
              level={audioLevel}
              isActive={state === 'recording'}
            />
          </div>
        )}

        {/* Recording Controls */}
        <RecordingControls
          state={state}
          onStart={handleStartRecording}
          onPause={handlePauseRecording}
          onResume={handleResumeRecording}
          onStop={handleStopRecording}
          onClear={handleClearRecording}
          disabled={!!error}
        />

        {/* Recording Info */}
        {currentRecording && (
          <div className="bg-background-accent rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-text-primary">Recording Complete</h4>
              <Button
                onClick={handleDownloadRecording}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted">Duration:</span>
                <span className="ml-2 font-medium">
                  {formatDuration(currentRecording.totalDuration)}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Size:</span>
                <span className="ml-2 font-medium">
                  {formatFileSize(currentRecording.totalSize)}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Quality:</span>
                <span className="ml-2 font-medium capitalize">
                  {currentRecording.metadata.quality}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Chunks:</span>
                <span className="ml-2 font-medium">
                  {currentRecording.chunks.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Usage Tips */}
        <div className="text-xs text-text-muted space-y-1">
          <p>• Click "Start Recording" to begin capturing audio</p>
          <p>• Use "Pause" to temporarily stop recording</p>
          <p>• Recordings are automatically saved to your workbook</p>
          {sessionInfo && <p>• This recording will be tagged with session information</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export default VoiceRecorder