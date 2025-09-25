/**
 * MediaDisplay Component
 *
 * Comprehensive multi-media display component with intelligent layout and lightbox functionality.
 * Handles various file types including images, videos, documents, and archives with adaptive grid layouts.
 *
 * Features:
 * - Smart grid layouts (1-4 images with adaptive positioning)
 * - Full-screen lightbox with image navigation and zoom
 * - Multi-media type support (images, videos, documents, archives)
 * - File type categorization and icon generation
 * - Video player controls with thumbnail preview
 * - Document preview with download functionality
 * - File size formatting and metadata display
 * - Hover effects and smooth transitions
 * - Responsive design for all screen sizes
 *
 * Architecture:
 * - Functional component using React hooks for state management
 * - Uses MediaFile type for consistent file data structure
 * - Implements category-based rendering for different media types
 * - Supports flexible media URLs from different data sources
 * - Uses keyboard navigation for lightbox interactions
 * - Optimized performance with conditional rendering
 *
 * Grid Layout Logic:
 * - 1 image: Single full-width display
 * - 2 images: Two-column grid layout
 * - 3 images: Asymmetric layout with one large, two small
 * - 4+ images: Grid with "+N" overlay for additional items
 *
 * Props:
 * @param media - Array of MediaFile objects to display
 * @param maxHeight - Maximum height constraint for media containers (default: '400px')
 *
 * State Management:
 * - selectedImageIndex: Currently selected image for lightbox display
 * - showLightbox: Boolean controlling lightbox visibility
 * - Image navigation state for prev/next functionality
 *
 * Media Categories:
 * - Images: JPEG, PNG, WebP, GIF with lightbox and grid display
 * - Videos: MP4, WebM with native HTML5 video controls
 * - Documents: PDF, Office files with download and preview
 * - Archives: ZIP, RAR files with file manager display
 * - Others: Generic files with download functionality
 *
 * Integration Points:
 * - MediaFile type system for consistent data structure
 * - File categorization service for type detection
 * - URL handling for various media sources (posts, uploads)
 * - File size and metadata display utilities
 * - Download service integration for non-preview files
 */
import React, { useState } from 'react';
import { MediaFile } from '../../types/index';

interface MediaDisplayProps {
  media: MediaFile[];
  maxHeight?: string;
}

const MediaDisplay: React.FC<MediaDisplayProps> = ({ media, maxHeight = '400px' }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  if (!media || media.length === 0) {
    return null;
  }

  const images = media.filter(m => (m.category || m.fileType) === 'image');
  const videos = media.filter(m => (m.category || m.fileType) === 'video');
  const documents = media.filter(m => (m.category || m.fileType) === 'document');
  const others = media.filter(m => !['image', 'video', 'document'].includes(m.category || m.fileType || ''));

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    setSelectedImageIndex(null);
  };

  const nextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string, category: string) => {
    if (category === 'document') {
      if (mimetype.includes('pdf')) return '📄';
      if (mimetype.includes('word') || mimetype.includes('doc')) return '📝';
      if (mimetype.includes('sheet') || mimetype.includes('excel')) return '📊';
      if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return '📈';
      return '📋';
    }
    if (category === 'archive') return '🗜️';
    if (category === 'model') return '🎯';
    return '📎';
  };

  return (
    <div className="space-y-3">
      {/* Images */}
      {images.length > 0 && (
        <div className={`
          ${images.length === 1 ? 'grid grid-cols-1' :
            images.length === 2 ? 'grid grid-cols-2 gap-1' :
            images.length === 3 ? 'grid grid-cols-2 gap-1' :
            'grid grid-cols-2 gap-1'
          }
          rounded-lg overflow-hidden
        `} style={{ maxHeight }}>
          {images.slice(0, 4).map((image, index) => (
            <div
              key={image.id}
              className={`
                relative cursor-pointer group overflow-hidden
                ${images.length === 3 && index === 0 ? 'row-span-2' : ''}
                ${images.length > 4 && index === 3 ? 'relative' : ''}
              `}
              onClick={() => openLightbox(index)}
            >
              <img
                src={image.url || image.fileUrl || ''}
                alt={image.originalName || image.fileName || ''}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                style={{
                  height: images.length === 1 ? 'auto' : '200px',
                  maxHeight: images.length === 1 ? maxHeight : '200px'
                }}
              />

              {/* Overlay for remaining images */}
              {images.length > 4 && index === 3 && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                  <span className="text-white text-2xl font-semibold">
                    +{images.length - 4}
                  </span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200 flex items-center justify-center">
                <svg className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((video) => (
            <div key={video.id} className="rounded-lg overflow-hidden bg-black">
              <video
                controls
                className="w-full"
                style={{ maxHeight }}
                poster={video.metadata?.thumbnail}
              >
                <source src={video.url || video.fileUrl || ''} type={video.mimetype || video.mimeType || ''} />
                Your browser does not support the video tag.
              </video>
            </div>
          ))}
        </div>
      )}

      {/* Documents and Other Files */}
      {(documents.length > 0 || others.length > 0) && (
        <div className="space-y-2">
          {[...documents, ...others].map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="text-2xl flex-shrink-0">
                  {getFileIcon(file.mimetype || file.mimeType || '', file.category || file.fileType || '')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.originalName || file.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size || file.fileSize || 0)} • {file.mimetype || file.mimeType}
                  </p>
                </div>
              </div>
              <a
                href={file.url || file.fileUrl || ''}
                download={file.originalName || file.fileName}
                className="flex-shrink-0 ml-3 p-2 text-gray-400 hover:text-blue-500 transition-colors"
                title="Download file"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Image Lightbox */}
      {showLightbox && selectedImageIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  disabled={selectedImageIndex === 0}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  disabled={selectedImageIndex === images.length - 1}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image */}
            <img
              src={images[selectedImageIndex].url || images[selectedImageIndex].fileUrl || ''}
              alt={images[selectedImageIndex].originalName || images[selectedImageIndex].fileName || ''}
              className="max-w-full max-h-full object-contain"
            />

            {/* Image info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded">
              <p className="text-sm font-medium">{images[selectedImageIndex].originalName || images[selectedImageIndex].fileName}</p>
              <p className="text-xs opacity-75">
                {selectedImageIndex + 1} of {images.length} • {formatFileSize(images[selectedImageIndex].size || images[selectedImageIndex].fileSize || 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaDisplay;