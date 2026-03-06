import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Sample data for demo PDF
const sampleExportData = {
  exportId: 'demo-export-001',
  userId: 'demo-user',
  exportedAt: new Date().toISOString(),
  options: {
    format: 'pdf',
    includeNotes: true,
    includeProgress: true,
    includeSessions: true,
    includeTranscriptions: true
  },
  data: {
    progress: [
      {
        module_title: 'Foundation & Mindset',
        progress_percentage: 85,
        lesson_title: 'Setting Your Vision'
      },
      {
        module_title: 'Business Systems',
        progress_percentage: 60,
        lesson_title: 'Client Management Systems'
      },
      {
        module_title: 'Marketing & Branding',
        progress_percentage: 40,
        lesson_title: 'Social Media Strategy'
      }
    ],
    notes: [
      {
        title: 'Key Insight on Pricing Strategy',
        content: 'Premium pricing reflects premium service. Don\'t compete on price - compete on value and experience. This is fundamental to the 6FB methodology.',
        session_title: 'Business Systems Workshop',
        created_at: new Date().toISOString(),
        is_action_item: true,
        action_item_completed: false
      },
      {
        title: 'Client Retention Strategy',
        content: 'Focus on building relationships, not just cutting hair. Each client should feel like VIP treatment. Remember: it\'s not about the cut, it\'s about the experience.',
        session_title: 'Marketing & Client Relations',
        created_at: new Date().toISOString(),
        is_action_item: false
      },
      {
        title: 'Action Item: Implement Booking System',
        content: 'Research and implement online booking system within 2 weeks. Compare options: Booksy, Schedulicity, custom solution. Goal: reduce no-shows by 50%.',
        session_title: 'Business Systems Workshop',
        created_at: new Date().toISOString(),
        is_action_item: true,
        action_item_completed: true
      },
      {
        title: 'Revenue Goals and Tracking',
        content: 'Set monthly revenue targets: Month 1: $8,000, Month 3: $12,000, Month 6: $15,000. Track daily earnings, client retention rates, and service pricing effectiveness.',
        session_title: 'Financial Planning Session',
        created_at: new Date().toISOString(),
        is_action_item: true,
        action_item_completed: false
      }
    ],
    transcriptions: [
      {
        recording_title: 'Day 1 Morning Session - Foundation',
        text: 'The difference between a $35k barber and a $100k+ barber isn\'t just skill - it\'s mindset, systems, and approach to business. You need to think like an entrepreneur who happens to cut hair, not just a barber trying to make money. This shift in perspective is everything.',
        created_at: new Date().toISOString(),
        duration_seconds: 1800,
        language: 'en'
      },
      {
        recording_title: 'Systems Deep Dive - Client Management',
        text: 'Your client management system is your lifeline. Every interaction should be tracked, every preference noted, every birthday remembered. This isn\'t just good service - it\'s what separates six-figure earners from everyone else.',
        created_at: new Date().toISOString(),
        duration_seconds: 2400,
        language: 'en'
      }
    ],
    sessions: [
      {
        title: 'Foundation & Mindset Workshop',
        created_at: new Date().toISOString(),
        notes_count: 3,
        recordings_count: 2
      },
      {
        title: 'Business Systems Deep Dive',
        created_at: new Date().toISOString(),
        notes_count: 5,
        recordings_count: 1
      }
    ]
  }
};

