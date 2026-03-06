'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Separator } from '@/components/ui/Separator';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Save,
  MessageSquare,
  Headphones,
  Waveform,
  Volume2,
  FileText,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  Target,
  Calculator,
  Package,
  ClipboardList,
  Trophy,
  Download,
  Upload,
  Activity,
  Star,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Progress } from '@/components/ui/Progress';

// Import interactive components
import QuizEngine from './QuizEngine';
import GoalSettingWorksheet from './GoalSettingWorksheet';
import RevenuePricingCalculator from './RevenuePricingCalculator';
import ServicePackageDesigner from './ServicePackageDesigner';
import BusinessAssessmentTemplate from './BusinessAssessmentTemplate';

// Import progress tracking
import {
  progressTracker,
  ComponentProgress,
  ProgressUpdate,
  ACHIEVEMENTS
} from '@/lib/interactive-progress-tracker';

// Audio recording types
interface AudioNote {
  id: string;
  timestamp: string;
  duration: number;
  audioUrl?: string;
  transcription?: string;
  summary?: string;
  relatedContent: string;
  tags: string[];
  isTranscribing: boolean;
}

interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  audioLevel: number;
  duration: number;
  recordingId: string | null;
}

interface InteractiveSession {
  id: string;
  componentType: 'quiz' | 'worksheet' | 'calculator' | 'designer' | 'assessment';
  startTime: string;
  completionData?: any;
  audioNotes: AudioNote[];
  textNotes: string[];
  isCompleted: boolean;
}

interface InteractiveWorkbookWithAudioProps {
  /** Active interactive component type */
  activeComponent: 'quiz' | 'worksheet' | 'calculator' | 'designer' | 'assessment' | null;
  /** Session context for note organization */
  sessionContext?: {
    moduleId?: string;
    lessonId?: string;
    userId?: string;
  };
  /** Component-specific props */
  componentProps?: any;
  /** Callbacks */
  onComplete?: (sessionData: InteractiveSession) => void;
  onSave?: (sessionData: InteractiveSession) => void;
  onNoteCreated?: (note: AudioNote | string) => void;
  onClose?: () => void;
  /** Configuration */
  enableAudioNotes?: boolean;
  enableTextNotes?: boolean;
  autoSave?: boolean;
  readonly?: boolean;
}

