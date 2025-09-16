import React, { useState } from 'react';
import { AnimalCategory } from '../types';

interface TreeViewProps {
  categories: AnimalCategory[];
  selectedIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  readOnly?: boolean;
  showIcons?: boolean;
}

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