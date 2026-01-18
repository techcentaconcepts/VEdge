import Link from 'next/link';
import { TrendingUp, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center py-12 px-4">
      <div className="card max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-500/10 rounded-full">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">
          Authentication Error
        </h1>
        
        <p className="text-neutral-400 mb-6">
          We couldn&apos;t complete the authentication process. This could be due to an expired link or invalid session.
        </p>
        
        <div className="space-y-3">
          <Link href="/login" className="btn-primary w-full flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
          
          <Link href="/signup" className="btn-secondary w-full">
            Create New Account
          </Link>
        </div>
        
        <p className="mt-6 text-xs text-neutral-500">
          If this problem persists, please contact{' '}
          <a href="mailto:support@vantedge.io" className="text-green-500 hover:text-green-400">
            support@vantedge.io
          </a>
        </p>
      </div>
    </div>
  );
}
