'use client';
import { useState } from 'react';

interface ProxyReferralProps {
  fanId?: string;
}

export default function ProxyReferral({ fanId = "GUEST-001" }: ProxyReferralProps) {
  const [status, setStatus] = useState<'IDLE' | 'COPIED' | 'SHARED'>('IDLE');

  const referralLink = `https://savehxpe.com/arcade?proxy=${fanId}`;
  const shareMessage = "Beat my score on Cash Caliber. Sign up now to get 50 free credits.";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cash Caliber',
          text: shareMessage,
          url: referralLink,
        });
        setStatus('SHARED');
      } catch {
        // Fallback to copy if the user cancels or the share fails
        copyToClipboard();
      }
    } else {
      // Fallback for desktop browsers without share API
      copyToClipboard();
    }

    // Reset button state
    setTimeout(() => setStatus('IDLE'), 3000);
  };

  const copyToClipboard = () => {
    const payload = `Beat my score at Cash Caliber. Sign up today to claim your starting 50 CR bonus and unlock exclusive SaveHxpe releases: ${referralLink}`;
    navigator.clipboard.writeText(payload);
    setStatus('COPIED');
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 border border-gray-800 bg-black text-center w-full my-6">
      <h4 className="text-white font-mono text-sm font-bold mb-3 uppercase tracking-widest">
        Refer a Player
      </h4>

      <p className="text-gray-400 font-mono text-xs leading-relaxed mb-6 max-w-xs">
        Invite players to earn credits. If your referral reaches a 10x streak, your account receives a 50 CR bonus.
      </p>

      <button
        onClick={handleShare}
        className={`w-full max-w-xs py-3 font-mono text-xs uppercase tracking-widest border transition-all duration-300 ${
          status !== 'IDLE'
            ? 'bg-black text-gray-300 border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]'
            : 'bg-black text-white border-gray-500 animate-pulse hover:border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]'
        }`}
      >
        {status === 'COPIED' ? 'Copied to Clipboard' : status === 'SHARED' ? 'Link Shared' : 'Share Link'}
      </button>
    </div>
  );
}
