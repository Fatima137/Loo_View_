"use client";

import { useState, useEffect } from 'react';
import type { Toilet, NewToiletFormData, UserProfile } from '@/lib/types';
// import { mockToilets, mockUserProfiles } from '@/lib/data'; // Removed
// import AddToiletDialog from '@/components/add-toilet-dialog'; // Removed
import ToiletDetailsSheet from '@/components/toilet-details-sheet';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_MAP_CENTER, TOILET_FEATURES_CONFIG } from '@/lib/constants';

import HeroSection from '@/components/landing/hero-section';
import RecentlySpottedSection from '@/components/landing/recently-spotted-section';
import MapPreviewSection from '@/components/landing/map-preview-section';
import TopToiletsSection from '@/components/landing/top-toilets-section';
import DirtiestToiletsSection from '@/components/landing/dirtiest-toilets-section';
import WhyContributeSection from '@/components/landing/why-contribute-section';
import AppFooter from '@/components/landing/app-footer';
import PhotoStripSection from '@/components/landing/photo-strip-section';
import LeaderboardSection from '@/components/landing/leaderboard-section';
import RecentReviewsGridSection from '@/components/landing/recent-reviews-grid-section';
import StatsCardsSection from '@/components/landing/stats-cards-section';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';


// import { useAddToiletDialogContext } from '@/contexts/add-toilet-dialog-context'; // Removed

export default function HomePage() {
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [selectedToilet, setSelectedToilet] = useState<Toilet | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [users, setUsers] = useState<UserProfile[]>([]);

  // const { toast } = useToast(); // Toast moved to add-toilet page
  const router = useRouter();
  // const { isDialogOpen, openDialog, closeDialog, initialDialogCoords } = useAddToiletDialogContext(); // Removed

  useEffect(() => {
    async function fetchToilets() {
      const querySnapshot = await getDocs(collection(db, 'toilets'));
      const toiletsData: Toilet[] = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Toilet));
      setToilets(toiletsData);
    }
    fetchToilets();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          setMapCenter(loc);
        },
        () => {
          console.warn("Error getting user location. Using default.");
          setMapCenter(DEFAULT_MAP_CENTER);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.warn("Geolocation not supported. Using default.");
      setMapCenter(DEFAULT_MAP_CENTER);
    }
  }, []);

  // handleAddToiletSubmit is now on /add-toilet page
  // const handleAddToiletSubmit = (data: NewToiletFormData) => { ... }; // Removed

  const handleMarkerClick = (toilet: Toilet) => {
    setSelectedToilet(toilet);
    setIsDetailsSheetOpen(true);
  };
  
  const handleShareExperienceRedirect = () => {
    router.push('/add-toilet');
  };

  const topRatedToilets = toilets.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 3);
  const dirtiestToilets = toilets.filter(t => t.averageRating === 1).slice(0, 3);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeroSection onShareExperienceClick={handleShareExperienceRedirect} />
      <RecentlySpottedSection toilets={toilets.slice(0, 6)} onToiletClick={handleMarkerClick} />
      <StatsCardsSection />
      <PhotoStripSection toilets={toilets.filter(t => t.photoUrls && t.photoUrls.length > 0)} />
      <MapPreviewSection toilets={toilets} onMarkerClick={handleMarkerClick} center={userLocation || mapCenter} />
      <RecentReviewsGridSection toilets={toilets} onToiletClick={handleMarkerClick} />
      <TopToiletsSection toilets={topRatedToilets} onToiletClick={handleMarkerClick} />
      <DirtiestToiletsSection toilets={dirtiestToilets} onToiletClick={handleMarkerClick} />
      <LeaderboardSection />
      <WhyContributeSection />
      <AppFooter />

      {/* AddToiletDialog removed */}
      <ToiletDetailsSheet
        toilet={selectedToilet}
        open={isDetailsSheetOpen}
        onOpenChange={setIsDetailsSheetOpen}
      />
    </div>
  );
}
