/**
 * ReactionPicker Component
 *
 * Interactive reaction picker overlay with 7 emotion-based reactions for posts and content.
 * Provides Facebook-style reaction selection with smooth animations and hover effects.
 *
 * Features:
 * - 7 distinct reaction types with emoji and color coding
 * - Smooth slide-in animation and scaling hover effects
 * - Click-outside detection for automatic closing
 * - Current reaction highlighting and state management
 * - Tooltip labels on hover with custom styling
 * - Positioned relative to trigger element
 * - Keyboard navigation support (implicit via focus)
 * - Optimized timing to prevent immediate closure
 *
 * Architecture:
 * - Functional component using React hooks for state management
 * - Uses useRef for DOM element references and click detection
 * - Implements useEffect for event listener management
 * - Controlled component pattern with external state management
 * - Positioned absolute overlay with z-index layering
 * - Smooth CSS transitions and transform animations
 *
 * Reaction Types:
 * - Like: 👍 Blue - General approval and positive sentiment
 * - Love: ❤️ Red - Strong positive emotional response
 * - Laugh: 😂 Yellow - Humorous content appreciation
 * - Wow: 😮 Yellow - Surprise or amazement reaction
 * - Sad: 😢 Yellow - Empathy or sadness response
 * - Angry: 😠 Orange - Negative or frustration reaction
 * - Hug: 🤗 Pink - Care and support expression
 *
 * Props:
 * @param onReactionSelect - Callback fired when user selects a reaction type
 * @param currentReaction - Currently active reaction type for highlighting
 * @param isOpen - Boolean controlling picker visibility state
 * @param onClose - Callback fired when picker should be closed
 * @param triggerRef - Reference to trigger button for click-outside detection
 *
 * State Management:
 * - hoveredReaction: Currently hovered reaction for tooltip display
 * - DOM refs for click-outside detection and positioning
 * - Event listener lifecycle management with cleanup
 *
 * Integration Points:
 * - PostCard component for post reactions
 * - Comment component for comment reactions
 * - Reaction API service for server synchronization
 * - Animation system for smooth transitions
 * - Event handling system for user interactions
 */
import React, { useState, useRef, useEffect } from 'react';

interface ReactionPickerProps {
  onReactionSelect: (reactionType: string) => void;
  currentReaction?: string | null;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onReactionSelect,
  currentReaction,
  isOpen,
  onClose,
  triggerRef
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  const reactions = [
    { type: 'like', emoji: '👍', label: 'Like', color: 'text-blue-600' },
    { type: 'love', emoji: '❤️', label: 'Love', color: 'text-red-600' },
    { type: 'laugh', emoji: '😂', label: 'Haha', color: 'text-yellow-600' },
    { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-yellow-600' },
    { type: 'sad', emoji: '😢', label: 'Sad', color: 'text-yellow-600' },
    { type: 'angry', emoji: '😠', label: 'Angry', color: 'text-orange-600' },
    { type: 'hug', emoji: '🤗', label: 'Care', color: 'text-pink-600' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      // Use a small delay to prevent immediate closing
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-2xl border border-gray-200 p-2 flex items-center space-x-1 z-50 animate-in slide-in-from-bottom-2 duration-200"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
      }}
    >
      {reactions.map((reaction) => (
        <button
          key={reaction.type}
          onClick={() => {
            onReactionSelect(reaction.type);
            onClose();
          }}
          onMouseEnter={() => setHoveredReaction(reaction.type)}
          onMouseLeave={() => setHoveredReaction(null)}
          className={`
            relative flex flex-col items-center justify-center w-12 h-12 rounded-full
            transition-all duration-150 hover:scale-125 hover:bg-gray-50
            ${currentReaction === reaction.type ? 'bg-blue-50 scale-110' : ''}
          `}
          title={reaction.label}
        >
          <span className="text-2xl">{reaction.emoji}</span>

          {/* Tooltip */}
          {hoveredReaction === reaction.type && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {reaction.label}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export default ReactionPicker;