function generatePDFHTML(exportData: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>6FB Methodologies Workshop Workbook - Demo</title>
      <style>
        @page {
          size: A4;
          margin: 0.75in;
          background: #fafafa;
        }

        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.4;
          color: #2d2d2d;
          font-size: 11pt;
          background: #fafafa;
          margin: 0;
          padding: 20px;
        }

        /* Workbook Cover Style */
        .cover-page {
          text-align: center;
          padding: 60px 40px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border: 3px solid #22c55e;
          border-radius: 12px;
          margin-bottom: 40px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          page-break-after: always;
        }

        .cover-page h1 {
          font-size: 36pt;
          color: #22c55e;
          font-weight: bold;
          margin: 0 0 20px 0;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }

        .cover-page .subtitle {
          font-size: 18pt;
          color: #4a4a4a;
          font-style: italic;
          margin: 0 0 30px 0;
        }

        .cover-page .date {
          font-size: 14pt;
          color: #666;
          background: #f8f9fa;
          padding: 10px 20px;
          border-radius: 6px;
          display: inline-block;
          margin: 20px 0;
        }

        .cover-page .user-info {
          font-size: 12pt;
          color: #666;
          margin-top: 40px;
          padding: 20px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .demo-notice {
          background: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-size: 10pt;
          color: #92400e;
          text-align: center;
        }

        /* Physical Workbook Page Style */
        .workbook-page {
          background: #ffffff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          position: relative;
        }

        .workbook-page::before {
          content: "";
          position: absolute;
          left: 40px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #ff6b6b;
        }

        .section-header {
          background: #22c55e;
          color: white;
          padding: 15px 20px;
          margin: -30px -30px 30px -30px;
          font-size: 16pt;
          font-weight: bold;
          border-radius: 8px 8px 0 0;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .session-box {
          background: #f8f9fa;
          border: 2px solid #22c55e;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
          position: relative;
        }

        .session-title {
          font-size: 14pt;
          font-weight: bold;
          color: #22c55e;
          margin-bottom: 10px;
          text-decoration: underline;
        }

        .session-meta {
          font-size: 10pt;
          color: #666;
          font-style: italic;
          margin-bottom: 15px;
        }

        /* Note Style */
        .note-entry {
          background: #fff;
          border: 1px solid #ddd;
          border-left: 4px solid #22c55e;
          border-radius: 6px;
          padding: 15px 20px;
          margin: 15px 0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }

        .note-title {
          font-weight: bold;
          color: #2d2d2d;
          margin-bottom: 8px;
          font-size: 12pt;
        }

        .note-content {
          line-height: 1.6;
          color: #4a4a4a;
        }

        .note-date {
          font-size: 9pt;
          color: #888;
          font-style: italic;
          margin-top: 10px;
          text-align: right;
        }

        /* Action Items */
        .action-item {
          border-left-color: #f59e0b;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .action-completed {
          border-left-color: #10b981;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }

        .action-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 8pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .action-pending {
          background: #fbbf24;
          color: #92400e;
        }

        .action-done {
          background: #10b981;
          color: white;
        }

        /* Progress Tracking */
        .progress-section {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border: 2px solid #64748b;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
        }

        .progress-title {
          font-size: 14pt;
          font-weight: bold;
          color: #1e293b;
          margin-bottom: 15px;
          text-align: center;
        }

        .progress-bar {
          background: #e2e8f0;
          height: 20px;
          border-radius: 10px;
          overflow: hidden;
          margin: 10px 0;
          border: 1px solid #cbd5e1;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #16a085);
          transition: width 0.3s ease;
        }

        /* Lines for writing */
        .writing-lines {
          background-image: repeating-linear-gradient(
            transparent,
            transparent 24px,
            #e2e8f0 24px,
            #e2e8f0 25px
          );
          min-height: 150px;
          padding: 25px 0;
          margin: 20px 0;
        }

        .page-break {
          page-break-before: always;
        }

        .page-footer {
          text-align: center;
          font-size: 9pt;
          color: #888;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <!-- Cover Page -->
      <div class="cover-page">
        <h1>6FB Methodologies</h1>
        <div class="subtitle">Workshop Workbook</div>
        <div class="demo-notice">
          <strong>DEMO VERSION</strong><br>
          This is a sample of what your personalized workbook would look like
        </div>
        <div class="date">${currentDate}</div>
        <div class="user-info">
          <strong>Participant:</strong> Demo User<br>
          <strong>Workshop Location:</strong> In-Person Intensive<br>
          <strong>Coaches:</strong> Dre, Nate & Bossio
        </div>
      </div>

      <!-- Progress Summary -->
      <div class="workbook-page">
        <div class="section-header">Workshop Progress Summary</div>
        <div class="progress-section">
          <div class="progress-title">Your Learning Journey</div>
          ${exportData.data.progress.map((progress: any) => `
            <div style="margin: 15px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold;">${progress.module_title}</span>
                <span style="color: #22c55e; font-weight: bold;">${progress.progress_percentage}% Complete</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress.progress_percentage}%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Workshop Notes -->
      <div class="workbook-page">
        <div class="section-header">Workshop Notes & Action Items</div>
        <div class="session-box">
          <div class="session-title">Business Systems Workshop</div>
          ${exportData.data.notes.filter((note: any) => note.session_title === 'Business Systems Workshop').map((note: any) => `
            <div class="note-entry ${note.is_action_item ? (note.action_item_completed ? 'action-completed' : 'action-item') : ''}">
              ${note.is_action_item ? `
                <div class="action-badge ${note.action_item_completed ? 'action-done' : 'action-pending'}">
                  ${note.action_item_completed ? '[DONE] Completed' : '[PENDING] Action Item'}
                </div>
              ` : ''}
              <div class="note-title">${note.title}</div>
              <div class="note-content">${note.content}</div>
              <div class="note-date">${new Date(note.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>
          `).join('')}
        </div>

        <div class="session-box">
          <div class="session-title">Marketing & Client Relations</div>
          ${exportData.data.notes.filter((note: any) => note.session_title === 'Marketing & Client Relations').map((note: any) => `
            <div class="note-entry">
              <div class="note-title">${note.title}</div>
              <div class="note-content">${note.content}</div>
              <div class="note-date">${new Date(note.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>
          `).join('')}
        </div>

        <div class="session-box">
          <div class="session-title">Financial Planning Session</div>
          ${exportData.data.notes.filter((note: any) => note.session_title === 'Financial Planning Session').map((note: any) => `
            <div class="note-entry action-item">
              <div class="action-badge action-pending">[PENDING] Action Item</div>
              <div class="note-title">${note.title}</div>
              <div class="note-content">${note.content}</div>
              <div class="note-date">${new Date(note.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Audio Transcriptions -->
      <div class="workbook-page page-break">
        <div class="section-header">Audio Transcriptions</div>
        ${exportData.data.transcriptions.map((transcription: any) => `
          <div class="session-box">
            <div class="session-title">[MIC] ${transcription.recording_title}</div>
            <div class="session-meta">
              Recorded: ${new Date(transcription.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              • Duration: ${Math.round(transcription.duration_seconds / 60)} minutes
              • Language: ${transcription.language}
            </div>
            <div class="note-entry">
              <div class="note-content" style="font-style: italic; color: #4a4a4a;">
                "${transcription.text}"
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Action Plan Pages -->
      <div class="workbook-page page-break">
        <div class="section-header">My Action Plan</div>
        <div class="session-box">
          <div class="session-title">[NOTE] Key Takeaways from This Workshop</div>
          <div class="writing-lines" style="min-height: 200px;"></div>
        </div>

        <div class="session-box">
          <div class="session-title">[TARGET] Top 3 Action Items to Implement</div>
          <div style="margin: 20px 0;">
            <div style="margin: 15px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <strong>1. Priority Action:</strong>
              <div class="writing-lines" style="min-height: 60px; margin-top: 10px;"></div>
            </div>
            <div style="margin: 15px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <strong>2. Secondary Action:</strong>
              <div class="writing-lines" style="min-height: 60px; margin-top: 10px;"></div>
            </div>
            <div style="margin: 15px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <strong>3. Long-term Goal:</strong>
              <div class="writing-lines" style="min-height: 60px; margin-top: 10px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Final Page -->
      <div class="workbook-page page-break">
        <div class="section-header">Workshop Completion Certificate</div>
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 24pt; color: #22c55e; margin: 20px 0;">[TROPHY] Congratulations! [TROPHY]</div>
          <div style="font-size: 16pt; margin: 20px 0;">You have successfully completed the</div>
          <div style="font-size: 20pt; font-weight: bold; color: #22c55e; margin: 20px 0;">6FB Methodologies Workshop</div>
          <div style="font-size: 14pt; margin: 30px 0;">This workbook contains your personal journey through the workshop</div>

          <div style="margin: 40px 0; padding: 20px; border: 2px solid #22c55e; border-radius: 10px; background: #f0fdf4;">
            <div style="font-size: 12pt; color: #166534;">
              <strong>What's Next?</strong><br>
              • Implement your action plan<br>
              • Join our community for ongoing support<br>
              • Schedule your 90-day check-in<br>
              • Visit 6fbmethodologies.com for resources
            </div>
          </div>
        </div>

        <div class="page-footer">
          <p><strong>6FB Methodologies Workshop System</strong></p>
          <p>Generated on ${currentDate}</p>
          <p>Visit <strong>6fbmethodologies.com</strong> for continued learning and support</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function generatePDFFromHTML(htmlContent: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer');

  // Launch Puppeteer in headless mode
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set page content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; margin: 0 auto; color: #666;">
          6FB Workshop Progress Report - DEMO
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; margin: 0 auto; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

export async function GET(request: NextRequest) {
  try {
    // Generate HTML content
    const htmlContent = generatePDFHTML(sampleExportData);

    // Check if user wants HTML preview instead of PDF
    const url = new URL(request.url);
    const format = url.searchParams.get('format');

    if (format === 'html') {
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    // Generate PDF
    const pdfBuffer = await generatePDFFromHTML(htmlContent);

    // Return PDF for download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="6fb-demo-workbook-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Demo PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate demo PDF' },
      { status: 500 }
    );
  }
}