export default function InteractiveWorkbookWithAudio({
  activeComponent,
  sessionContext,
  componentProps = {},
  onComplete,
  onSave,
  onNoteCreated,
  onClose,
  enableAudioNotes = true,
  enableTextNotes = true,
  autoSave = true,
  readonly = false,
}: InteractiveWorkbookWithAudioProps) {
  // Session state
  const [session, setSession] = useState<InteractiveSession>(() => ({
    id: Date.now().toString(),
    componentType: activeComponent || 'quiz',
    startTime: new Date().toISOString(),
    audioNotes: [],
    textNotes: [],
    isCompleted: false,
  }));

  // Audio recording state
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    audioLevel: 0,
    duration: 0,
    recordingId: null,
  });

  // UI state
  const [activeTab, setActiveTab] = useState('content');
  const [currentTextNote, setCurrentTextNote] = useState('');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [showNotePanel, setShowNotePanel] = useState(false);

  // Progress tracking state
  const [componentProgress, setComponentProgress] = useState<ComponentProgress | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<string[]>([]);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Component icons mapping
  const componentIcons = {
    quiz: Target,
    worksheet: Trophy,
    calculator: Calculator,
    designer: Package,
    assessment: ClipboardList,
  };

  const componentNames = {
    quiz: 'Knowledge Quiz',
    worksheet: 'Goal Setting Worksheet',
    calculator: 'Revenue Calculator',
    designer: 'Service Package Designer',
    assessment: 'Business Assessment',
  };

  // Initialize progress tracking when component is activated
  useEffect(() => {
    if (activeComponent && sessionContext?.userId) {
      const progress = progressTracker.startComponent(
        session.id,
        activeComponent,
        sessionContext.userId,
        {
          moduleId: sessionContext.moduleId,
          lessonId: sessionContext.lessonId,
          sessionId: session.id,
        }
      );
      setComponentProgress(progress);

      // Listen for progress changes
      const unsubscribe = progressTracker.addChangeListener((updatedProgress) => {
        if (updatedProgress.componentId === session.id) {
          setComponentProgress(updatedProgress);

          // Check for new achievements
          const newAchievements = updatedProgress.achievements.filter(
            achievement => !recentAchievements.includes(achievement)
          );
          if (newAchievements.length > 0) {
            setRecentAchievements(prev => [...prev, ...newAchievements]);
            // Show achievement notification (could be a toast in real app)
            setTimeout(() => {
              setRecentAchievements(prev =>
                prev.filter(a => !newAchievements.includes(a))
              );
            }, 5000);
          }
        }
      });

      return unsubscribe;
    }
  }, [activeComponent, sessionContext?.userId, session.id]);

  // Track time spent
  useEffect(() => {
    if (!componentProgress) return;

    const interval = setInterval(() => {
      progressTracker.updateProgress(session.id, {
        timeSpent: 1, // 1 second
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [componentProgress, session.id]);

  // Update progress when session changes
  useEffect(() => {
    if (componentProgress) {
      progressTracker.updateProgress(session.id, {
        interaction: 'session_update',
      });
    }
  }, [session, componentProgress]);

  // Initialize audio recording
  const initializeAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });

        await handleAudioRecordingComplete(audioBlob);
        audioChunksRef.current = [];
      };

      return true;
    } catch (error) {
      console.error('Failed to initialize audio recording:', error);
      return false;
    }
  }, []);

  // Start audio recording
  const startRecording = useCallback(async () => {
    if (!enableAudioNotes || readonly) return;

    const initialized = await initializeAudioRecording();
    if (!initialized || !mediaRecorderRef.current) return;

    const recordingId = Date.now().toString();

    setRecordingState(prev => ({
      ...prev,
      isRecording: true,
      recordingId,
      duration: 0,
    }));

    mediaRecorderRef.current.start(100); // Collect data every 100ms

    // Start duration timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingState(prev => ({
        ...prev,
        duration: prev.duration + 1,
      }));
    }, 1000);
  }, [enableAudioNotes, readonly, initializeAudioRecording]);

  // Stop audio recording
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !recordingState.isRecording) return;

    mediaRecorderRef.current.stop();

    // Stop all tracks
    mediaRecorderRef.current.stream?.getTracks().forEach(track => {
      track.stop();
    });

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    setRecordingState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
    }));
  }, [recordingState.isRecording]);

  // Handle audio recording completion
  const handleAudioRecordingComplete = useCallback(async (audioBlob: Blob) => {
    const audioNote: AudioNote = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      duration: recordingState.duration,
      relatedContent: activeComponent || 'unknown',
      tags: [activeComponent || 'general'],
      isTranscribing: true,
    };

    // Add to session
    setSession(prev => ({
      ...prev,
      audioNotes: [...prev.audioNotes, audioNote],
    }));

    setIsProcessingAudio(true);

    try {
      // Create audio URL for playback
      const audioUrl = URL.createObjectURL(audioBlob);

      // Mock transcription process (in real app, would call API)
      setTimeout(() => {
        const updatedNote: AudioNote = {
          ...audioNote,
          audioUrl,
          transcription: `Audio note recorded during ${componentNames[activeComponent || 'quiz']} session. Duration: ${Math.floor(recordingState.duration / 60)}:${(recordingState.duration % 60).toString().padStart(2, '0')}.`,
          summary: `User recorded insights while working on ${componentNames[activeComponent || 'quiz']}.`,
          isTranscribing: false,
        };

        setSession(prev => ({
          ...prev,
          audioNotes: prev.audioNotes.map(note =>
            note.id === audioNote.id ? updatedNote : note
          ),
        }));

        setIsProcessingAudio(false);
        onNoteCreated?.(updatedNote);
      }, 2000);

    } catch (error) {
      console.error('Failed to process audio recording:', error);
      setIsProcessingAudio(false);
    }
  }, [recordingState.duration, activeComponent, onNoteCreated]);

  // Add text note
  const addTextNote = useCallback(() => {
    if (!currentTextNote.trim() || readonly) return;

    const noteWithContext = `[${new Date().toLocaleTimeString()}] ${currentTextNote}`;

    setSession(prev => ({
      ...prev,
      textNotes: [...prev.textNotes, noteWithContext],
    }));

    // Track note in progress tracker
    if (componentProgress) {
      progressTracker.addNote(session.id, {
        type: 'text',
        content: currentTextNote,
      });
    }

    setCurrentTextNote('');
    onNoteCreated?.(noteWithContext);
  }, [currentTextNote, readonly, onNoteCreated, componentProgress, session.id]);

  // Handle component completion
  const handleComponentComplete = useCallback((completionData: any) => {
    const completedSession: InteractiveSession = {
      ...session,
      completionData,
      isCompleted: true,
    };

    setSession(completedSession);

    // Track completion in progress tracker
    if (componentProgress) {
      progressTracker.completeComponent(session.id, completionData);
    }

    onComplete?.(completedSession);
  }, [session, onComplete, componentProgress]);

  // Handle component save
  const handleComponentSave = useCallback((saveData: any) => {
    const updatedSession: InteractiveSession = {
      ...session,
      completionData: saveData,
    };

    setSession(updatedSession);

    // Track save action in progress tracker
    if (componentProgress) {
      progressTracker.updateProgress(session.id, {
        stepId: 'save_action',
        stepData: saveData,
        interaction: 'save',
      });
    }

    onSave?.(updatedSession);
  }, [session, onSave, componentProgress]);

  // Auto-save effect
  useEffect(() => {
    if (!autoSave) return;

    const autoSaveTimer = setInterval(() => {
      if (session.audioNotes.length > 0 || session.textNotes.length > 0) {
        onSave?.(session);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveTimer);
  }, [session, autoSave, onSave]);

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render the active interactive component
  const renderActiveComponent = () => {
    if (!activeComponent) return null;

    const commonProps = {
      onComplete: handleComponentComplete,
      onSave: handleComponentSave,
      readonly,
      ...componentProps,
    };

    switch (activeComponent) {
      case 'quiz':
        return <QuizEngine {...commonProps} />;
      case 'worksheet':
        return <GoalSettingWorksheet {...commonProps} />;
      case 'calculator':
        return <RevenuePricingCalculator {...commonProps} />;
      case 'designer':
        return <ServicePackageDesigner {...commonProps} />;
      case 'assessment':
        return <BusinessAssessmentTemplate {...commonProps} />;
      default:
        return null;
    }
  };

  if (!activeComponent) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Component Selected</h3>
          <p className="text-muted-foreground">
            Select an interactive component to begin your learning session.
          </p>
        </CardContent>
      </Card>
    );
  }

  const ComponentIcon = componentIcons[activeComponent];

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ComponentIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {componentNames[activeComponent]}
                  {session.isCompleted && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </CardTitle>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Session started: {new Date(session.startTime).toLocaleTimeString()}
                  </p>
                  {componentProgress && (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(componentProgress.metrics.timeSpent / 60)}m {componentProgress.metrics.timeSpent % 60}s
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {componentProgress.metrics.interactions} interactions
                        </span>
                      </div>
                      {componentProgress.metrics.score && (
                        <div className="flex items-center gap-2">
                          <Star className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {componentProgress.metrics.score}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(enableAudioNotes || enableTextNotes) && (
                <Button
                  onClick={() => setShowNotePanel(!showNotePanel)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Notes ({session.audioNotes.length + session.textNotes.length})
                </Button>
              )}
              {onClose && (
                <Button onClick={onClose} variant="ghost" size="sm">
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {componentProgress && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {Math.round(componentProgress.metrics.completionPercentage)}%
                </span>
              </div>
              <Progress value={componentProgress.metrics.completionPercentage} className="h-2" />

              {/* Achievements */}
              {componentProgress.achievements.length > 0 && (
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <div className="flex gap-1">
                    {componentProgress.achievements.slice(-3).map((achievement) => (
                      <Badge key={achievement} variant="secondary" className="text-xs">
                        {ACHIEVEMENTS[achievement as keyof typeof ACHIEVEMENTS]?.icon} {ACHIEVEMENTS[achievement as keyof typeof ACHIEVEMENTS]?.name}
                      </Badge>
                    ))}
                    {componentProgress.achievements.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{componentProgress.achievements.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Recent achievements notification */}
              {recentAchievements.length > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    🎉 Achievement unlocked: {recentAchievements.map(a => ACHIEVEMENTS[a as keyof typeof ACHIEVEMENTS]?.name).join(', ')}!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className={showNotePanel ? "lg:col-span-3" : "lg:col-span-4"}>
          <Card>
            <CardContent className="p-6">
              {renderActiveComponent()}
            </CardContent>
          </Card>
        </div>

        {/* Notes Panel */}
        {showNotePanel && (enableAudioNotes || enableTextNotes) && (
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Session Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    {enableAudioNotes && (
                      <TabsTrigger value="audio" className="flex items-center gap-1">
                        <Mic className="h-3 w-3" />
                        Audio
                      </TabsTrigger>
                    )}
                    {enableTextNotes && (
                      <TabsTrigger value="text" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Text
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Audio Notes Tab */}
                  {enableAudioNotes && (
                    <TabsContent value="audio" className="space-y-4">
                      {!readonly && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Voice Recording</Label>
                            {recordingState.isRecording && (
                              <Badge variant="destructive" className="animate-pulse">
                                <Mic className="h-3 w-3 mr-1" />
                                {formatDuration(recordingState.duration)}
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {!recordingState.isRecording ? (
                              <Button
                                onClick={startRecording}
                                size="sm"
                                className="flex items-center gap-2"
                                disabled={isProcessingAudio}
                              >
                                <Mic className="h-4 w-4" />
                                Record
                              </Button>
                            ) : (
                              <Button
                                onClick={stopRecording}
                                size="sm"
                                variant="destructive"
                                className="flex items-center gap-2"
                              >
                                <Square className="h-4 w-4" />
                                Stop
                              </Button>
                            )}
                          </div>

                          {isProcessingAudio && (
                            <Alert>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <AlertDescription>
                                Processing audio and generating transcription...
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}

                      <Separator />

                      {/* Audio Notes List */}
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {session.audioNotes.map((note) => (
                          <Card key={note.id} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{new Date(note.timestamp).toLocaleTimeString()}</span>
                                <span>{formatDuration(note.duration)}</span>
                              </div>

                              {note.isTranscribing ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Transcribing...
                                </div>
                              ) : (
                                <>
                                  {note.audioUrl && (
                                    <audio controls className="w-full h-8">
                                      <source src={note.audioUrl} type="audio/webm" />
                                    </audio>
                                  )}
                                  {note.transcription && (
                                    <p className="text-xs text-muted-foreground">
                                      {note.transcription}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </Card>
                        ))}

                        {session.audioNotes.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No audio notes yet
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  )}

                  {/* Text Notes Tab */}
                  {enableTextNotes && (
                    <TabsContent value="text" className="space-y-4">
                      {!readonly && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Quick Note</Label>
                          <Textarea
                            value={currentTextNote}
                            onChange={(e) => setCurrentTextNote(e.target.value)}
                            placeholder="Add a note about this section..."
                            rows={3}
                            className="text-sm"
                          />
                          <Button
                            onClick={addTextNote}
                            size="sm"
                            disabled={!currentTextNote.trim()}
                            className="w-full"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Add Note
                          </Button>
                        </div>
                      )}

                      <Separator />

                      {/* Text Notes List */}
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {session.textNotes.map((note, index) => (
                          <Card key={index} className="p-3">
                            <p className="text-sm">{note}</p>
                          </Card>
                        ))}

                        {session.textNotes.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No text notes yet
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}