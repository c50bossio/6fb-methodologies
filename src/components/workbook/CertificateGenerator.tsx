'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Award,
  Download,
  Share2,
  Star,
  Calendar,
  CheckCircle,
  Trophy,
  Medal,
  Crown,
  Sparkles,
  ExternalLink,
  Copy,
  Mail,
  Printer,
  FileText,
  Image as ImageIcon,
  Shield,
  Verified,
  QrCode,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

/**
 * Certificate data structure
 */
interface CertificateData {
  certificateId: string;
  recipientName: string;
  recipientEmail: string;
  moduleName: string;
  moduleId: string;
  completionDate: string;
  score?: number;
  totalModules?: number;
  completedModules?: number;
  timeSpent: number; // in minutes
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  instructorName?: string;
  organizationName: string;
  organizationLogo?: string;
  verificationUrl: string;
  expiryDate?: string;
  credentialType: 'completion' | 'mastery' | 'excellence';
  metadata?: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    industryTags: string[];
    skills: string[];
  };
}

/**
 * Props for the CertificateGenerator component
 */
interface CertificateGeneratorProps {
  /** Certificate data */
  certificateData: CertificateData;
  /** Template style */
  template?: 'modern' | 'classic' | 'minimalist' | 'professional';
  /** Color scheme */
  colorScheme?: 'tomb45' | 'blue' | 'purple' | 'green' | 'gold';
  /** Whether to show verification elements */
  showVerification?: boolean;
  /** Whether to enable sharing features */
  enableSharing?: boolean;
  /** Whether to show download options */
  showDownloadOptions?: boolean;
  /** Callback when certificate is generated */
  onCertificateGenerated?: (certificateId: string, format: string) => void;
  /** Callback when certificate is shared */
  onCertificateShared?: (certificateId: string, platform: string) => void;
  /** Callback for error handling */
  onError?: (error: string) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Certificate template component
 */
const CertificateTemplate: React.FC<{
  data: CertificateData;
  template: string;
  colorScheme: string;
  showVerification: boolean;
}> = ({ data, template, colorScheme, showVerification }) => {
  const getColorClasses = (scheme: string) => {
    switch (scheme) {
      case 'tomb45':
        return {
          primary: 'text-tomb45-green',
          secondary: 'text-tomb45-green/70',
          bg: 'bg-gradient-to-br from-tomb45-green/10 to-tomb45-green/5',
          border: 'border-tomb45-green/20',
          accent: 'bg-tomb45-green',
        };
      case 'blue':
        return {
          primary: 'text-blue-600',
          secondary: 'text-blue-500',
          bg: 'bg-gradient-to-br from-blue-50 to-blue-25',
          border: 'border-blue-200',
          accent: 'bg-blue-600',
        };
      case 'purple':
        return {
          primary: 'text-purple-600',
          secondary: 'text-purple-500',
          bg: 'bg-gradient-to-br from-purple-50 to-purple-25',
          border: 'border-purple-200',
          accent: 'bg-purple-600',
        };
      case 'green':
        return {
          primary: 'text-green-600',
          secondary: 'text-green-500',
          bg: 'bg-gradient-to-br from-green-50 to-green-25',
          border: 'border-green-200',
          accent: 'bg-green-600',
        };
      case 'gold':
        return {
          primary: 'text-yellow-600',
          secondary: 'text-yellow-500',
          bg: 'bg-gradient-to-br from-yellow-50 to-yellow-25',
          border: 'border-yellow-200',
          accent: 'bg-yellow-600',
        };
      default:
        return {
          primary: 'text-tomb45-green',
          secondary: 'text-tomb45-green/70',
          bg: 'bg-gradient-to-br from-tomb45-green/10 to-tomb45-green/5',
          border: 'border-tomb45-green/20',
          accent: 'bg-tomb45-green',
        };
    }
  };

  const colors = getColorClasses(colorScheme);

  const getCredentialIcon = (type: string) => {
    switch (type) {
      case 'mastery':
        return <Crown className="w-12 h-12" />;
      case 'excellence':
        return <Trophy className="w-12 h-12" />;
      default:
        return <Award className="w-12 h-12" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderModernTemplate = () => (
    <div className={`${colors.bg} border-2 ${colors.border} rounded-2xl p-12 relative overflow-hidden`}>
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 opacity-5">
        <Sparkles className="w-64 h-64" />
      </div>
      <div className="absolute bottom-0 left-0 opacity-5">
        <Star className="w-48 h-48" />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-20 h-20 ${colors.accent} rounded-full mb-6`}>
          <div className="text-white">
            {getCredentialIcon(data.credentialType)}
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Certificate of {data.credentialType === 'completion' ? 'Completion' : data.credentialType === 'mastery' ? 'Mastery' : 'Excellence'}</h1>
        <p className="text-lg text-gray-600">This certifies that</p>
      </div>

      {/* Recipient */}
      <div className="text-center mb-8">
        <h2 className={`text-5xl font-bold ${colors.primary} mb-4`}>{data.recipientName}</h2>
        <p className="text-xl text-gray-700">has successfully completed</p>
      </div>

      {/* Module Information */}
      <div className="text-center mb-8">
        <h3 className="text-3xl font-semibold text-gray-800 mb-4">{data.moduleName}</h3>
        <div className="flex items-center justify-center gap-6 mb-4">
          {data.score && (
            <div className="text-center">
              <div className={`text-2xl font-bold ${colors.primary}`}>{data.score}%</div>
              <div className="text-sm text-gray-600">Score</div>
            </div>
          )}
          <div className="text-center">
            <div className={`text-2xl font-bold ${colors.primary}`}>{Math.round(data.timeSpent / 60)}h</div>
            <div className="text-sm text-gray-600">Study Time</div>
          </div>
          {data.totalModules && (
            <div className="text-center">
              <div className={`text-2xl font-bold ${colors.primary}`}>{data.completedModules}/{data.totalModules}</div>
              <div className="text-sm text-gray-600">Modules</div>
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      {data.achievements.length > 0 && (
        <div className="flex items-center justify-center gap-4 mb-8">
          {data.achievements.slice(0, 3).map((achievement) => (
            <div key={achievement.id} className="text-center">
              <div className={`w-12 h-12 ${colors.accent} rounded-full flex items-center justify-center mb-2`}>
                <Star className="w-6 h-6 text-white" />
              </div>
              <p className="text-xs text-gray-600">{achievement.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-end justify-between mt-12">
        <div>
          <p className="text-gray-600 mb-1">Completion Date</p>
          <p className="text-lg font-semibold text-gray-800">{formatDate(data.completionDate)}</p>
        </div>
        <div className="text-center">
          <div className={`w-16 h-16 ${colors.accent} rounded-full flex items-center justify-center mb-2`}>
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-xs text-gray-600">{data.organizationName}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-600 mb-1">Certificate ID</p>
          <p className="text-sm font-mono text-gray-800">{data.certificateId}</p>
        </div>
      </div>

      {/* Verification */}
      {showVerification && (
        <div className="text-center mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Verify this certificate at: {data.verificationUrl}
          </p>
        </div>
      )}
    </div>
  );

  const renderClassicTemplate = () => (
    <div className="bg-white border-8 border-double border-gray-800 p-12 relative">
      {/* Decorative corners */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-gray-800"></div>
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-gray-800"></div>
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-gray-800"></div>
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-gray-800"></div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-serif text-gray-800 mb-4">Certificate</h1>
        <p className="text-xl font-serif text-gray-700">of Achievement</p>
      </div>

      {/* Ornamental line */}
      <div className="flex items-center justify-center mb-8">
        <div className="border-t border-gray-400 flex-1"></div>
        <Star className={`w-8 h-8 mx-4 ${colors.primary}`} />
        <div className="border-t border-gray-400 flex-1"></div>
      </div>

      {/* Content */}
      <div className="text-center mb-8">
        <p className="text-lg font-serif text-gray-700 mb-4">This is to certify that</p>
        <h2 className={`text-4xl font-serif ${colors.primary} mb-6`}>{data.recipientName}</h2>
        <p className="text-lg font-serif text-gray-700 mb-4">has successfully completed the course</p>
        <h3 className="text-2xl font-serif text-gray-800 mb-6">{data.moduleName}</h3>
        <p className="text-base font-serif text-gray-700">on {formatDate(data.completionDate)}</p>
      </div>

      {/* Signatures */}
      <div className="flex justify-between items-end mt-12">
        <div className="text-center">
          <div className="border-t border-gray-800 w-48 mb-2"></div>
          <p className="text-sm font-serif text-gray-700">Instructor</p>
        </div>
        <div className={`p-4 ${colors.accent} rounded-full`}>
          <Award className="w-12 h-12 text-white" />
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 w-48 mb-2"></div>
          <p className="text-sm font-serif text-gray-700">Director</p>
        </div>
      </div>
    </div>
  );

  const renderMinimalistTemplate = () => (
    <div className="bg-white p-16 border border-gray-200">
      <div className="max-w-2xl mx-auto text-center">
        <div className={`inline-block w-1 h-16 ${colors.accent} mb-8`}></div>

        <h1 className="text-6xl font-light text-gray-800 mb-4">CERTIFICATE</h1>
        <p className="text-lg text-gray-600 mb-12">of completion</p>

        <div className="space-y-8">
          <div>
            <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">Awarded to</p>
            <h2 className={`text-4xl font-light ${colors.primary}`}>{data.recipientName}</h2>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">For completing</p>
            <h3 className="text-2xl font-light text-gray-800">{data.moduleName}</h3>
          </div>

          <div className="flex items-center justify-center gap-12 text-center">
            <div>
              <p className="text-sm uppercase tracking-wider text-gray-500 mb-1">Date</p>
              <p className="text-lg text-gray-800">{formatDate(data.completionDate)}</p>
            </div>
            {data.score && (
              <div>
                <p className="text-sm uppercase tracking-wider text-gray-500 mb-1">Score</p>
                <p className={`text-lg ${colors.primary}`}>{data.score}%</p>
              </div>
            )}
          </div>
        </div>

        <div className={`inline-block w-1 h-16 ${colors.accent} mt-12`}></div>

        {showVerification && (
          <div className="mt-8 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-mono">{data.certificateId}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderProfessionalTemplate = () => (
    <div className="bg-white border border-gray-300 p-12">
      <div className="border-4 border-gray-800 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 ${colors.accent} rounded flex items-center justify-center`}>
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{data.organizationName}</h1>
              <p className="text-gray-600">Professional Development Certificate</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Certificate No.</p>
            <p className="font-mono text-sm text-gray-800">{data.certificateId}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Certificate of Professional Development</h2>
          <p className="text-lg text-gray-700 mb-6">This certifies that</p>
          <h3 className={`text-4xl font-bold ${colors.primary} mb-6`}>{data.recipientName}</h3>
          <p className="text-lg text-gray-700 mb-4">has successfully completed the professional development program</p>
          <h4 className="text-2xl font-semibold text-gray-800 mb-6">{data.moduleName}</h4>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mb-8">
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className={`text-2xl font-bold ${colors.primary}`}>
              {Math.round(data.timeSpent / 60)}
            </div>
            <p className="text-sm text-gray-600">Hours Completed</p>
          </div>
          {data.score && (
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className={`text-2xl font-bold ${colors.primary}`}>{data.score}%</div>
              <p className="text-sm text-gray-600">Final Score</p>
            </div>
          )}
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className={`text-2xl font-bold ${colors.primary}`}>
              {data.credentialType === 'excellence' ? 'A+' : data.credentialType === 'mastery' ? 'A' : 'B+'}
            </div>
            <p className="text-sm text-gray-600">Grade</p>
          </div>
        </div>

        {/* Skills */}
        {data.metadata?.skills && (
          <div className="mb-8">
            <h5 className="text-lg font-semibold text-gray-800 mb-3">Skills Validated</h5>
            <div className="flex flex-wrap gap-2">
              {data.metadata.skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-end pt-4 border-t border-gray-200">
          <div>
            <p className="text-gray-600 mb-1">Date of Completion</p>
            <p className="text-lg font-semibold text-gray-800">{formatDate(data.completionDate)}</p>
          </div>
          <div className="text-center">
            <div className={`w-12 h-12 ${colors.accent} rounded-full flex items-center justify-center mb-2`}>
              <Verified className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs text-gray-600">Verified</p>
          </div>
          {data.expiryDate && (
            <div className="text-right">
              <p className="text-gray-600 mb-1">Valid Until</p>
              <p className="text-lg font-semibold text-gray-800">{formatDate(data.expiryDate)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  switch (template) {
    case 'classic':
      return renderClassicTemplate();
    case 'minimalist':
      return renderMinimalistTemplate();
    case 'professional':
      return renderProfessionalTemplate();
    default:
      return renderModernTemplate();
  }
};

/**
 * Main CertificateGenerator component
 */
export default function CertificateGenerator({
  certificateData,
  template = 'modern',
  colorScheme = 'tomb45',
  showVerification = true,
  enableSharing = true,
  showDownloadOptions = true,
  onCertificateGenerated,
  onCertificateShared,
  onError,
  className = '',
}: CertificateGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFormats, setGeneratedFormats] = useState<string[]>([]);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async (format: 'pdf' | 'png' | 'jpg') => {
    try {
      setIsGenerating(true);

      if (format === 'pdf') {
        // In a real implementation, you'd use a library like jsPDF or html2pdf
        // For now, we'll simulate the process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create a blob and download
        const element = certificateRef.current;
        if (element) {
          // This would be replaced with actual PDF generation
          console.log('Generating PDF certificate...');
          onCertificateGenerated?.(certificateData.certificateId, 'pdf');
        }
      } else {
        // For image formats, you'd use html2canvas or similar
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`Generating ${format.toUpperCase()} certificate...`);
        onCertificateGenerated?.(certificateData.certificateId, format);
      }

      setGeneratedFormats(prev => [...prev, format]);
    } catch (error) {
      console.error('Certificate generation failed:', error);
      onError?.('Failed to generate certificate');
    } finally {
      setIsGenerating(false);
    }
  }, [certificateData.certificateId, onCertificateGenerated, onError]);

  const handleShare = useCallback((platform: string) => {
    const shareUrl = certificateData.verificationUrl;
    const shareText = `I've completed ${certificateData.moduleName} and earned my certificate!`;

    switch (platform) {
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'email':
        window.open(
          `mailto:?subject=${encodeURIComponent('My Certificate Achievement')}&body=${encodeURIComponent(`${shareText}\n\nVerify at: ${shareUrl}`)}`
        );
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        break;
    }

    onCertificateShared?.(certificateData.certificateId, platform);
    setShowShareMenu(false);
  }, [certificateData, onCertificateShared]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Certificate Preview */}
      <Card className="bg-background-secondary border-border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-tomb45-green" />
              Certificate Preview
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {template} template
              </Badge>
              <Badge variant="outline" className="text-xs">
                {colorScheme} theme
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={certificateRef}
            className="bg-white mx-auto max-w-4xl transform scale-75 origin-top"
            style={{ aspectRatio: '11/8.5' }} // Standard certificate ratio
          >
            <CertificateTemplate
              data={certificateData}
              template={template}
              colorScheme={colorScheme}
              showVerification={showVerification}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="bg-background-secondary border-border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-tomb45-green" />
            Certificate Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Download Options */}
            {showDownloadOptions && (
              <>
                <Button
                  onClick={() => handleDownload('pdf')}
                  disabled={isGenerating}
                  className="bg-tomb45-green hover:bg-tomb45-green/80 text-white"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Download PDF
                </Button>

                <Button
                  onClick={() => handleDownload('png')}
                  disabled={isGenerating}
                  variant="outline"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Download PNG
                </Button>

                <Button
                  onClick={() => handleDownload('jpg')}
                  disabled={isGenerating}
                  variant="outline"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Download JPG
                </Button>
              </>
            )}

            {/* Print */}
            <Button onClick={handlePrint} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>

          {/* Share Options */}
          {enableSharing && (
            <div className="mt-6">
              <h4 className="font-medium text-text-primary mb-3">Share Your Achievement</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleShare('linkedin')}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  LinkedIn
                </Button>
                <Button
                  onClick={() => handleShare('twitter')}
                  variant="outline"
                  size="sm"
                  className="text-blue-400 border-blue-200 hover:bg-blue-50"
                >
                  Twitter
                </Button>
                <Button
                  onClick={() => handleShare('facebook')}
                  variant="outline"
                  size="sm"
                  className="text-blue-800 border-blue-200 hover:bg-blue-50"
                >
                  Facebook
                </Button>
                <Button
                  onClick={() => handleShare('email')}
                  variant="outline"
                  size="sm"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </Button>
                <Button
                  onClick={() => handleShare('copy')}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Link
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificate Details */}
      <Card className="bg-background-secondary border-border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-tomb45-green" />
            Certificate Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-text-secondary">Certificate ID</p>
                <p className="font-mono text-sm text-text-primary">{certificateData.certificateId}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Recipient</p>
                <p className="text-text-primary">{certificateData.recipientName}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Module</p>
                <p className="text-text-primary">{certificateData.moduleName}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Completion Date</p>
                <p className="text-text-primary">
                  {new Date(certificateData.completionDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-3">
              {certificateData.score && (
                <div>
                  <p className="text-sm text-text-secondary">Final Score</p>
                  <p className="text-text-primary">{certificateData.score}%</p>
                </div>
              )}
              <div>
                <p className="text-sm text-text-secondary">Time Invested</p>
                <p className="text-text-primary">
                  {Math.round(certificateData.timeSpent / 60)} hours {certificateData.timeSpent % 60} minutes
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Credential Type</p>
                <Badge className="capitalize">
                  {certificateData.credentialType}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Verification</p>
                <a
                  href={certificateData.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tomb45-green hover:underline flex items-center gap-1"
                >
                  Verify Certificate
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Achievements */}
          {certificateData.achievements.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-text-primary mb-3">Achievements Earned</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {certificateData.achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-3 bg-background-accent rounded-lg">
                    <div className="w-8 h-8 bg-tomb45-green rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">{achievement.name}</p>
                      <p className="text-xs text-text-secondary">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills & Tags */}
          {certificateData.metadata && (
            <div className="mt-6 space-y-4">
              {certificateData.metadata.skills.length > 0 && (
                <div>
                  <h4 className="font-medium text-text-primary mb-2">Skills Validated</h4>
                  <div className="flex flex-wrap gap-2">
                    {certificateData.metadata.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {certificateData.metadata.industryTags.length > 0 && (
                <div>
                  <h4 className="font-medium text-text-primary mb-2">Industry Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {certificateData.metadata.industryTags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { CertificateGenerator };
export type { CertificateGeneratorProps, CertificateData };