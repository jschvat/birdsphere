import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { uploadService } from '../services/uploadService';
import { User } from '../types';

const Profile: React.FC = () => {
  const { user, updateProfile, logout, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('Profile useEffect - Auth state:', {
      user: !!user,
      isLoading,
      userId: user?.id
    });

    if (!user && !isLoading) {
      console.log('Profile - Redirecting to login: no user and not loading');
      navigate('/login');
      return;
    }

    if (!user) {
      console.log('Profile - No user but still loading, waiting...');
      return;
    }
    
    console.log('Profile component - user data:', JSON.stringify(user, null, 2));
    console.log('Location data:', {
      locationCity: user!.locationCity,
      locationState: user!.locationState,
      locationCountry: user!.locationCountry
    });
    
    setFormData({
      firstName: user!.firstName || '',
      lastName: user!.lastName || '',
      phone: user!.phone || '',
      bio: user!.bio || '',
      locationCity: user!.locationCity || '',
      locationState: user!.locationState || '',
      locationCountry: user!.locationCountry || '',
      isBreeder: user!.isBreeder || false,
    });
  }, [user, navigate, isLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    if (error) clearError();
    if (updateSuccess) setUpdateSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      setIsEditing(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      // Error is handled by the AuthContext
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    console.log('Avatar clicked!'); // Debug log
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      
      // Upload avatar
      const response = await uploadService.uploadAvatar(file);
      
      // Update user profile with new avatar URL
      await updateProfile({ profileImage: response.avatarUrl });
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.profileImage) {
      return user.profileImage.startsWith('http') 
        ? user.profileImage 
        : `http://localhost:3000${user.profileImage}`;
    }
    return null;
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-birdsphere py-8 relative overflow-hidden">
      {/* Golden overlay to enhance the warm theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/20"></div>
      
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="card-birdsphere shadow-2xl border-0 backdrop-blur-sm">
          <div className="card-body p-8">
            <div className="flex flex-col md:flex-row justify-between items-start mb-8">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="relative group mr-4">
                  <div 
                    className="w-20 h-20 rounded-full overflow-hidden shadow-xl cursor-pointer transition-all duration-300 group-hover:shadow-2xl group-hover:scale-105 relative z-10"
                    onClick={handleAvatarClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAvatarClick();
                      }
                    }}
                    title="Click to change profile picture"
                  >
                    {getAvatarUrl() ? (
                      <img 
                        src={getAvatarUrl()!} 
                        alt="Profile" 
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
                        <svg className="w-10 h-10 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center rounded-full">
                      <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        Change
                      </span>
                    </div>
                  </div>
                  
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-lg group-hover:bg-primary/10 transition-colors duration-200 pointer-events-none">
                    {isUploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 text-primary group-hover:text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                      </svg>
                    )}
                  </div>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
                
                <div>
                  <h1 className="text-3xl font-bold text-base-content mb-1 drop-shadow-lg">My Profile</h1>
                  <p className="text-base-content/80 font-medium drop-shadow">
                    Manage your account information and preferences
                  </p>
                  <p className="text-sm text-base-content/70 mt-1">
                    <span className="cursor-pointer text-primary hover:text-secondary underline underline-offset-2 transition-colors duration-200" onClick={handleAvatarClick}>
                      Click here or on your avatar to upload a new profile picture
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleAvatarClick}
                  className={`btn-birdsphere rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:scale-105 active:scale-95 flex items-center space-x-2 ${isUploadingAvatar ? 'animate-pulse' : ''}`}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                      </svg>
                      <span>Upload Avatar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="btn bg-gradient-to-r from-secondary to-accent hover:from-accent hover:to-secondary border-0 text-primary-content font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:scale-105 active:scale-95"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="btn bg-base-200/30 hover:bg-base-200/50 border border-base-300/50 text-base-content hover:text-base-content font-semibold rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                    </svg>
                    <span>Logout</span>
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-error/20 backdrop-blur-sm border border-error/30 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-error font-medium">{error}</span>
                </div>
              </div>
            )}

            {updateSuccess && (
              <div className="mb-6 p-4 bg-success/20 backdrop-blur-sm border border-success/30 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-success font-medium">Profile updated successfully!</span>
                </div>
              </div>
            )}

            {!isEditing ? (
              // View Mode
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-xl border border-primary/20 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-base-content mb-6 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                      </svg>
                      Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-base-100/80 p-4 rounded-lg shadow-sm border border-primary/10">
                        <label className="text-sm font-semibold text-base-content/70">Full Name</label>
                        <p className="text-lg text-base-content font-medium">{user.firstName} {user.lastName}</p>
                      </div>
                      <div className="bg-base-100/80 p-4 rounded-lg shadow-sm border border-primary/10">
                        <label className="text-sm font-semibold text-base-content/70">Username</label>
                        <p className="text-lg text-base-content font-medium">@{user.username}</p>
                      </div>
                      <div className="bg-base-100/80 p-4 rounded-lg shadow-sm border border-primary/10">
                        <label className="text-sm font-semibold text-base-content/70">Email</label>
                        <p className="text-lg text-base-content font-medium">{user.email}</p>
                      </div>
                      <div className="bg-base-100/80 p-4 rounded-lg shadow-sm border border-primary/10">
                        <label className="text-sm font-semibold text-base-content/70">Phone</label>
                        <p className="text-lg text-base-content font-medium">{user.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-secondary/10 to-accent/10 p-6 rounded-xl border border-secondary/20 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-base-content mb-6 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Account Details
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-base-100/80 p-4 rounded-lg shadow-sm border border-secondary/10">
                        <label className="text-sm font-semibold text-base-content/70">Account Type</label>
                        <div className="mt-1">
                          {user.isBreeder ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary border border-primary/30">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23,11.5C23,11.5 21.5,9 18.5,9C15.5,9 14,11.5 14,11.5V10.5C14,8.57 12.43,7 10.5,7C8.57,7 7,8.57 7,10.5V11.5C7,11.5 5.5,9 2.5,9C1.12,9 0,10.12 0,11.5C0,12.88 1.12,14 2.5,14C5.5,14 7,11.5 7,11.5V12.5C7,14.43 8.57,16 10.5,16C12.43,16 14,14.43 14,12.5V11.5C14,11.5 15.5,14 18.5,14C21.88,14 23,12.88 23,11.5Z"/>
                              </svg>
                              Breeder
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary/20 text-secondary border border-secondary/30">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
                              </svg>
                              Enthusiast
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-base-100/80 p-4 rounded-lg shadow-sm border border-secondary/10">
                        <label className="text-sm font-semibold text-base-content/70">Status</label>
                        <div className="mt-1">
                          {user.isVerified ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success/20 text-success border border-success/30">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                              </svg>
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-warning/20 text-warning border border-warning/30">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                              Unverified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-base-100/80 p-4 rounded-lg shadow-sm border border-secondary/10">
                        <label className="text-sm font-semibold text-base-content/70">Member Since</label>
                        <p className="text-lg text-base-content font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {user.bio && (
                  <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-6 rounded-xl border border-accent/20 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-base-content mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd"/>
                      </svg>
                      About Me
                    </h3>
                    <div className="bg-base-100/80 p-4 rounded-lg shadow-sm border border-accent/10">
                      <p className="text-base-content leading-relaxed">{user.bio}</p>
                    </div>
                  </div>
                )}

                {(user.locationCity || user.locationState || user.locationCountry) && (
                  <div className="bg-gradient-to-r from-secondary/10 to-primary/10 p-6 rounded-xl border border-secondary/20 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-base-content mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                      Location
                    </h3>
                    <div className="bg-base-100/80 p-4 rounded-lg shadow-sm border border-secondary/10">
                      <p className="text-lg text-base-content font-medium flex items-center">
                        <svg className="w-4 h-4 mr-2 text-base-content/60" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                        </svg>
                        {[user.locationCity, user.locationState, user.locationCountry]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Edit Mode
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-base-content mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName || ''}
                      onChange={handleChange}
                      className="input-birdsphere w-full h-12 px-4 text-base rounded-xl transition-all duration-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-base-content mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName || ''}
                      onChange={handleChange}
                      className="input-birdsphere w-full h-12 px-4 text-base rounded-xl transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-base-content mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="input-birdsphere w-full h-12 px-4 text-base rounded-xl transition-all duration-300"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-base-content mb-2">
                    Bio (Optional)
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleChange}
                    className="input-birdsphere w-full px-4 py-3 text-base rounded-xl transition-all duration-300 resize-none"
                    placeholder="Tell us about yourself and your interest in birds..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center my-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                  <span className="px-4 text-sm font-medium text-base-content bg-base-200/20 rounded-full backdrop-blur-sm">Location</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-base-content mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="locationCity"
                      value={formData.locationCity || ''}
                      onChange={handleChange}
                      className="input-birdsphere w-full h-12 px-4 text-base rounded-xl transition-all duration-300"
                      placeholder="New York"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-base-content mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="locationState"
                      value={formData.locationState || ''}
                      onChange={handleChange}
                      className="input-birdsphere w-full h-12 px-4 text-base rounded-xl transition-all duration-300"
                      placeholder="NY"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-base-content mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      name="locationCountry"
                      value={formData.locationCountry || ''}
                      onChange={handleChange}
                      className="input-birdsphere w-full h-12 px-4 text-base rounded-xl transition-all duration-300"
                      placeholder="USA"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
                  <input
                    type="checkbox"
                    name="isBreeder"
                    checked={formData.isBreeder || false}
                    onChange={handleChange}
                    className="w-5 h-5 text-primary rounded focus:ring-primary/20"
                  />
                  <label className="text-sm font-medium text-base-content flex items-center space-x-2">
                    <span>I am a professional bird breeder</span>
                    <svg className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23,11.5C23,11.5 21.5,9 18.5,9C15.5,9 14,11.5 14,11.5V10.5C14,8.57 12.43,7 10.5,7C8.57,7 7,8.57 7,10.5V11.5C7,11.5 5.5,9 2.5,9C1.12,9 0,10.12 0,11.5C0,12.88 1.12,14 2.5,14C5.5,14 7,11.5 7,11.5V12.5C7,14.43 8.57,16 10.5,16C12.43,16 14,14.43 14,12.5V11.5C14,11.5 15.5,14 18.5,14C21.88,14 23,12.88 23,11.5Z"/>
                    </svg>
                  </label>
                </div>

                <div className="mt-8">
                  <button
                    type="submit"
                    className={`btn-birdsphere w-full h-12 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 group ${isLoading ? 'animate-pulse' : ''}`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating Profile...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>Update Profile</span>
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;