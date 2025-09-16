import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RegisterData } from '../types';

const Register: React.FC = () => {
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    bio: '',
    locationCity: '',
    locationState: '',
    locationCountry: '',
    userRoles: [],
    animalInterests: [],
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [step, setStep] = useState(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    if (error) clearError();
    if (passwordError) setPasswordError('');
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (passwordError) setPasswordError('');
  };

  const validateStep1 = (): boolean => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.username) {
      return false;
    }
    if (formData.password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(formData);
      navigate('/profile');
    } catch (err) {
      // Error is handled by the AuthContext
    }
  };

  return (
    <div className="min-h-screen gradient-birdsphere flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-40 w-72 h-72 bg-gradient-to-tr from-accent/20 to-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-secondary/10 to-accent/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Floating card with glass morphism */}
        <div className="card-birdsphere backdrop-blur-xl rounded-3xl p-8 relative overflow-hidden">
          {/* Card decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step === 1 ? 'bg-gradient-to-r from-primary to-secondary text-primary-content' : step > 1 ? 'bg-primary text-primary-content' : 'bg-gray-200 text-gray-400'}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <div className={`w-16 h-1 rounded-full transition-all duration-300 ${step > 1 ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step === 2 ? 'bg-gradient-to-r from-primary to-secondary text-primary-content' : 'bg-gray-200 text-gray-400'}`}>
                2
              </div>
            </div>
          </div>
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary via-secondary to-accent rounded-2xl flex items-center justify-center shadow-xl transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <svg className="w-12 h-12 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-r from-secondary to-accent rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-base-content mb-3">
              Join BirdSphere
            </h1>
            <p className="text-base-content/80 font-medium">
              {step === 1 ? 'Create your account in just 2 steps' : 'Tell us about yourself'}
            </p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-accent mx-auto mt-4 rounded-full"></div>
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

          {passwordError && (
            <div className="mb-6 p-4 bg-warning/20 backdrop-blur-sm border border-warning/30 rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                </div>
                <span className="text-warning-content font-medium">{passwordError}</span>
              </div>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-base-content mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input-birdsphere w-full h-12 px-4 text-base rounded-xl transition-all duration-300"
                    placeholder="John"
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
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input-birdsphere w-full h-12 px-4 text-base rounded-xl transition-all duration-300"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-base-content mb-2">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="input-birdsphere w-full h-12 px-4 pr-12 text-base rounded-xl transition-all duration-300"
                    placeholder="johndoe"
                    required
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-base-content mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-birdsphere w-full h-12 px-4 pr-12 text-base rounded-xl transition-all duration-300"
                    placeholder="john@example.com"
                    required
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-base-content mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="input-birdsphere w-full h-12 px-4 pr-12 text-base rounded-xl transition-all duration-300"
                      placeholder="••••••••"
                      required
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-base-content mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      className="input-birdsphere w-full h-12 px-4 pr-12 text-base rounded-xl transition-all duration-300"
                      placeholder="••••••••"
                      required
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-birdsphere w-full h-12 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 group"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Continue</span>
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-base-content mb-2">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-birdsphere w-full h-12 px-4 pr-12 text-base rounded-xl transition-all duration-300"
                    placeholder="+1 (555) 123-4567"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-base-content mb-2">
                  Bio (Optional)
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="input-birdsphere w-full px-4 py-3 text-base rounded-xl transition-all duration-300 resize-none"
                  placeholder="Tell us about your passion for birds..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-base-content mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="locationCity"
                    value={formData.locationCity}
                    onChange={handleChange}
                    className="input-birdsphere w-full h-12 px-4 text-base rounded-xl transition-all duration-300"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-base-content mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="locationState"
                    value={formData.locationState}
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
                    value={formData.locationCountry}
                    onChange={handleChange}
                    className="input-birdsphere w-full h-12 px-4 text-base rounded-xl transition-all duration-300"
                    placeholder="USA"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-base-content mb-2">
                  User Roles (Select all that apply)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: 'breeder', label: 'Professional Breeder', icon: 'M23,11.5C23,11.5 21.5,9 18.5,9C15.5,9 14,11.5 14,11.5V10.5C14,8.57 12.43,7 10.5,7C8.57,7 7,8.57 7,10.5V11.5C7,11.5 5.5,9 2.5,9C1.12,9 0,10.12 0,11.5C0,12.88 1.12,14 2.5,14C5.5,14 7,11.5 7,11.5V12.5C7,14.43 8.57,16 10.5,16C12.43,16 14,14.43 14,12.5V11.5C14,11.5 15.5,14 18.5,14C21.88,14 23,12.88 23,11.5Z' },
                    { value: 'buyer', label: 'Buyer/Enthusiast', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01' },
                    { value: 'trainer', label: 'Bird Trainer', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
                    { value: 'rescue_operator', label: 'Rescue Operator', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
                    { value: 'enthusiast', label: 'Bird Enthusiast', icon: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z' }
                  ].map((role) => (
                    <div key={role.value} className="flex items-center space-x-3 p-3 bg-primary/10 rounded-xl border border-primary/20">
                      <input
                        type="checkbox"
                        id={`role-${role.value}`}
                        checked={(formData.userRoles || []).includes(role.value)}
                        onChange={(e) => {
                          const currentRoles = formData.userRoles || [];
                          const newRoles = e.target.checked
                            ? [...currentRoles, role.value]
                            : currentRoles.filter(r => r !== role.value);
                          setFormData({ ...formData, userRoles: newRoles });
                        }}
                        className="w-4 h-4 text-primary rounded focus:ring-primary/20"
                      />
                      <label htmlFor={`role-${role.value}`} className="text-sm font-medium text-base-content flex items-center space-x-2 cursor-pointer">
                        <span>{role.label}</span>
                        <svg className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                          <path d={role.icon}/>
                        </svg>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 h-12 bg-base-200/30 hover:bg-base-200/50 text-base-content font-semibold rounded-xl border border-base-300/50 transition-all duration-300 transform hover:-translate-y-0.5 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/>
                    </svg>
                    <span>Back</span>
                  </div>
                </button>
                <button
                  type="submit"
                  className={`btn-birdsphere flex-1 h-12 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 group ${isLoading ? 'animate-pulse' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>Create Account</span>
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <>
              {/* Divider */}
              <div className="flex items-center my-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                <span className="px-4 text-sm font-medium text-base-content bg-base-200/20 rounded-full backdrop-blur-sm">Already have an account?</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
              </div>

              {/* Sign in link */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-base-200/30 hover:bg-base-200/50 text-base-content font-semibold rounded-xl border border-base-300/50 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg group backdrop-blur-sm w-full justify-center"
                >
                  <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/>
                  </svg>
                  <span>Sign In</span>
                </Link>
              </div>
            </>
          )}
        </div>
        
        {/* Footer text */}
        <p className="text-center text-sm text-base-content/70 mt-8 drop-shadow">
          Connect with passionate bird lovers from around the world
        </p>
      </div>
    </div>
  );
};

export default Register;