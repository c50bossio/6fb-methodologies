/**
 * Transcription Service
 * Single responsibility: Handle audio transcription with provider fallbacks
 */

import {
  ITranscriptionService,
  TranscriptionConfig,
  TranscriptionResult,
  TranscriptionProvider,
  ServiceResult,
  ServiceDependencies,
  TranscriptionSegment,
  SpeakerInfo,
} from './interfaces';

interface ProviderConfig {
  apiKey: string;
  endpoint?: string;
  model?: string;
  maxFileSize?: number;
  supportedFormats?: string[];
}

interface ProviderConfigs {
  openai: ProviderConfig;
  azure: ProviderConfig;
  google: ProviderConfig;
  local: ProviderConfig;
}

export class TranscriptionService implements ITranscriptionService {
  private config: TranscriptionConfig;
  private dependencies: ServiceDependencies;
  private transcriptions: Map<string, TranscriptionResult> = new Map();
  private providerConfigs: Partial<ProviderConfigs> = {};
  private providerStatus: Record<TranscriptionProvider, boolean> = {
    openai: false,
    azure: false,
    google: false,
    local: false,
  };

  constructor(
    config: Partial<TranscriptionConfig> = {},
    dependencies: ServiceDependencies = {},
    providerConfigs: Partial<ProviderConfigs> = {}
  ) {
    this.config = {
      provider: 'openai',
      fallbackProviders: ['azure', 'google'],
      language: 'en-US',
      enableSpeakerIdentification: false,
      enablePunctuation: true,
      enableProfanityFilter: false,
      retryAttempts: 3,
      timeout: 30000,
      enableLogging: true,
      ...config,
    };
    this.dependencies = dependencies;
    this.providerConfigs = providerConfigs;
    this.initializeProviders();
  }

  async transcribeAudio(
    audioBlob: Blob,
    config?: Partial<TranscriptionConfig>
  ): Promise<ServiceResult<TranscriptionResult>> {
    const transcriptionConfig = { ...this.config, ...config };

    try {
      // Validate audio blob
      const validation = this.validateAudioBlob(audioBlob);
      if (!validation.success) {
        return validation;
      }

      // Try primary provider first
      let result = await this.transcribeWithProvider(
        audioBlob,
        transcriptionConfig.provider,
        transcriptionConfig
      );

      // Try fallback providers if primary fails
      if (!result.success && transcriptionConfig.fallbackProviders.length > 0) {
        for (const fallbackProvider of transcriptionConfig.fallbackProviders) {
          if (this.providerStatus[fallbackProvider]) {
            this.log(`Trying fallback provider: ${fallbackProvider}`, 'warn');
            result = await this.transcribeWithProvider(
              audioBlob,
              fallbackProvider,
              transcriptionConfig
            );
            if (result.success) break;
          }
        }
      }

      if (result.success) {
        // Store transcription
        this.transcriptions.set(result.data.id, result.data);
        this.log(
          `Transcription completed with ${result.data.provider}`,
          'info'
        );
      }

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Transcription failed';
      this.log(`Transcription error: ${message}`, 'error');
      return { success: false, error: message, code: 'TRANSCRIPTION_FAILED' };
    }
  }

