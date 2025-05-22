"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit3, Mail, CalendarDays, Award, Settings, Activity, ShieldCheck } from 'lucide-react';
import { mockUserProfiles } from '@/lib/data';
import type { UserProfile, Toilet } from '@/lib/types';
import { useLocale } from '@/context/locale-context';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { updateProfile, updateEmail } from 'firebase/auth';
import { doc, updateDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export default function ProfilePage() {
  const { t, language } = useLocale();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ displayName: '', email: '', profilePhotoUrl: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [userToilets, setUserToilets] = useState<Toilet[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);

  useEffect(() => {
    setIsClient(true);
    async function fetchUserProfile() {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          setUser({
            id: userDoc.id,
            displayName: profile.displayName || '',
            email: profile.email || '',
            profilePhotoUrl: profile.profilePhotoUrl || '',
            isAdmin: profile.isAdmin || false,
            isBlocked: profile.isBlocked || false,
            contributions: profile.contributions || 0,
            joinedAt: profile.joinedAt || '',
          });
          setFormData({
            displayName: profile.displayName || '',
            email: profile.email || '',
            profilePhotoUrl: profile.profilePhotoUrl || '',
          });
          setImagePreview(profile.profilePhotoUrl || '');
          // Fetch toilets submitted by this user
          const toiletsQuery = query(collection(db, 'toilets'), where('createdBy', '==', userDoc.id));
          const toiletsSnapshot = await getDocs(toiletsQuery);
          const toiletsData: Toilet[] = toiletsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Toilet));
          setUserToilets(toiletsData);
          // Fetch reviews submitted by this user
          const reviewsQuery = query(collection(db, 'reviews'), where('userId', '==', userDoc.id));
          const reviewsSnapshot = await getDocs(reviewsQuery);
          const reviewsData = reviewsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
          setUserReviews(reviewsData);
        }
      }
    }
    fetchUserProfile();
  }, []);

  // Show a generic loading message until client is ready
  if (!isClient) {
    return (
      <div className="flex flex-grow items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-grow items-center justify-center p-4">
        <p>{t('profile.loading')}</p>
      </div>
    );
  }

  // Helper function to map app language codes to date-fns locale objects if needed
  // This is a simplified version; a more robust solution might be required for full coverage
  function languageToDateFnsLocaleSync(langCode: string) {
    // This function should return the locale object synchronously if possible
    // For now, fallback to undefined (date-fns will use default)
    return undefined;
  }

  const formattedJoinedDate = user.joinedAt
    ? format(new Date(user.joinedAt), 'PPP', {
        locale: languageToDateFnsLocaleSync(language.code),
      })
    : 'N/A';

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value || '' });
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    let newProfilePhotoUrl = formData.profilePhotoUrl;
    try {
      // If a new image is selected, upload it (mocked if no Firebase Storage)
      if (imageFile && user.id) {
        const storageRef = ref(storage, `profilePhotos/${user.id}`);
        await uploadBytes(storageRef, imageFile);
        newProfilePhotoUrl = await getDownloadURL(storageRef);
      }
      // Update Firebase Auth profile (if needed)
      if (auth.currentUser) {
        if (auth.currentUser.displayName !== formData.displayName || auth.currentUser.photoURL !== newProfilePhotoUrl) {
          await updateProfile(auth.currentUser, { displayName: formData.displayName, photoURL: newProfilePhotoUrl });
        }
        if (auth.currentUser.email !== formData.email) {
          await updateEmail(auth.currentUser, formData.email);
        }
      }
      // Update Firestore user profile (if you have a users collection)
      if (user.id) {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          displayName: formData.displayName,
          email: formData.email,
          profilePhotoUrl: newProfilePhotoUrl,
        });
      }
      setUser({ ...user, displayName: formData.displayName, email: formData.email, profilePhotoUrl: newProfilePhotoUrl });
      setIsEditing(false);
      setFeedback({ type: 'success', message: t('profile.updateSuccess') || 'Profile updated successfully!' });
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || t('profile.updateError') || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to robustly format Firestore Timestamp, string, or object
  function formatCreatedAt(createdAt: any) {
    if (!createdAt) return 'Unknown';
    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate().toLocaleDateString();
    }
    if (typeof createdAt === 'string') {
      return new Date(createdAt).toLocaleDateString();
    }
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleDateString();
    }
    return 'Unknown';
  }

  return (
    <div className="flex-grow bg-gradient-to-br from-primary/5 via-background to-background py-12 md:py-16">
      <div className="container mx-auto px-4">
        <Card className="max-w-3xl mx-auto shadow-2xl border border-border bg-card">
          <CardHeader className="relative p-0">
            <div className="h-40 sm:h-48 w-full bg-gradient-to-r from-primary/20 to-accent/20 rounded-t-lg">
              {/* Optional: Banner Image */}
               <Image
                src={`https://picsum.photos/seed/${user.id}banner/1200/300`}
                alt={t('profile.bannerAlt')}
                fill
                style={{objectFit: 'cover'}}
                className="rounded-t-lg opacity-50"
                data-ai-hint="abstract background"
              />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 p-1 bg-card rounded-full">
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-card shadow-lg">
                <AvatarImage src={imagePreview || user.profilePhotoUrl || `https://picsum.photos/seed/${user.id}/200/200`} alt={user.displayName} data-ai-hint="profile avatar" />
                <AvatarFallback className="text-3xl">{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </CardHeader>

          <CardContent className="pt-20 text-center">
            {isEditing ? (
              <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-xs mx-auto">
                <div>
                  <label className="block text-left font-medium mb-1" htmlFor="displayName">Enter New Name</label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <label className="block font-medium mb-1" htmlFor="profilePhoto">Profile Image</label>
                  <label htmlFor="profilePhoto" className="cursor-pointer w-32 h-32 flex items-center justify-center border-2 border-dashed border-primary rounded-full bg-muted/30 hover:bg-muted/50 transition mb-2">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="rounded-full h-28 w-28 object-cover" />
                    ) : (
                      <span className="text-muted-foreground">Choose Image</span>
                    )}
                    <input
                      type="file"
                      id="profilePhoto"
                      name="profilePhoto"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">JPG, PNG, or GIF. Max 2MB.</span>
                </div>
                <div className="flex gap-2 justify-center mt-4">
                  <Button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving} className="px-6 py-2 rounded">
                    Cancel
                  </Button>
                </div>
                {feedback && (
                  <div className={`mt-2 text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{feedback.message}</div>
                )}
              </form>
            ) : (
              <>
                <CardTitle className="text-3xl font-bold text-foreground">{user.displayName}</CardTitle>
                {user.badge && (
                  <Badge variant="secondary" className="mt-2 text-sm bg-accent/10 text-accent-foreground border-accent/30">
                    <Award size={16} className="mr-1.5 text-accent" /> {user.badge}
                  </Badge>
                )}
                <p className="text-muted-foreground mt-1">{t('profile.bioPlaceholder')}</p>
              </>
            )}
          </CardContent>

          <div className="px-6 pb-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center text-muted-foreground">
                <Mail size={16} className="mr-2 text-primary" />
                <span>{user.email || 'dummyemail@looview.com'}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <CalendarDays size={16} className="mr-2 text-primary" />
                <span>{t('profile.joinedLabel')} {formattedJoinedDate}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Award size={16} className="mr-2 text-primary" />
                <span>{user.contributions} {t('profile.contributionsLabel')}</span>
              </div>
               <div className="flex items-center text-muted-foreground">
                <ShieldCheck size={16} className="mr-2 text-primary" />
                <span>{user.isAdmin ? t('profile.roleAdmin') : t('profile.roleUser')}</span>
              </div>
            </div>
            
            <Separator />

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                <Activity size={20} className="mr-2 text-primary" /> {t('profile.recentActivityTitle')}
              </h3>
              <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                {userToilets.length === 0 ? (
                  <p>No recent activity yet.</p>
                ) : (
                  <div className="space-y-4">
                    {userToilets.map((toilet) => {
                      const review = userReviews.find(r => r.toiletId === toilet.id);
                      return (
                        <div key={toilet.id} className="border rounded-lg p-3 bg-card text-left">
                          <div className="font-semibold">{toilet.name}</div>
                          <div className="text-xs text-muted-foreground mb-1">{formatCreatedAt(toilet.createdAt)}</div>
                          {review && review.comment && (
                            <div className="italic text-sm mb-1">"{review.comment}"</div>
                          )}
                          <div className="text-xs">Rating: {review ? review.rating : (toilet.averageRating || 'N/A')}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
             <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                <Settings size={20} className="mr-2 text-primary" /> {t('profile.settingsTitle')}
              </h3>
              <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                 <p>{t('profile.settingsPlaceholder')}</p>
                <Button variant="outline" className="mt-2" onClick={() => setIsEditing(true)}>{t('profile.manageSettings')}</Button>
              </div>
            </div>

          </div>
          
          <CardFooter className="p-6 border-t border-border">
            {isEditing ? null : (
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setIsEditing(true)}>
                <Edit3 size={18} className="mr-2" /> {t('profile.editProfile')}
              </Button>
            )}
          </CardFooter>
        </Card>

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Your Submitted Toilets</h2>
          {userToilets.length === 0 ? (
            <p className="text-muted-foreground">You haven't submitted any toilets yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {userToilets.map((toilet) => (
                <div key={toilet.id} className="border rounded-lg p-4 bg-card shadow">
                  <h3 className="font-semibold text-lg mb-1">{toilet.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{toilet.address}</p>
                  {toilet.photoUrls && toilet.photoUrls.length > 0 && (
                    <img src={toilet.photoUrls[0]} alt={toilet.name} className="w-full h-32 object-cover rounded mb-2" />
                  )}
                  <p className="text-sm">Rating: {toilet.averageRating || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Submitted on: {formatCreatedAt(toilet.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
