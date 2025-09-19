'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, File, X, Play, Pause, AlertCircle, CheckCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  AudioRecording,
  AudioChunk,
  formatDuration,
  formatFileSize
} from '@/lib/audio-recording'

// Component Props
interface AudioFileUploaderProps {
  userId: string
  sessionInfo?: {
    day: 1 | 2
    session: string
    speaker?: string
  }
  maxFileSize?: number // bytes
  acceptedFormats?: string[]
  className?: string
  onFileProcessed?: (recording: AudioRecording) => void
  onError?: (error: string) => void
}

// Audio File Info
interface AudioFileInfo {
  file: File
  duration: number
  size: number
  type: string
  url: string
}

// Upload Status
type UploadStatus = 'idle' | 'processing' | 'complete' | 'error'

// Audio Preview Component
const AudioPreview: React.FC<{
  fileInfo: AudioFileInfo
  onRemove: () => void
}> = ({ fileInfo, onRemove }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const progress = fileInfo.duration > 0 ? (currentTime / fileInfo.duration) * 100 : 0

  return (
    <div className="bg-background-accent rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <File className="w-5 h-5 text-text-muted" />
          <div>
            <h4 className="font-medium text-text-primary truncate max-w-48">
              {fileInfo.file.name}
            </h4>
            <p className="text-sm text-text-muted">
              {formatFileSize(fileInfo.size)} • {formatDuration(fileInfo.duration)}
            </p>
          </div>
        </div>
        <Button
          onClick={onRemove}
          variant="outline"
          size="sm"
          className="text-text-muted hover:text-red-400"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Audio Controls */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Button
            onClick={handlePlayPause}
            size="sm"
            className="bg-tomb45-green hover:bg-tomb45-green/90"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <div className="flex-1">
            <div className="w-full bg-border-primary rounded-full h-2">
              <div
                className="bg-tomb45-green h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-text-muted min-w-fit">
            {formatDuration(currentTime)} / {formatDuration(fileInfo.duration)}
          </span>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={fileInfo.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
      />
    </div>
  )
}

// Upload Status Component
const UploadStatusIndicator: React.FC<{
  status: UploadStatus
  error?: string
}> = ({ status, error }) => {
  switch (status) {
    case 'processing':
      return (
        <div className="flex items-center space-x-2 text-info">
          <div className="animate-spin w-4 h-4 border-2 border-info border-t-transparent rounded-full" />
          <span>Processing audio file...</span>
        </div>
      )
    case 'complete':
      return (
        <div className="flex items-center space-x-2 text-success">
          <CheckCircle className="w-4 h-4" />
          <span>Audio file processed successfully</span>
        </div>
      )
    case 'error':
      return (
        <div className="flex items-center space-x-2 text-error">
          <AlertCircle className="w-4 h-4" />
          <span>{error || 'Failed to process audio file'}</span>
        </div>
      )
    default:
      return null
  }
}

// Main AudioFileUploader Component
export const AudioFileUploader: React.FC<AudioFileUploaderProps> = ({
  userId,
  sessionInfo,
  maxFileSize = 100 * 1024 * 1024, // 100MB default
  acceptedFormats = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a'],
  className = '',
  onFileProcessed,
  onError
}) => {
  // State
  const [fileInfo, setFileInfo] = useState<AudioFileInfo | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`
    }

    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return `File type ${file.type} is not supported. Accepted formats: ${acceptedFormats.join(', ')}`
    }

    return null
  }

  // Get audio duration
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      const url = URL.createObjectURL(file)

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(audio.duration)
      }

      audio.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load audio metadata'))
      }

      audio.src = url
    })
  }

  // Process uploaded file
  const processFile = useCallback(async (file: File) => {
    try {
      setUploadStatus('processing')
      setError(null)

      // Validate file
      const validationError = validateFile(file)
      if (validationError) {
        throw new Error(validationError)
      }

      // Get audio duration
      const duration = await getAudioDuration(file)
      const url = URL.createObjectURL(file)

      // Create file info
      const info: AudioFileInfo = {
        file,
        duration,
        size: file.size,
        type: file.type,
        url
      }

      setFileInfo(info)

      // Convert file to audio recording format
      const recording = await convertFileToRecording(file, duration, info)

      setUploadStatus('complete')
      onFileProcessed?.(recording)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file'
      setError(errorMessage)
      setUploadStatus('error')
      onError?.(errorMessage)
    }
  }, [maxFileSize, acceptedFormats, onFileProcessed, onError])

  // Convert file to AudioRecording format
  const convertFileToRecording = async (
    file: File,
    duration: number,
    info: AudioFileInfo
  ): Promise<AudioRecording> => {
    // Create a single chunk from the entire file
    const chunk: AudioChunk = {
      id: `chunk_${Date.now()}_0`,
      blob: file,
      timestamp: new Date(),
      duration: duration,
      sequenceNumber: 0,
      size: file.size,
      mimeType: file.type
    }

    // Create recording object
    const recording: AudioRecording = {
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      chunks: [chunk],
      totalDuration: duration,
      totalSize: file.size,
      startTime: new Date(),
      endTime: new Date(),
      metadata: {
        quality: 'high', // Assume uploaded files are high quality
        sampleRate: 44100, // Default, actual value unknown
        channels: 2, // Default, actual value unknown
        mimeType: file.type,
        sessionInfo
      }
    }

    return recording
  }

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    processFile(file)
  }, [processFile])

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  // Handle remove file
  const handleRemoveFile = () => {
    if (fileInfo?.url) {
      URL.revokeObjectURL(fileInfo.url)
    }
    setFileInfo(null)
    setUploadStatus('idle')
    setError(null)
  }

  // Handle click to upload
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Handle download processed file
  const handleDownload = () => {
    if (!fileInfo) return

    const link = document.createElement('a')
    link.href = fileInfo.url
    link.download = fileInfo.file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className={`bg-background-secondary border-border-primary shadow-dark-lg ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5 text-tomb45-green" />
          <span>Audio File Upload</span>
        </CardTitle>
        {sessionInfo && (
          <div className="text-sm text-text-secondary">
            {sessionInfo.session} - Day {sessionInfo.day}
            {sessionInfo.speaker && ` - ${sessionInfo.speaker}`}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Upload Status */}
        {uploadStatus !== 'idle' && (
          <UploadStatusIndicator status={uploadStatus} error={error || undefined} />
        )}

        {/* File Preview */}
        {fileInfo && uploadStatus === 'complete' && (
          <AudioPreview
            fileInfo={fileInfo}
            onRemove={handleRemoveFile}
          />
        )}

        {/* Upload Area */}
        {!fileInfo && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-tomb45-green bg-tomb45-green/10'
                : 'border-border-primary hover:border-border-secondary'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Upload Audio File
            </h3>
            <p className="text-text-secondary mb-4">
              Drag and drop an audio file here, or click to browse
            </p>
            <Button
              onClick={handleUploadClick}
              className="bg-tomb45-green hover:bg-tomb45-green/90"
            >
              Choose File
            </Button>
            <p className="text-xs text-text-muted mt-2">
              Supported formats: MP3, WAV, OGG, WebM, M4A
              <br />
              Maximum size: {formatFileSize(maxFileSize)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {fileInfo && uploadStatus === 'complete' && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleDownload}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handleUploadClick}
              className="bg-tomb45-green hover:bg-tomb45-green/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Another
            </Button>
          </div>
        )}

        {/* Usage Tips */}
        <div className="text-xs text-text-muted space-y-1">
          <p>• Upload pre-recorded audio files to add to your workbook</p>
          <p>• Files will be processed and tagged with session information</p>
          <p>• Supported formats provide the best compatibility</p>
          {sessionInfo && <p>• Uploads will be tagged with current session info</p>}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}

export default AudioFileUploader