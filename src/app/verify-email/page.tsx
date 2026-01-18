import Link from 'next/link';
import { TrendingUp, Mail, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email || 'your email';

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center py-12 px-4">
      <div className="card max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-green-500/10 rounded-full">
            <Mail className="h-12 w-12 text-green-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">
          Check your email
        </h1>
        
        <p className="text-neutral-400 mb-6">
          We&apos;ve sent a verification link to{' '}
          <span className="text-white font-medium">{decodeURIComponent(email)}</span>
        </p>
        
        <div className="p-4 bg-neutral-800/50 rounded-lg text-left mb-6">
          <h3 className="text-sm font-medium text-white mb-2">Next steps:</h3>
          <ol className="list-decimal list-inside text-sm text-neutral-400 space-y-1">
            <li>Open your email inbox</li>
            <li>Click the verification link in the email from Vantedge</li>
            <li>Start tracking your bets!</li>
          </ol>
        </div>
        
        <p className="text-sm text-neutral-500 mb-4">
          Didn&apos;t receive the email? Check your spam folder or{' '}
          <Link href="/signup" className="text-green-500 hover:text-green-400">
            try again
          </Link>
        </p>
        
        <Link href="/login" className="text-sm text-neutral-400 hover:text-white flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
