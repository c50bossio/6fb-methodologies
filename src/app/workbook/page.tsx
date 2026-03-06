'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Mic,
  Upload,
  FileText,
  Settings,
  GraduationCap,
  LogOut,
  User,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AudioRecording } from '@/lib/audio-recording';
import { useWorkbookAuth, WorkbookAuthProvider } from '@/components/WorkbookAuthProvider';
import { WorkbookLogin } from '@/components/WorkbookLogin';
import { WorkbookErrorBoundary, WorkbookComponentBoundary } from '@/components/workbook/WorkbookErrorBoundary';

// Direct imports for now to avoid chunk loading issues
import VoiceRecorder from '@/components/workbook/VoiceRecorder';
import AudioFileUploader from '@/components/workbook/AudioFileUploader';
import WorkshopAgenda from '@/components/workbook/WorkshopAgenda';
import QAWidget from '@/components/workbook/QAWidget';
import WorkshopSessionSelector from '@/components/workbook/WorkshopSessionSelector';
import { SimpleNoteTaker } from '@/components/workbook/SimpleNoteTaker';

// Workshop session info
const SESSION_INFO = {
  day: 1 as const,
  session: 'Morning Session',
  speaker: 'Dre' as const,
};

function WorkbookContent() {
  const { session, isAuthenticated, logout } = useWorkbookAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'workshop' | 'recorder' | 'uploader' | 'notes'
  >('overview');
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [isDevelopmentBypass, setIsDevelopmentBypass] = useState(false);
  const [currentSessionInfo, setCurrentSessionInfo] = useState({
    sessionId: 'systems-that-scale',
    sessionName: 'Systems That Scale',
    day: 1,
    speaker: 'Nate & Dre',
    sessionType: 'keynote'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [activeRecordingSession, setActiveRecordingSession] = useState<{
    sessionId: string;
    sessionName: string;
    presenter: string;
    description: string;
  } | null>(null);
  const [activeNoteSession, setActiveNoteSession] = useState<{
    sessionId: string;
    sessionName: string;
    presenter: string;
    description: string;
    objectives: string[];
  } | null>(null);

  useEffect(() => {
    // Set development bypass flag on client-side only
    setIsDevelopmentBypass(
      window.location.search.includes('dev=true') || process.env.NODE_ENV === 'development'
    );
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to home page after logout
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleExportPDF = async () => {
    if (!session?.userId) return;

    setIsExporting(true);
    try {
      const response = await fetch('/api/workbook/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include auth cookies
        body: JSON.stringify({
          format: 'pdf',
          includeNotes: true,
          includeTranscriptions: true,
          includeProgress: true,
          includeSessions: true,
          includeAudioMetadata: true,
        }),
      });

      if (response.ok) {
        // Get the PDF as a blob
        const pdfBlob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `6fb-workbook-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed:', response.status);
        alert('Export failed. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRecordingComplete = async (recording: AudioRecording) => {
    setRecordings(prev => [...prev, recording]);
    console.log('Recording completed:', recording);

    // Update module progress if recording is associated with a module
    const moduleId = recording.metadata.sessionInfo?.moduleId;
    if (moduleId && userId) {
      try {
        await updateModuleProgress(moduleId, 25); // Add 25% progress for creating a recording
      } catch (error) {
        console.error('Failed to update module progress:', error);
      }
    }
  };

  const updateModuleProgress = async (
    moduleId: string,
    progressIncrement: number
  ) => {
    try {
      // First, get current progress
      const response = await fetch(`/api/workbook/progress?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch current progress');

      const data = await response.json();
      const currentProgress = data.progress?.find(
        (p: any) => p.moduleId === moduleId
      );
      const newProgress = Math.min(
        100,
        (currentProgress?.progress || 0) + progressIncrement
      );

      // Update progress
      const updateResponse = await fetch('/api/workbook/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          moduleId,
          progress: newProgress,
          completed: newProgress >= 100,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update progress');
      }

      console.log(`Updated module ${moduleId} progress to ${newProgress}%`);
    } catch (error) {
      console.error('Error updating module progress:', error);
      throw error;
    }
  };

  const handleFileProcessed = async (recording: AudioRecording) => {
    setRecordings(prev => [...prev, recording]);
    console.log('File processed:', recording);

    // Update progress using session ID instead of module ID
    const sessionId = recording.metadata.sessionInfo?.sessionId;
    if (sessionId && userId) {
      try {
        await updateSessionProgress(sessionId, 25); // Add 25% progress for uploading a recording
      } catch (error) {
        console.error('Failed to update session progress:', error);
      }
    }
  };

  const handleSessionChange = (sessionId: string, sessionInfo: any) => {
    setCurrentSessionInfo(sessionInfo);
  };

  const updateSessionProgress = async (sessionId: string, progressIncrement: number) => {
    try {
      // For now, log progress - in production this would update session-based progress
      console.log(`Updated session ${sessionId} progress by ${progressIncrement}%`);
    } catch (error) {
      console.error('Error updating session progress:', error);
    }
  };

  const handleError = (error: string) => {
    console.error('Audio error:', error);
    // In production, show user-friendly error message
  };

  // Development bypass is now handled in useEffect to avoid hydration issues

  // Show login form if not authenticated (unless development bypass is active)
  if (!isAuthenticated && !isDevelopmentBypass) {
    return <WorkbookLogin />;
  }

  const userId = session?.userId || 'unknown';

  return (
    <div className='min-h-screen bg-background-primary'>
      <div className='bg-background-secondary shadow-dark-lg border-b border-border-primary'>
        <div className='max-w-6xl mx-auto px-6 py-8'>
          {/* User Info and Logout */}
          <div className='flex justify-between items-center mb-8'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-tomb45-green/20 rounded-full'>
                <User className='w-5 h-5 text-tomb45-green' />
              </div>
              <div>
                <p className='text-sm text-text-secondary'>Welcome back,</p>
                <p className='font-semibold text-text-primary'>
                  {session?.email || 'Workshop User'}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                onClick={handleExportPDF}
                variant='outline'
                size='sm'
                disabled={isExporting}
                className='flex items-center gap-2 hover:bg-tomb45-green/10 hover:border-tomb45-green hover:text-tomb45-green'
              >
                <Download className='w-4 h-4' />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
              <Button
                onClick={handleLogout}
                variant='outline'
                size='sm'
                className='flex items-center gap-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
              >
                <LogOut className='w-4 h-4' />
                Logout
              </Button>
            </div>
          </div>

          <div className='text-center'>
            <BookOpen className='w-16 h-16 text-tomb45-green mx-auto mb-4' />
            <h1 className='text-3xl font-bold text-text-primary mb-2'>
              6FB Workshop Workbook
            </h1>
            <p className='text-text-secondary mb-6'>
              Interactive workshop exercises and audio tools
            </p>
          </div>

          {/* Navigation Tabs */}
          <nav
            className='flex justify-center space-x-4'
            role='tablist'
            aria-label='Workbook sections'
          >
            <Button
              onClick={() => setActiveTab('overview')}
              variant={activeTab === 'overview' ? 'primary' : 'outline'}
              className='flex items-center space-x-2 focus-ring'
              role='tab'
              aria-selected={activeTab === 'overview'}
              aria-controls='overview-panel'
            >
              <BookOpen className='w-4 h-4' />
              <span>Overview</span>
            </Button>
            <Button
              onClick={() => setActiveTab('workshop')}
              variant={activeTab === 'workshop' ? 'primary' : 'outline'}
              className='flex items-center space-x-2 focus-ring'
              role='tab'
              aria-selected={activeTab === 'workshop'}
              aria-controls='workshop-panel'
            >
              <GraduationCap className='w-4 h-4' />
              <span>Workshop</span>
            </Button>
            <Button
              onClick={() => setActiveTab('recorder')}
              variant={activeTab === 'recorder' ? 'primary' : 'outline'}
              className='flex items-center space-x-2 focus-ring'
              role='tab'
              aria-selected={activeTab === 'recorder'}
              aria-controls='recorder-panel'
            >
              <Mic className='w-4 h-4' />
              <span>Voice Recorder</span>
            </Button>
            <Button
              onClick={() => setActiveTab('uploader')}
              variant={activeTab === 'uploader' ? 'primary' : 'outline'}
              className='flex items-center space-x-2 focus-ring'
              role='tab'
              aria-selected={activeTab === 'uploader'}
              aria-controls='uploader-panel'
            >
              <Upload className='w-4 h-4' />
              <span>File Upload</span>
            </Button>
            <Button
              onClick={() => setActiveTab('notes')}
              variant={activeTab === 'notes' ? 'primary' : 'outline'}
              className='flex items-center space-x-2 focus-ring'
              role='tab'
              aria-selected={activeTab === 'notes'}
              aria-controls='notes-panel'
            >
              <FileText className='w-4 h-4' />
              <span>Notes ({recordings.length})</span>
            </Button>
          </nav>
        </div>
      </div>

      <main className='max-w-6xl mx-auto p-6'>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <section
            id='overview-panel'
            role='tabpanel'
            aria-labelledby='overview-tab'
            className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
          >
            <Card className='bg-background-secondary border-border-primary'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <GraduationCap className='w-5 h-5 text-tomb45-green' />
                  Workshop Modules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-text-secondary text-sm mb-4'>
                  Follow today's live workshop agenda with real-time session tracking, note-taking, and audio recording capabilities.
                </p>
                <Button
                  onClick={() => setActiveTab('workshop')}
                  className='w-full bg-tomb45-green hover:bg-tomb45-green/90'
                >
                  View Agenda
                </Button>
              </CardContent>
            </Card>

            <Card className='bg-background-secondary border-border-primary'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Mic className='w-5 h-5 text-tomb45-green' />
                  Voice Recording
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-text-secondary text-sm mb-4'>
                  Record audio directly in your browser. Perfect for capturing
                  thoughts, session notes, and reflections during the workshop.
                </p>
                <Button
                  onClick={() => setActiveTab('recorder')}
                  className='w-full bg-tomb45-green hover:bg-tomb45-green/90'
                >
                  Start Recording
                </Button>
              </CardContent>
            </Card>

            <Card className='bg-background-secondary border-border-primary'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Upload className='w-5 h-5 text-tomb45-green' />
                  File Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-text-secondary text-sm mb-4'>
                  Upload pre-recorded audio files from your device. Supports
                  MP3, WAV, and other common audio formats.
                </p>
                <Button
                  onClick={() => setActiveTab('uploader')}
                  className='w-full bg-tomb45-green hover:bg-tomb45-green/90'
                >
                  Upload File
                </Button>
              </CardContent>
            </Card>

            <Card className='bg-background-secondary border-border-primary'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <FileText className='w-5 h-5 text-tomb45-green' />
                  Session Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-text-secondary text-sm mb-4'>
                  View and manage your recorded audio files and notes.
                  {recordings.length > 0 &&
                    ` You have ${recordings.length} recording${recordings.length !== 1 ? 's' : ''}.`}
                </p>
                <Button
                  onClick={() => setActiveTab('notes')}
                  className='w-full bg-tomb45-green hover:bg-tomb45-green/90'
                >
                  View Notes
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Workshop Tab */}
        {activeTab === 'workshop' && (
          <section
            id='workshop-panel'
            role='tabpanel'
            aria-labelledby='workshop-tab'
            className='max-w-4xl mx-auto'
          >
            <div className='mb-6'>
              <h2 className='text-2xl font-bold text-text-primary mb-2'>
                6FB Workshop Agenda
              </h2>
              <p className='text-text-secondary'>
                Follow along with today's workshop sessions. Take notes and record audio during live presentations.
              </p>
            </div>

            <WorkbookComponentBoundary componentName="Workshop Agenda">
              <WorkshopAgenda
                userId={userId}
                businessType={session?.role === 'vip' ? 'enterprise' : session?.role === 'premium' ? 'shop' : 'barber'}
                onStartRecording={(session) => {
                  console.log('Starting recording for session:', session.title);
                  setActiveRecordingSession({
                    sessionId: session.id,
                    sessionName: session.title,
                    presenter: session.presenter || 'Workshop Team',
                    description: session.description
                  });
                }}
                onTakeNotes={(session) => {
                  console.log('Opening notes for session:', session.title);
                  setActiveNoteSession({
                    sessionId: session.id,
                    sessionName: session.title,
                    presenter: session.presenter || 'Workshop Team',
                    description: session.description,
                    objectives: session.objectives
                  });
                }}
              />
            </WorkbookComponentBoundary>
          </section>
        )}

        {/* Voice Recorder Tab */}
        {activeTab === 'recorder' && (
          <section
            id='recorder-panel'
            role='tabpanel'
            aria-labelledby='recorder-tab'
            className='max-w-4xl mx-auto'
          >
            <div className='mb-6'>
              <h2 className='text-2xl font-bold text-text-primary mb-2'>
                Voice Recorder
              </h2>
              <p className='text-text-secondary'>
                Record audio directly in your browser. Click "Start Recording"
                when you're ready to begin.
              </p>
            </div>
            <WorkbookComponentBoundary componentName="Voice Recorder">
              {/* Session Selector for Recording */}
              <div className="mb-6">
                <WorkshopSessionSelector
                  selectedSessionId={currentSessionInfo.sessionId}
                  onSessionChange={handleSessionChange}
                  compact={true}
                />
              </div>

              <VoiceRecorder
                userId={userId}
                sessionInfo={currentSessionInfo}
                autoSave={true}
                showVisualizer={true}
                onRecordingComplete={handleRecordingComplete}
                onError={handleError}
              />
            </WorkbookComponentBoundary>
          </section>
        )}

        {/* File Uploader Tab */}
        {activeTab === 'uploader' && (
          <section
            id='uploader-panel'
            role='tabpanel'
            aria-labelledby='uploader-tab'
            className='max-w-4xl mx-auto'
          >
            <div className='mb-6'>
              <h2 className='text-2xl font-bold text-text-primary mb-2'>
                Audio File Upload
              </h2>
              <p className='text-text-secondary'>
                Upload audio files from your device to add them to your workbook
                notes.
              </p>
            </div>
            <WorkbookComponentBoundary componentName="Audio File Uploader">
              {/* Session Selector for Upload */}
              <div className="mb-6">
                <WorkshopSessionSelector
                  selectedSessionId={currentSessionInfo.sessionId}
                  onSessionChange={handleSessionChange}
                  compact={true}
                />
              </div>

              <AudioFileUploader
                userId={userId}
                sessionInfo={currentSessionInfo}
                maxFileSize={100 * 1024 * 1024} // 100MB
                onFileProcessed={handleFileProcessed}
                onError={handleError}
              />
            </WorkbookComponentBoundary>
          </section>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <section
            id='notes-panel'
            role='tabpanel'
            aria-labelledby='notes-tab'
            className='max-w-4xl mx-auto'
          >
            <div className='mb-6'>
              <h2 className='text-2xl font-bold text-text-primary mb-2'>
                Session Notes
              </h2>
              <p className='text-text-secondary'>
                Your recorded audio files and notes from the workshop sessions.
              </p>
            </div>

            {recordings.length === 0 ? (
              <Card className='bg-background-secondary border-border-primary'>
                <CardContent className='p-8 text-center'>
                  <FileText className='w-16 h-16 text-text-muted mx-auto mb-4' />
                  <h3 className='text-lg font-medium text-text-primary mb-2'>
                    No recordings yet
                  </h3>
                  <p className='text-text-secondary mb-4'>
                    Start recording or upload audio files to see them here.
                  </p>
                  <div className='flex justify-center space-x-4'>
                    <Button
                      onClick={() => setActiveTab('recorder')}
                      className='bg-tomb45-green hover:bg-tomb45-green/90'
                    >
                      <Mic className='w-4 h-4 mr-2' />
                      Start Recording
                    </Button>
                    <Button
                      onClick={() => setActiveTab('uploader')}
                      variant='outline'
                    >
                      <Upload className='w-4 h-4 mr-2' />
                      Upload File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className='space-y-6'>
                {/* Group recordings by workshop session */}
                {Object.entries(
                  recordings.reduce(
                    (groups, recording) => {
                      const sessionId =
                        recording.metadata.sessionInfo?.sessionId || 'general';
                      const sessionName =
                        recording.metadata.sessionInfo?.sessionName ||
                        'General Recordings';
                      const day = recording.metadata.sessionInfo?.day || 0;
                      const speaker = recording.metadata.sessionInfo?.speaker || '';

                      if (!groups[sessionId]) {
                        groups[sessionId] = {
                          name: sessionName,
                          day: day,
                          speaker: speaker,
                          recordings: []
                        };
                      }
                      groups[sessionId].recordings.push(recording);
                      return groups;
                    },
                    {} as Record<
                      string,
                      { name: string; day: number; speaker: string; recordings: AudioRecording[] }
                    >
                  )
                ).map(([sessionId, group]) => (
                  <div key={sessionId} className='space-y-4'>
                    <div className='flex items-center gap-2 pb-2 border-b border-border-primary'>
                      <GraduationCap className='w-5 h-5 text-tomb45-green' />
                      <div className='flex-1'>
                        <h3 className='text-lg font-semibold text-text-primary'>
                          {group.name}
                        </h3>
                        {group.day > 0 && (
                          <div className='flex items-center gap-2 text-sm text-text-secondary'>
                            <span>Day {group.day}</span>
                            {group.speaker && (
                              <>
                                <span>•</span>
                                <span>{group.speaker}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <span className='text-sm text-text-secondary'>
                        ({group.recordings.length} recording
                        {group.recordings.length !== 1 ? 's' : ''})
                      </span>
                    </div>

                    <div className='space-y-3'>
                      {group.recordings.map(recording => (
                        <Card
                          key={recording.id}
                          className='bg-background-secondary border-border-primary'
                        >
                          <CardHeader className='pb-3'>
                            <CardTitle className='flex items-center justify-between'>
                              <div className='flex items-center space-x-2'>
                                <Mic className='w-4 h-4 text-tomb45-green' />
                                <span className='text-sm'>
                                  Recording {recording.id.slice(-8)}
                                </span>
                              </div>
                              <span className='text-xs text-text-secondary'>
                                {recording.startTime.toLocaleDateString()}{' '}
                                {recording.startTime.toLocaleTimeString()}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className='pt-0'>
                            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                              <div>
                                <span className='text-text-secondary'>
                                  Duration:
                                </span>
                                <div className='font-medium'>
                                  {Math.round(recording.totalDuration / 60)}:
                                  {(recording.totalDuration % 60)
                                    .toFixed(0)
                                    .padStart(2, '0')}
                                </div>
                              </div>
                              <div>
                                <span className='text-text-secondary'>
                                  Size:
                                </span>
                                <div className='font-medium'>
                                  {(recording.totalSize / 1024 / 1024).toFixed(
                                    1
                                  )}{' '}
                                  MB
                                </div>
                              </div>
                              <div>
                                <span className='text-text-secondary'>
                                  Quality:
                                </span>
                                <div className='font-medium capitalize'>
                                  {recording.metadata.quality}
                                </div>
                              </div>
                              <div>
                                <span className='text-text-secondary'>
                                  Session:
                                </span>
                                <div className='font-medium'>
                                  {recording.metadata.sessionInfo?.session ||
                                    'Unknown'}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Session-Specific Recording Modal */}
      {activeRecordingSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background-secondary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border-primary">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  Record: {activeRecordingSession.sessionName}
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  Presenter: {activeRecordingSession.presenter}
                </p>
              </div>
              <Button
                onClick={() => setActiveRecordingSession(null)}
                variant="ghost"
                size="sm"
              >
                ✕
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="mb-4 p-4 bg-background-accent rounded-lg border border-border-primary">
                <p className="text-text-secondary text-sm">
                  {activeRecordingSession.description}
                </p>
              </div>

              <WorkbookComponentBoundary componentName="Session Voice Recorder">
                <VoiceRecorder
                  userId={userId}
                  sessionInfo={{
                    sessionId: activeRecordingSession.sessionId,
                    sessionName: activeRecordingSession.sessionName,
                    day: 1,
                    speaker: activeRecordingSession.presenter,
                    sessionType: 'workshop'
                  }}
                  autoSave={true}
                  showVisualizer={true}
                  onRecordingComplete={handleRecordingComplete}
                  onError={handleError}
                />
              </WorkbookComponentBoundary>
            </div>
          </div>
        </div>
      )}

      {/* Session-Specific Notes Modal */}
      {activeNoteSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background-secondary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border-primary">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  Notes: {activeNoteSession.sessionName}
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  Presenter: {activeNoteSession.presenter}
                </p>
              </div>
              <Button
                onClick={() => setActiveNoteSession(null)}
                variant="ghost"
                size="sm"
              >
                ✕
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="mb-4 p-4 bg-background-accent rounded-lg border border-border-primary">
                <h3 className="font-semibold text-text-primary mb-2">Session Overview:</h3>
                <p className="text-text-secondary text-sm mb-3">
                  {activeNoteSession.description}
                </p>

                {activeNoteSession.objectives.length > 0 && (
                  <div>
                    <h4 className="font-medium text-text-primary mb-2">Key Learning Objectives:</h4>
                    <ul className="text-text-secondary text-sm space-y-1">
                      {activeNoteSession.objectives.map((objective, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-tomb45-green">•</span>
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <WorkbookComponentBoundary componentName="Session Note Taker">
                <SimpleNoteTaker
                  sessionId={activeNoteSession.sessionId}
                  sessionTitle={activeNoteSession.sessionName}
                />
              </WorkbookComponentBoundary>
            </div>
          </div>
        </div>
      )}

      {/* Q&A Widget - Available across all tabs */}
      <QAWidget
        userId={userId}
        userName={session?.name || 'Workshop User'}
        userEmail={session?.email || ''}
      />
    </div>
  );
}

export default function WorkbookPage() {
  return (
    <WorkbookErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Workbook Page Error:', error, errorInfo);
        // Report to error monitoring service if needed
      }}
    >
      <WorkbookAuthProvider>
        <WorkbookContent />
      </WorkbookAuthProvider>
    </WorkbookErrorBoundary>
  );
}
