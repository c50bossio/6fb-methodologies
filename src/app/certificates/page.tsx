import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Certificates - Six Figure Barber',
  description: 'View and download your Six Figure Barber workshop completion certificates',
};

export default function CertificatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Workshop Certificates
          </h1>
          <p className="text-lg text-gray-600">
            View and download your Six Figure Barber workshop completion certificates
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start mb-6">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                Access Your Certificates
              </h3>
              <p className="mt-2 text-gray-600">
                To view and download your workshop completion certificates, please log in to your
                workbook account.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-gray-900 mb-2">How to Access:</h4>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Log in to your workbook account</li>
                <li>Complete all lessons in a workshop module</li>
                <li>Click &quot;Request Certificate&quot; when completing the module</li>
                <li>Your certificate will be generated and available for download</li>
              </ol>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-gray-900 mb-2">Certificate Features:</h4>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Professional PDF certificate with your name</li>
                <li>Module completion details and completion date</li>
                <li>Six Figure Barber branding and verification</li>
                <li>Downloadable for printing or digital sharing</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <a
              href="/workbook"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to Workbook
              <svg
                className="ml-2 -mr-1 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
          </div>
        </div>

        {/* Support Info */}
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-600">
            Having trouble accessing your certificates?{' '}
            <a href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}