import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center items-center py-12 px-4">
      <div className="card p-8 max-w-md w-full text-center bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-500/10 dark:bg-red-900/30 rounded-full">
            <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Authentication Error
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We couldn&apos;t complete the authentication process. This could be due to an expired link or invalid session.
        </p>
        
        <div className="space-y-3">
          <Link href="/login" className="btn-primary w-full flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
          
          <Link href="/signup" className="btn-secondary w-full justify-center">
            Create New Account
          </Link>
        </div>
        
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          If this problem persists, please contact{' '}
          <a href="mailto:support@vantedge.io" className="text-brand-600 dark:text-brand-500 hover:underline">
            support@vantedge.io
          </a>
        </p>
      </div>
    </div>
  );
}
