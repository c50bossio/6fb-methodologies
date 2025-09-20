'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Mic,
  Upload,
  FileText,
  Settings,
  GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import VoiceRecorder from '@/components/workbook/VoiceRecorder';
import AudioFileUploader from '@/components/workbook/AudioFileUploader';
import WorkshopContent from '@/components/workbook/WorkshopContent';
import { AudioRecording } from '@/lib/audio-recording';
import { useWorkbookAuth } from '@/components/WorkbookAuthProvider';
import { WorkbookLogin } from '@/components/WorkbookLogin';

// Workshop session info
const SESSION_INFO = {
  day: 1 as const,
  session: 'Morning Session',
  speaker: 'Dre' as const,
};

function WorkbookContent() {
  const { session, isAuthenticated } = useWorkbookAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'workshop' | 'recorder' | 'uploader' | 'notes'
  >('overview');
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);

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

    // Update module progress if recording is associated with a module
    const moduleId = recording.metadata.sessionInfo?.moduleId;
    if (moduleId && userId) {
      try {
        await updateModuleProgress(moduleId, 25); // Add 25% progress for uploading a recording
      } catch (error) {
        console.error('Failed to update module progress:', error);
      }
    }
  };

  const handleError = (error: string) => {
    console.error('Audio error:', error);
    // In production, show user-friendly error message
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <WorkbookLogin />;
  }

  const userId = session?.userId || 'unknown';

  return (
    <div className='min-h-screen bg-background-primary'>
      <div className='bg-background-secondary shadow-dark-lg border-b border-border-primary'>
        <div className='max-w-6xl mx-auto px-6 py-8'>
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
                  Access the complete 6FB methodology workshop with interactive
                  modules, progress tracking, and comprehensive content.
                </p>
                <Button
                  onClick={() => setActiveTab('workshop')}
                  className='w-full bg-tomb45-green hover:bg-tomb45-green/90'
                >
                  Start Workshop
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
                6FB Workshop Modules
              </h2>
              <p className='text-text-secondary'>
                Complete the Six Figure Barber methodology workshop at your own
                pace. Your progress is automatically saved.
              </p>
            </div>

            <WorkshopContent userId={userId} />
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
            <VoiceRecorder
              userId={userId}
              sessionInfo={SESSION_INFO}
              autoSave={true}
              showVisualizer={true}
              onRecordingComplete={handleRecordingComplete}
              onError={handleError}
            />
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
            <AudioFileUploader
              userId={userId}
              sessionInfo={SESSION_INFO}
              maxFileSize={100 * 1024 * 1024} // 100MB
              onFileProcessed={handleFileProcessed}
              onError={handleError}
            />
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
                {/* Group recordings by module */}
                {Object.entries(
                  recordings.reduce(
                    (groups, recording) => {
                      const moduleId =
                        recording.metadata.sessionInfo?.moduleId || 'general';
                      const moduleName =
                        recording.metadata.sessionInfo?.moduleName ||
                        'General Recordings';

                      if (!groups[moduleId]) {
                        groups[moduleId] = { name: moduleName, recordings: [] };
                      }
                      groups[moduleId].recordings.push(recording);
                      return groups;
                    },
                    {} as Record<
                      string,
                      { name: string; recordings: AudioRecording[] }
                    >
                  )
                ).map(([moduleId, group]) => (
                  <div key={moduleId} className='space-y-4'>
                    <div className='flex items-center gap-2 pb-2 border-b border-border-primary'>
                      <GraduationCap className='w-5 h-5 text-tomb45-green' />
                      <h3 className='text-lg font-semibold text-text-primary'>
                        {group.name}
                      </h3>
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
    </div>
  );
}

export default function WorkbookPage() {
  return <WorkbookContent />;
}
