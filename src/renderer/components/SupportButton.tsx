import React, { useState } from 'react';

interface SupportButtonProps {
  className?: string;
}

const SupportButton: React.FC<SupportButtonProps> = ({ className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleSupportClick = () => {
    const email = 'andreas.elvethun@onemed.com';
    const subject = 'Pulse Support';

    // Use the electron API to open the email client
    if (window.electron) {
      window.electron.send(
        'openExternalLink',
        `mailto:${email}?subject=${encodeURIComponent(subject)}`
      );
    } else {
      // Fallback for browser or if electron context bridge is not available
      window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleSupportClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors"
        aria-label="Support"
      >
        <span className="font-bold text-sm">?</span>
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 py-2 px-3 bg-neutral-white text-neutral-dark text-sm rounded shadow-md z-10 whitespace-nowrap">
          Kontakt support
        </div>
      )}
    </div>
  );
};

export default SupportButton;
