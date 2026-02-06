import React from 'react';
import { Loader2, PartyPopper, X } from 'lucide-react';
import { ThemeColors } from '../types';
import { resolveHexAndOpacity, hexToRgba } from '../lib/utils';

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  reward: { code: string; message: string } | null;
  colors: ThemeColors;
}

export const RewardModal: React.FC<RewardModalProps> = ({ isOpen, onClose, loading, reward, colors }) => {
  if (!isOpen) return null;

  const textColor = resolveHexAndOpacity(colors.text, '#111111');
  const mutedColor = resolveHexAndOpacity(colors.muted, '#666666');
  const cardBg = resolveHexAndOpacity(colors.cardBackground, '#ffffff');
  const stampInactive = resolveHexAndOpacity(colors.stampInactive, '#dddddd');
  const iconActive = resolveHexAndOpacity(colors.iconActive, '#111111');
  const panelBg = resolveHexAndOpacity(colors.background, '#f5f5f5');
  const borderColor = resolveHexAndOpacity(colors.border, '#e5e7eb');
  const buttonBg = resolveHexAndOpacity(colors.button, '#111111');
  const buttonText = resolveHexAndOpacity(colors.buttonText, '#ffffff');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-bounce-short"
        style={{ backgroundColor: cardBg.hex, color: textColor.hex }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 hover:opacity-70 transition-opacity"
          style={{ color: hexToRgba(mutedColor.hex, mutedColor.opacity) }}
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: stampInactive.hex }}>
            {loading ? (
              <Loader2 className="animate-spin" size={32} style={{ color: iconActive.hex }} />
            ) : (
              <PartyPopper size={32} style={{ color: iconActive.hex }} />
            )}
          </div>
          
          <h2 className="text-2xl font-bold">
            {loading ? "Preparing Reward..." : "Card Completed!"}
          </h2>

          {loading ? (
             <p className="opacity-70" style={{ color: hexToRgba(mutedColor.hex, mutedColor.opacity) }}>
               Using Gemini to generate a special reward just for you.
             </p>
          ) : (
            <>
              <p className="italic" style={{ color: hexToRgba(mutedColor.hex, mutedColor.opacity) }}>"{reward?.message}"</p>
              
              <div
                className="w-full p-4 rounded-lg border-2 border-dashed mt-4"
                style={{ backgroundColor: panelBg.hex, borderColor: borderColor.hex }}
              >
                <p className="text-xs uppercase tracking-wider mb-1 opacity-70" style={{ color: hexToRgba(mutedColor.hex, mutedColor.opacity) }}>
                  Your Discount Code
                </p>
                <p className="text-2xl font-mono font-bold tracking-widest">
                  {reward?.code}
                </p>
              </div>

              <p className="text-xs mt-2 opacity-50" style={{ color: hexToRgba(mutedColor.hex, mutedColor.opacity) }}>
                Present this code at checkout. Valid for 24 hours.
              </p>
            </>
          )}

          {!loading && (
            <button 
              onClick={onClose}
              className="mt-4 w-full py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: buttonBg.hex, color: buttonText.hex }}
            >
              Start New Card
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
