/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs font-semibold text-slate-700">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      title={label}
      className={`w-10 h-5.5 rounded-full relative transition-colors cursor-pointer shrink-0 ${checked ? 'bg-amber-500' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
          checked ? '' : '-translate-x-4.5'
        }`}
      />
    </button>
  </div>
);
