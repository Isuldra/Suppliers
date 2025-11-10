import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface SelectToggleButtonProps {
  isSelected: boolean;
  onToggle: () => void;
  selectLabelKey: string;
  removeLabelKey: string;
  size?: 'sm' | 'md';
  className?: string;
}

const SelectToggleButton: React.FC<SelectToggleButtonProps> = ({
  isSelected,
  onToggle,
  selectLabelKey,
  removeLabelKey,
  size = 'md',
  className = '',
}) => {
  const { t } = useTranslation();

  const sizeClasses = size === 'sm' ? 'btn-sm' : '';
  const baseClasses = `btn ${sizeClasses} px-4 py-2 rounded-sm font-medium ease-in-out transition-all duration-200 inline-flex items-center justify-center gap-2`;

  if (isSelected) {
    // Show "Remove" state - secondary button style
    return (
      <button
        onClick={onToggle}
        className={`${baseClasses} btn-secondary bg-primary-dark text-neutral-white hover:bg-primary-light ${className}`}
      >
        <XCircleIcon className="h-4 w-4" />
        <span>{t(removeLabelKey)}</span>
      </button>
    );
  } else {
    // Show "Select" state - primary button style
    return (
      <button
        onClick={onToggle}
        className={`${baseClasses} btn-primary bg-primary text-neutral-white hover:bg-primary-dark ${className}`}
      >
        <CheckCircleIcon className="h-4 w-4" />
        <span>{t(selectLabelKey)}</span>
      </button>
    );
  }
};

export default SelectToggleButton;