  async transcribeRecording(
    recordingId: string,
    config?: Partial<TranscriptionConfig>
  ): Promise<ServiceResult<TranscriptionResult>> {
    try {
      // In a real implementation, you would retrieve the recording from AudioRecordingService
      // For now, return an error indicating the integration point
      return {
        success: false,
        error:
          'Recording retrieval not implemented - requires AudioRecordingService integration',
        code: 'INTEGRATION_REQUIRED',
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Recording transcription failed';
      this.log(`Recording transcription error: ${message}`, 'error');
      return {
        success: false,
        error: message,
        code: 'RECORDING_TRANSCRIPTION_FAILED',
      };
    }
  }

  async getTranscription(
    id: string
  ): Promise<ServiceResult<TranscriptionResult>> {
    const transcription = this.transcriptions.get(id);
    if (!transcription) {
      return {
        success: false,
        error: 'Transcription not found',
        code: 'NOT_FOUND',
      };
    }
    return { success: true, data: transcription };
  }

  async deleteTranscription(id: string): Promise<ServiceResult<void>> {
    if (!this.transcriptions.has(id)) {
      return {
        success: false,
        error: 'Transcription not found',
        code: 'NOT_FOUND',
      };
    }

    this.transcriptions.delete(id);
    this.log(`Transcription deleted: ${id}`, 'info');
    return { success: true, data: undefined };
  }

  async getProviderStatus(): Promise<
    ServiceResult<Record<TranscriptionProvider, boolean>>
  > {
    // Update provider status by checking health endpoints
    await this.checkProviderHealth();
    return { success: true, data: { ...this.providerStatus } };
  }

  // ==================== PRIVATE METHODS ====================

  private async initializeProviders(): Promise<void> {
    // Initialize each configured provider
    for (const [provider, config] of Object.entries(this.providerConfigs)) {
      if (config && config.apiKey) {
        this.providerStatus[provider as TranscriptionProvider] = true;
        this.log(`Provider ${provider} initialized`, 'info');
      }
    }
  }

  private validateAudioBlob(audioBlob: Blob): ServiceResult<void> {
    if (!audioBlob || audioBlob.size === 0) {
      return {
        success: false,
        error: 'Invalid audio blob',
        code: 'INVALID_AUDIO',
      };
    }

    // Check file size (25MB limit for most providers)
    const maxSize = 25 * 1024 * 1024;
    if (audioBlob.size > maxSize) {
      return {
        success: false,
        error: 'Audio file too large',
        code: 'FILE_TOO_LARGE',
      };
    }

    // Check MIME type
    const supportedTypes = [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mp4',
      'audio/mpeg',
    ];
    if (!supportedTypes.some(type => audioBlob.type.includes(type))) {
      return {
        success: false,
        error: 'Unsupported audio format',
        code: 'UNSUPPORTED_FORMAT',
      };
    }

    return { success: true, data: undefined };
  }

  private async transcribeWithProvider(
    audioBlob: Blob,
    provider: TranscriptionProvider,
    config: TranscriptionConfig
  ): Promise<ServiceResult<TranscriptionResult>> {
    try {
      switch (provider) {
        case 'openai':
          return await this.transcribeWithOpenAI(audioBlob, config);
        case 'azure':
          return await this.transcribeWithAzure(audioBlob, config);
        case 'google':
          return await this.transcribeWithGoogle(audioBlob, config);
        case 'local':
          return await this.transcribeWithLocal(audioBlob, config);
        default:
          return {
            success: false,
            error: `Unknown provider: ${provider}`,
            code: 'UNKNOWN_PROVIDER',
          };
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Provider transcription failed';
      this.log(`Provider ${provider} failed: ${message}`, 'error');
      return { success: false, error: message, code: 'PROVIDER_FAILED' };
    }
  }

  private async transcribeWithOpenAI(
    audioBlob: Blob,
    config: TranscriptionConfig
  ): Promise<ServiceResult<TranscriptionResult>> {
    const providerConfig = this.providerConfigs.openai;
    if (!providerConfig?.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
        code: 'CONFIG_MISSING',
      };
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', providerConfig.model || 'whisper-1');
      formData.append('language', config.language || 'en');

      if (config.enableSpeakerIdentification) {
        formData.append('response_format', 'verbose_json');
      }

      const response = await fetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${providerConfig.apiKey}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        success: true,
        data: this.formatOpenAIResponse(data, config),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'OpenAI transcription failed';
      return { success: false, error: message, code: 'OPENAI_FAILED' };
    }
  }

  private async transcribeWithAzure(
    audioBlob: Blob,
    config: TranscriptionConfig
  ): Promise<ServiceResult<TranscriptionResult>> {
    // Placeholder for Azure Speech Service implementation
    return {
      success: false,
      error: 'Azure transcription not implemented',
      code: 'NOT_IMPLEMENTED',
    };
  }

  private async transcribeWithGoogle(
    audioBlob: Blob,
    config: TranscriptionConfig
  ): Promise<ServiceResult<TranscriptionResult>> {
    // Placeholder for Google Cloud Speech-to-Text implementation
    return {
      success: false,
      error: 'Google transcription not implemented',
      code: 'NOT_IMPLEMENTED',
    };
  }

  private async transcribeWithLocal(
    audioBlob: Blob,
    config: TranscriptionConfig
  ): Promise<ServiceResult<TranscriptionResult>> {
    // Placeholder for local Whisper implementation (e.g., using whisper.cpp)
    return {
      success: false,
      error: 'Local transcription not implemented',
      code: 'NOT_IMPLEMENTED',
    };
  }

  private formatOpenAIResponse(
    data: any,
    config: TranscriptionConfig
  ): TranscriptionResult {
    const segments: TranscriptionSegment[] = [];
    const speakerInfo: SpeakerInfo[] = [];

    // Handle different response formats
    if (data.segments) {
      data.segments.forEach((segment: any, index: number) => {
        segments.push({
          text: segment.text,
          startTime: segment.start,
          endTime: segment.end,
          confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.8,
          speaker: config.enableSpeakerIdentification
            ? `Speaker ${(index % 2) + 1}`
            : undefined,
        });
      });
    } else {
      // Simple text response
      segments.push({
        text: data.text,
        startTime: 0,
        endTime: 0,
        confidence: 0.8,
      });
    }

    return {
      id: this.generateId(),
      text: data.text,
      confidence:
        segments.length > 0
          ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
          : 0.8,
      segments,
      speakerInfo: config.enableSpeakerIdentification ? speakerInfo : undefined,
      processingTime: Date.now(),
      provider: 'openai',
      cost: this.calculateOpenAICost(data.text.length),
    };
  }

  private calculateOpenAICost(textLength: number): number {
    // OpenAI Whisper pricing: $0.006 per minute
    // Rough estimate: 150 words per minute, 5 characters per word
    const estimatedMinutes = textLength / (150 * 5);
    return Math.max(0.001, estimatedMinutes * 0.006);
  }

  private async checkProviderHealth(): Promise<void> {
    // Check each provider's health endpoint
    const healthChecks = Object.keys(this.providerConfigs).map(
      async provider => {
        try {
          // Implement actual health checks for each provider
          // For now, assume they're healthy if configured
          if (this.providerConfigs[provider as TranscriptionProvider]?.apiKey) {
            this.providerStatus[provider as TranscriptionProvider] = true;
          }
        } catch (error) {
          this.providerStatus[provider as TranscriptionProvider] = false;
          this.log(`Provider ${provider} health check failed`, 'warn');
        }
      }
    );

    await Promise.all(healthChecks);
  }

  private generateId(): string {
    return `transcription-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, level: 'info' | 'warn' | 'error'): void {
    if (this.config.enableLogging && this.dependencies.logger) {
      this.dependencies.logger(`[TranscriptionService] ${message}`, level);
    }
  }
}
