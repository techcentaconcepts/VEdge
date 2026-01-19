import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email || 'your email';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center items-center py-12 px-4">
      <div className="card p-8 max-w-md w-full text-center bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-brand-500/10 rounded-full">
            <Mail className="h-12 w-12 text-brand-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Check your email
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We&apos;ve sent a verification link to{' '}
          <span className="text-gray-900 dark:text-white font-medium">{decodeURIComponent(email)}</span>
        </p>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-left mb-6 border border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Next steps:</h3>
          <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>Open your email inbox</li>
            <li>Click the verification link in the email from Vantedge</li>
            <li>Start tracking your bets!</li>
          </ol>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          Didn&apos;t receive the email? Check your spam folder or{' '}
          <Link href="/signup" className="text-brand-600 dark:text-brand-500 hover:text-brand-500 dark:hover:text-brand-400 font-medium">
            try again
          </Link>
        </p>
        
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-2 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
