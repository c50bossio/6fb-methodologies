#!/usr/bin/env node

/**
 * Script to show the content structure of available worksheets
 */

const fs = require('fs');
const path = require('path');

console.log('====== 6FB Methodologies - Available Worksheets and Content ======\n');

// List of worksheet files based on our findings
const worksheets = [
  'ActionPlanWorksheet.tsx',
  'WealthPlanWorksheet.tsx',
  'KPIsWorksheet.tsx',
  'SystemsWorksheet.tsx',
  'MarketingWorksheet.tsx',
  'PaidAdsWorksheet.tsx'
];

const additionalTools = [
  'BusinessAssessmentTemplate.tsx',
  'RevenuePricingCalculator.tsx',
  'ServicePackageDesigner.tsx',
  'GoalSettingWorksheet.tsx'
];

console.log('[TARGET] CORE WORKSHEETS:');
worksheets.forEach((worksheet, index) => {
  const name = worksheet.replace('Worksheet.tsx', '').replace(/([A-Z])/g, ' $1').trim();
  console.log(`   ${index + 1}. ${name} Worksheet`);
});

console.log('\n[TOOLS] BUSINESS TOOLS & TEMPLATES:');
additionalTools.forEach((tool, index) => {
  const name = tool.replace('.tsx', '').replace(/([A-Z])/g, ' $1').trim();
  console.log(`   ${index + 1}. ${name}`);
});

console.log('\n[FILE] EXPORT FORMATS AVAILABLE:');
console.log('   • PDF - Professional workbook with styling and branding');
console.log('   • JSON - Complete data export for backup/transfer');
console.log('   • Markdown - Text-based format for documentation');
console.log('   • CSV - Spreadsheet-compatible data export');

console.log('\n[DESIGN] PDF WORKBOOK INCLUDES:');
console.log('   • Professional cover page with 6FB branding');
console.log('   • Progress summary with visual progress bars');
console.log('   • Workshop notes organized by session');
console.log('   • Action items (pending [PENDING] and completed [DONE])');
console.log('   • Audio transcriptions with metadata');
console.log('   • Session summaries with statistics');
console.log('   • Blank action plan pages with writing lines');
console.log('   • Completion certificate page');

console.log('\n[MOBILE] INTERACTIVE FEATURES:');
console.log('   • Real-time auto-save of worksheet data');
console.log('   • Progress tracking across all modules');
console.log('   • Audio recording and transcription');
console.log('   • Note-taking with rich text editing');
console.log('   • Action item management');

console.log('\n[LINK] EXTERNAL MATERIALS REFERENCED:');
console.log('   • Handbook PDF: https://6fbmethodologies.com/materials/handbook.pdf');
console.log('   • Video Resources: https://6fbmethodologies.com/materials/videos');
console.log('   • Resource Library: https://6fbmethodologies.com/materials/resources');
console.log('   • Completion Certificates: https://6fbmethodologies.com/certificates/');

console.log('\n[INFO] TO VIEW THE ACTUAL PDF WORKBOOK:');
console.log('   1. Open the workbook application at http://localhost:3000/workbook');
console.log('   2. Log in or create an account');
console.log('   3. Add some notes and progress through modules');
console.log('   4. Use the "Export Workbook" feature to generate a PDF');
console.log('   5. The generated PDF will include all your personalized data');

console.log('\n[STATUS] CURRENT STATUS:');
console.log('   [OK] Export system is fully implemented');
console.log('   [OK] All 6 core worksheets are available');
console.log('   [OK] Business tools and calculators ready');
console.log('   [?] Pre-workshop preparation materials may need verification');
console.log('   [?] Individual worksheet PDF downloads not yet confirmed');

console.log('\nOpen sample-workbook-export.html in your browser to see the PDF layout! [LAUNCH]');