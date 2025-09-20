import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginCredentials } from '../types';

const Login: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData);
      navigate('/timeline');
    } catch (err) {
      // Error is handled by the AuthContext
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed flex relative overflow-hidden gradient-birdsphere">
      
      {/* Golden overlay to enhance the warm theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/20"></div>
      
      {/* Left side - Logo and branding (visible on larger screens) */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-start items-start p-12 relative z-10">
        <div className="text-left max-w-md">
          <h1 className="text-6xl font-bold text-neutral mb-4 drop-shadow-2xl tracking-wide">
            BIRDSPHERE
          </h1>
          <p className="text-neutral text-xl leading-relaxed drop-shadow-lg font-medium">
            Marketplace for Breeders of Exotic Pets<br />
            and Social Media Site
          </p>
          <div className="mt-8 flex space-x-3">
            <div className="w-12 h-1 bg-primary rounded-full"></div>
            <div className="w-8 h-1 bg-secondary rounded-full"></div>
            <div className="w-6 h-1 bg-accent rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 lg:px-8 lg:justify-end lg:pr-16 relative z-10">
        {/* Mobile background overlay for better readability */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-neutral/60 to-accent/80"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo for small screens */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-5xl font-bold text-base-100 mb-3 drop-shadow-xl">
              BIRDSPHERE
            </h1>
            <p className="text-base-100 font-medium drop-shadow-lg">
              Connect with the avian world
            </p>
            <div className="flex justify-center space-x-2 mt-4">
              <div className="w-8 h-1 bg-primary rounded-full"></div>
              <div className="w-6 h-1 bg-secondary rounded-full"></div>
              <div className="w-4 h-1 bg-accent rounded-full"></div>
            </div>
          </div>

          {/* BirdSphere-themed login card */}
          <div className="card-birdsphere rounded-3xl p-8 relative overflow-hidden">
            {/* Golden decoration elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
            
            {/* Subtle bird patterns */}
            <div className="absolute -top-4 -right-4 w-20 h-20 opacity-10">
              <svg className="w-full h-full text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23,11.5C23,11.5 21.5,9 18.5,9C15.5,9 14,11.5 14,11.5V10.5C14,8.57 12.43,7 10.5,7C8.57,7 7,8.57 7,10.5V11.5C7,11.5 5.5,9 2.5,9C1.12,9 0,10.12 0,11.5C0,12.88 1.12,14 2.5,14C5.5,14 7,11.5 7,11.5V12.5C7,14.43 8.57,16 10.5,16C12.43,16 14,14.43 14,12.5V11.5C14,11.5 15.5,14 18.5,14C21.88,14 23,12.88 23,11.5Z"/>
              </svg>
            </div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 opacity-10 rotate-180">
              <svg className="w-full h-full text-secondary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23,11.5C23,11.5 21.5,9 18.5,9C15.5,9 14,11.5 14,11.5V10.5C14,8.57 12.43,7 10.5,7C8.57,7 7,8.57 7,10.5V11.5C7,11.5 5.5,9 2.5,9C1.12,9 0,10.12 0,11.5C0,12.88 1.12,14 2.5,14C5.5,14 7,11.5 7,11.5V12.5C7,14.43 8.57,16 10.5,16C12.43,16 14,14.43 14,12.5V11.5C14,11.5 15.5,14 18.5,14C21.88,14 23,12.88 23,11.5Z"/>
              </svg>
            </div>
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="relative mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary via-secondary to-accent rounded-2xl flex items-center justify-center shadow-xl transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                  <svg className="w-10 h-10 text-primary-content" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23,11.5C23,11.5 21.5,9 18.5,9C15.5,9 14,11.5 14,11.5V10.5C14,8.57 12.43,7 10.5,7C8.57,7 7,8.57 7,10.5V11.5C7,11.5 5.5,9 2.5,9C1.12,9 0,10.12 0,11.5C0,12.88 1.12,14 2.5,14C5.5,14 7,11.5 7,11.5V12.5C7,14.43 8.57,16 10.5,16C12.43,16 14,14.43 14,12.5V11.5C14,11.5 15.5,14 18.5,14C21.88,14 23,12.88 23,11.5Z"/>
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-secondary to-accent rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z"/>
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-base-content mb-3 drop-shadow-lg">
                Welcome Back
              </h2>
              <p className="text-base-content/80 font-medium drop-shadow">
                Sign in to your avian marketplace
              </p>
            </div>

            {/* Error Message */}
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
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
                    placeholder="your@email.com"
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

              <div className="space-y-2">
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
                    placeholder="Enter your password"
                    required
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className={`btn-birdsphere w-full h-12 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 group ${isLoading ? 'animate-pulse' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing you in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>Sign In</span>
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </form>

            {/* Forgot Password */}
            <div className="text-center mt-6">
              <button 
                className="text-sm text-base-content/70 hover:text-base-content transition-colors duration-200 underline underline-offset-2"
                onClick={() => alert('Forgot password functionality coming soon!')}
              >
                Forgot your password?
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center my-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
              <span className="px-4 text-sm font-medium text-base-content bg-base-200/20 rounded-full backdrop-blur-sm">New to BirdSphere?</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
            </div>

            {/* Sign up link */}
            <div className="text-center">
              <Link
                to="/register"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-base-200/30 hover:bg-base-200/50 text-base-content font-semibold rounded-xl border border-base-300/50 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg group backdrop-blur-sm w-full justify-center"
              >
                <span>Create Account</span>
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </Link>
            </div>
          </div>
          
          {/* Footer text */}
          <p className="text-center text-sm text-base-content/70 mt-8 drop-shadow">
            Join thousands of bird enthusiasts in their marketplace
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;