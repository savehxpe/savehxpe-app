'use client';
import { useState } from 'react';

interface ProxyReferralProps {
  fanId?: string;
}

export default function ProxyReferral({ fanId = "GUEST-001" }: ProxyReferralProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Generates a unique tracking link for the user
    const referralLink = `https://savehxpe.com/arcade?proxy=${fanId}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);

    // Reset button state after 3 seconds
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="mt-6 border-l-2 border-cyan-500 bg-[#001a1a]/50 p-4">
      <h4 className="text-cyan-400 font-mono text-xs font-bold mb-2 tracking-widest">
        SYSTEM UPGRADE REQUIRED?
      </h4>
      <p className="text-gray-400 font-mono text-[11px] leading-relaxed mb-4">
        Low on credits? Invite a Proxy. If your recruit beats a 10x streak in the Cash Caliber engine, your account receives an instant <span className="text-cyan-300">+50 CR Viral Bonus</span>.
      </p>

      <button
        onClick={handleCopy}
        className={`w-full py-3 font-mono text-xs tracking-widest border transition-all duration-300 ${
          copied
            ? 'bg-green-900/40 border-green-500 text-green-400 shadow-[0_0_10px_rgba(0,255,0,0.2)]'
            : 'bg-black border-cyan-500 text-cyan-400 hover:bg-cyan-500/10'
        }`}
      >
        {copied ? '[ LINK ENCRYPTED & COPIED ]' : '[ INVITE A PROXY: +50 CR ]'}
      </button>
    </div>
  );
}
