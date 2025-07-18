"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DateRangePicker from '@/components/DateRangePicker';
import { useAuth } from '@/components/AuthProvider';
import { Loader } from '@googlemaps/js-api-loader';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  // Refs for autocomplete
  const cityInputRef = useRef<HTMLInputElement>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);
  const cityAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const stateAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Available amenities options (same as create listing)
  const availableAmenities = [
    'Furnished',
    'WiFi',
    'Utilities Included',
    'On-Street Parking',
    'Driveway Parking',
    'Garage Parking',
    'Gym Access',
    'In-Unit Laundry',
    'Shared Laundry',
    'Air Conditioning',
    'Dishwasher',
    'Balcony'
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (city) params.append('city', city);
    if (state) params.append('state', state);
    if (priceMin || priceMax) {
      const priceRange = priceMin && priceMax ? `${priceMin}-${priceMax}` : 
                        priceMin ? `${priceMin}+` : 
                        priceMax ? `0-${priceMax}` : '';
      if (priceRange) params.append('price', priceRange);
    }
    if (startDate && endDate) {
      const durationRange = `${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      params.append('duration', durationRange);
    }
    if (selectedAmenities.length > 0) {
      params.append('amenities', selectedAmenities.join(','));
    }
    
    router.push(`/listings?${params.toString()}`);
  };

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  // Initialize Google Maps autocomplete
  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        // Initialize city autocomplete
        if (cityInputRef.current && window.google) {
          cityAutocompleteRef.current = new window.google.maps.places.Autocomplete(
            cityInputRef.current,
            {
              types: ['(cities)'],
              componentRestrictions: { country: 'us' }
            }
          );

          cityAutocompleteRef.current.addListener('place_changed', () => {
            const place = cityAutocompleteRef.current?.getPlace();
            if (place && place.address_components) {
              let cityName = '';
              let stateName = '';

              for (const component of place.address_components) {
                const types = component.types;
                if (types.includes('locality')) {
                  cityName = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                  stateName = component.short_name;
                }
              }

              if (cityName) {
                setCity(cityName);
                setState(stateName);
              }
            }
          });
        }

        // Initialize state autocomplete
        if (stateInputRef.current && window.google) {
          stateAutocompleteRef.current = new window.google.maps.places.Autocomplete(
            stateInputRef.current,
            {
              types: ['administrative_area_level_1'],
              componentRestrictions: { country: 'us' }
            }
          );

          stateAutocompleteRef.current.addListener('place_changed', () => {
            const place = stateAutocompleteRef.current?.getPlace();
            if (place && place.address_components) {
              let stateName = '';

              for (const component of place.address_components) {
                const types = component.types;
                if (types.includes('administrative_area_level_1')) {
                  stateName = component.short_name;
                  break;
                }
              }

              if (stateName) {
                setState(stateName);
              }
            }
          });
        }
      } catch (error) {
        console.error('Error loading Google Maps API for dashboard autocomplete:', error);
      }
    };

    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      initAutocomplete();
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Fetch user profile to get profile picture
      const fetchProfile = async () => {
        try {
          const response = await fetch(`/api/user?supabaseId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            setProfilePicture(data.user.profilePicture || null);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      };
      
      fetchProfile();
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-blue-900">
      {/* Navigation Bar */}
      <nav className="bg-blue-800 shadow-lg border-b border-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center pt-1 hover:opacity-80 transition-opacity"
              >
                <Image 
                  src="/SlugletLogoYellow.svg" 
                  alt="Sluglet Logo" 
                  width={80} 
                  height={40}
                  priority
                />
              </button>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  {/* Add Listing Button */}
                  <button
                    onClick={() => router.push('/create-listing')}
                    className="p-2 bg-yellow-500 text-blue-900 rounded-full hover:bg-yellow-400 transition"
                    title="Add Listing"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>

                  {/* Profile Icon */}
                  <button
                    onClick={() => router.push('/profile')}
                    className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center hover:bg-yellow-400 transition overflow-hidden"
                    title="Profile"
                  >
                    {profilePicture ? (
                      <Image
                        src={profilePicture}
                        alt="Profile"
                        width={40}
                        height={40}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Sign Out */}
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-blue-200 hover:text-white transition"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  {/* Login/Sign Up Button */}
                  <button
                    onClick={() => router.push('/auth')}
                    className="px-4 py-2 bg-yellow-500 text-blue-900 rounded-lg hover:bg-yellow-400 transition font-semibold"
                  >
                    Log In / Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            Find Your Perfect Sublet
          </h1>
          <p className="text-lg text-blue-200 mb-8">
            Search for available sublets in your area or create your own listing
          </p>
          
          {/* Search Section */}
          <div className="max-w-6xl mx-auto mb-12">
            <form onSubmit={handleSearch} className="bg-blue-800 rounded-lg p-6 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-4">
                {/* Search Query */}
                <div className="lg:col-span-4">
                  <input
                    type="text"
                    placeholder="Search listings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 border border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-text placeholder-muted"
                  />
                </div>
                {/* City with Autocomplete */}
                <div className="lg:col-span-2">
                  <input
                    ref={cityInputRef}
                    type="text"
                    placeholder="City..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 border border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-text placeholder-muted"
                  />
                </div>
                {/* State with Autocomplete */}
                <div className="lg:col-span-1">
                  <input
                    ref={stateInputRef}
                    type="text"
                    placeholder="State..."
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 border border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-text placeholder-muted"
                  />
                </div>
                
                {/* Price Range */}
                <div className="lg:col-span-2 flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    min="0"
                    className="w-20 px-2 py-3 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-blue-700 text-white placeholder-blue-300 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    min="0"
                    className="w-20 px-2 py-3 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-blue-700 text-white placeholder-blue-300 text-sm"
                  />
                </div>
                
                {/* Date Range */}
                <div className="lg:col-span-3">
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    placeholder="Select dates"
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Amenity Filters */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableAmenities.map((amenity) => (
                    <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                        className="w-4 h-4 text-yellow-500 bg-blue-700 border-blue-600 rounded focus:ring-yellow-400 focus:ring-2"
                      />
                      <span className="text-blue-200 text-sm">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Search Button */}
              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  className="px-8 py-3 bg-yellow-500 text-blue-900 rounded-lg hover:bg-yellow-400 transition font-semibold text-lg"
                >
                  Search Listings
                </button>
              </div>
            </form>
          </div>
          
          {/* Quick Actions */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push('/listings')}
              className="px-6 py-3 bg-yellow-500 text-blue-900 rounded-lg hover:bg-yellow-400 transition font-semibold"
            >
              Browse All Listings
            </button>
            {user ? (
              <button
                onClick={() => router.push('/create-listing')}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold"
              >
                Create New Listing
              </button>
            ) : (
              <button
                onClick={() => router.push('/auth')}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold"
              >
                Login to Create Listing
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 