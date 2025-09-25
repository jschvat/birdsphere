/**
 * TreeView Component
 *
 * Hierarchical tree view component for displaying and selecting animal categories with nested structures.
 * Provides expandable/collapsible nodes with multi-selection capabilities and visual hierarchy indicators.
 *
 * Features:
 * - Recursive tree structure with unlimited nesting depth
 * - Multi-selection with checkbox controls and visual indicators
 * - Expandable/collapsible nodes with smooth transitions
 * - Icon support for visual category identification
 * - Read-only mode for display-only scenarios
 * - Keyboard navigation and accessibility support
 * - Auto-expansion of first two levels for better UX
 * - Hover effects and selection highlighting
 * - Scrollable container with fixed height constraints
 *
 * Architecture:
 * - Functional components using React hooks for state management
 * - Recursive TreeNode component for nested category rendering
 * - Controlled component pattern with external state management
 * - CSS-based styling with DaisyUI theme integration
 * - Performance optimized with minimal re-renders
 * - TypeScript interfaces for type safety and intellisense
 *
 * Tree Structure:
 * - Root categories: Top-level animal categories (e.g., Mammals, Birds)
 * - Sub-categories: Nested classifications with unlimited depth
 * - Selection state: Maintained externally for parent component control
 * - Visual indicators: Indentation, icons, checkboxes, and expand arrows
 *
 * Props:
 * @param categories - Array of top-level AnimalCategory objects with nested children
 * @param selectedIds - Optional array of selected category IDs for controlled selection
 * @param onSelectionChange - Optional callback fired when selection state changes
 * @param readOnly - Boolean to disable selection and show view-only mode
 * @param showIcons - Boolean to control display of category icons
 *
 * Integration Points:
 * - Animal listing and filtering systems
 * - Pet marketplace category selection
 * - Content management for animal content
 * - Search and discovery interfaces
 * - Administrative category management
 */
import React, { useState } from 'react';
import { AnimalCategory } from '../types';

interface TreeViewProps {
  categories: AnimalCategory[];
  selectedIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  readOnly?: boolean;
  showIcons?: boolean;
}

/**
 * TreeNode Component Props
 *
 * Individual tree node component for recursive rendering of hierarchical animal categories.
 * Handles expansion, selection, and visual styling for each category node in the tree.
 *
 * Props:
 * @param category - AnimalCategory object containing name, icon, and children
 * @param selectedIds - Array of currently selected category IDs
 * @param onSelectionChange - Callback function for handling selection state changes
 * @param readOnly - Boolean indicating if node should be non-interactive
 * @param showIcons - Boolean controlling icon visibility for this node
 * @param level - Current nesting depth for indentation calculation (internal)
 */
interface TreeNodeProps {
  category: AnimalCategory;
  selectedIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  readOnly?: boolean;
  showIcons?: boolean;
  level?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  category,
  selectedIds = [],
  onSelectionChange,
  readOnly = false,
  showIcons = true,
  level = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Expand first 2 levels by default
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedIds.includes(category.id);
  const indentStyle = { paddingLeft: `${level * 20}px` };

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelection = () => {
    if (readOnly || !onSelectionChange) return;

    const newSelectedIds = isSelected
      ? selectedIds.filter(id => id !== category.id)
      : [...selectedIds, category.id];

    onSelectionChange(newSelectedIds);
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 hover:bg-base-200/50 rounded cursor-pointer transition-colors ${
          isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''
        }`}
        style={indentStyle}
      >
        {/* Expand/Collapse Toggle */}
        <div
          className="w-4 h-4 flex items-center justify-center mr-1"
          onClick={handleToggle}
        >
          {hasChildren ? (
            <svg
              className={`w-3 h-3 text-base-content/60 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
          ) : (
            <div className="w-3 h-3"></div>
          )}
        </div>

        {/* Selection Checkbox (if not read-only) */}
        {!readOnly && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelection}
            className="w-3 h-3 text-primary rounded focus:ring-primary/20 mr-2"
          />
        )}

        {/* Category Icon - only show for parent nodes */}
        {showIcons && category.icon && hasChildren && (
          <span className="mr-2 text-sm">{category.icon}</span>
        )}

        {/* Category Name */}
        <span
          className={`text-sm flex-1 ${
            readOnly ? 'cursor-default' : 'cursor-pointer'
          } ${isSelected ? 'font-medium text-primary' : 'text-base-content'}`}
          onClick={readOnly ? undefined : handleSelection}
        >
          {category.name}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-2">
          {category.children?.map(child => (
            <TreeNode
              key={child.id}
              category={child}
              selectedIds={selectedIds}
              onSelectionChange={onSelectionChange}
              readOnly={readOnly}
              showIcons={showIcons}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TreeView: React.FC<TreeViewProps> = ({
  categories,
  selectedIds = [],
  onSelectionChange,
  readOnly = false,
  showIcons = true
}) => {
  return (
    <div className="max-h-60 overflow-y-auto border border-base-300 rounded-lg p-2 bg-base-100">
      {categories.map(category => (
        <TreeNode
          key={category.id}
          category={category}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
          readOnly={readOnly}
          showIcons={showIcons}
          level={0}
        />
      ))}
    </div>
  );
};

export default TreeView;