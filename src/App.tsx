import React, { useState, useEffect } from 'react';
import { NavTab, Speaker, RegistrationData } from './types';
import { CONFERENCE_INFO } from './data/conferenceData';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MarqueeBanner } from './components/MarqueeBanner';
import { SpeakersSection } from './components/SpeakersSection';
import { RegistrationSection } from './components/RegistrationSection';
import { ContactsSection } from './components/ContactsSection';
import { SiteFooter } from './components/SiteFooter';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SpeakerModal } from './components/SpeakerModal';
import { DigitalTicketModal } from './components/DigitalTicketModal';
import { AdminConsole } from './components/AdminConsole';
import { AdminAuthModal } from './components/AdminAuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import {
  subscribeToRegistrations,
  fetchCapacity,
  initAuth,
  isAdminAuthenticated,
  verifyTicketWithServer
} from './lib/firebase';

function MainApp() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Modal Dialog States
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [ticketModalData, setTicketModalData] = useState<RegistrationData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Seat Counter & Registrations State (Starts from 0, populated via live Firebase Firestore)
  const [claimedSeats, setClaimedSeats] = useState<number>(0);
  const [allRegistrations, setAllRegistrations] = useState<RegistrationData[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState<boolean>(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // 1. Safe Auth listener
  useEffect(() => {
    const unsubAuth = initAuth(
      (user) => {
        console.info('[Auth] Active session:', user.email);
      },
      () => {
        // Visitor session or signed out
      }
    );
    return () => unsubAuth();
  }, []);

  // 2. Load stored local registrations if present
  const deduplicateRegistrations = (list: RegistrationData[]): RegistrationData[] => {
    const seen = new Set<string>();
    return list.filter((r) => {
      if (!r) return false;
      const key = (r as any).id || r.passId || `${r.phone}-${r.fullName}`;
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // 1. Initial local registrations cache load for instant zero-latency render
  useEffect(() => {
    try {
      const savedList = localStorage.getItem('shift1_all_registrations');
      if (savedList) {
        const parsed: RegistrationData[] = JSON.parse(savedList);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deduped = deduplicateRegistrations(parsed);
          setAllRegistrations(deduped);
          setClaimedSeats(deduped.length);
        }
      }
    } catch (e) {
      console.warn('Local registrations read error:', e);
    }
  }, []);

  // Manual refresh helper directly querying Firestore
  const handleRefreshRegistrations = async () => {
    setIsLoadingRegistrations(true);
    setFirestoreError(null);
    try {
      const { fetchRegistrationsFromFirestore } = await import('./lib/firebase');
      const items = await fetchRegistrationsFromFirestore();
      const deduped = deduplicateRegistrations(items);
      setAllRegistrations(deduped);
      setClaimedSeats(deduped.length);
    } catch (err: any) {
      console.error('[Refresh] Failed to query Firestore:', err);
      setFirestoreError(err?.message || 'Error refreshing registrations from Firestore');
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  // 3. Attendee registrations listener & capacity counter
  useEffect(() => {
    // Immediate capacity counter from public authoritative API
    fetchCapacity()
      .then((cap) => {
        if (cap && typeof cap.claimedSeats === 'number') {
          setClaimedSeats(cap.claimedSeats);
        }
      })
      .catch((e) => console.warn('Capacity fetch notice:', e));

    setIsLoadingRegistrations(true);
    const unsubRegs = subscribeToRegistrations(
      (count, items) => {
        const deduped = deduplicateRegistrations(items);
        setAllRegistrations(deduped);
        setClaimedSeats(Math.max(count, deduped.length));
        setIsLoadingRegistrations(false);
        setFirestoreError(null);
      },
      (err) => {
        setFirestoreError(err.message);
        setIsLoadingRegistrations(false);
      }
    );
    return () => unsubRegs();
  }, []);

  // 4. Restore and authoritatively verify user's own ticket pass on device if saved previously
  useEffect(() => {
    try {
      const savedTicket = localStorage.getItem('shift1_user_registration');
      if (savedTicket) {
        const parsed = JSON.parse(savedTicket);
        if (parsed && parsed.passId) {
          console.info('[Local Pass] Verifying existing attendee pass with backend:', parsed.passId);
          verifyTicketWithServer(parsed.passId).then((res) => {
            if (res.valid && res.ticket) {
              const verifiedReg: RegistrationData = {
                ...parsed,
                ...res.ticket
              };
              localStorage.setItem('shift1_user_registration', JSON.stringify(verifiedReg));
              console.info('[Local Pass] Authoritatively verified ticket pass with server');
            } else if (res.valid === false && res.error?.includes('not found')) {
              // Stale ticket removed on server
              localStorage.removeItem('shift1_user_registration');
              console.warn('[Local Pass] Stale pass removed from device storage');
            }
          });
        }
      }
    } catch (err) {
      console.warn('Could not read saved registration:', err);
    }
  }, []);

  const handleNavigate = (tab: NavTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAdmin = () => {
    if (isAdminAuthenticated()) {
      setActiveTab('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleRegisterSuccess = (newReg: RegistrationData) => {
    setClaimedSeats((prev) => Math.min(CONFERENCE_INFO.totalCapacity, prev + 1));
    setAllRegistrations((prev) => {
      const updated = [newReg, ...prev.filter((r) => r.passId !== newReg.passId)];
      try {
        localStorage.setItem('shift1_all_registrations', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setTicketModalData(newReg);
    try {
      localStorage.setItem('shift1_user_registration', JSON.stringify(newReg));
    } catch {}
  };

  const handleScrollToRegister = () => {
    setActiveTab('register');
    const elem = document.getElementById('register');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToSpeakers = () => {
    if (activeTab !== 'home') {
      setActiveTab('home');
      setTimeout(() => {
        document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // If viewing the Admin Console, render dedicated administrative workspace
  if (activeTab === 'admin') {
    return (
      <div className="min-h-screen bg-[#0B132B] text-white flex flex-col selection:bg-blue-600 selection:text-white">
        <AdminConsole
          registrations={allRegistrations}
          isLoadingRegistrations={isLoadingRegistrations}
          firestoreError={firestoreError}
          onRefresh={handleRefreshRegistrations}
          onClose={() => handleNavigate('home')}
          onViewTicket={(reg) => setTicketModalData(reg)}
        />

        {/* Digital Attendee Pass / Ticket Modal for admin inspection */}
        <DigitalTicketModal
          registration={ticketModalData}
          onClose={() => setTicketModalData(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B132B] text-white flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Main Navigation Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        claimedSeats={claimedSeats}
      />

      {/* Main Content Sections with Morph Transition */}
      <main className="flex-1 pb-16">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
            >
              <HeroSection
                onRegisterClick={handleScrollToRegister}
                onSpeakersClick={handleScrollToSpeakers}
              />
              <MarqueeBanner />
              <SpeakersSection
                onSelectSpeaker={(spk) => setSelectedSpeaker(spk)}
                onRegisterClick={handleScrollToRegister}
              />
              <RegistrationSection
                claimedSeats={claimedSeats}
                onRegisterSuccess={handleRegisterSuccess}
              />
            </motion.div>
          )}

          {activeTab === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
            >
              <RegistrationSection
                claimedSeats={claimedSeats}
                onRegisterSuccess={handleRegisterSuccess}
              />
            </motion.div>
          )}

          {activeTab === 'contacts' && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
            >
              <ContactsSection />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Speaker Details Modal */}
      <SpeakerModal
        speaker={selectedSpeaker}
        onClose={() => setSelectedSpeaker(null)}
        onRegisterClick={() => {
          setSelectedSpeaker(null);
          handleScrollToRegister();
        }}
      />

      {/* Digital Attendee Pass / Ticket Modal */}
      <DigitalTicketModal
        registration={ticketModalData}
        onClose={() => setTicketModalData(null)}
      />

      {/* Site Footer with Discreet Secretariat Link */}
      <SiteFooter
        onSelectTab={handleNavigate}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* Passcode Authentication Modal */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          setActiveTab('admin');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Mobile Sticky Bottom Navigation Dock */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        claimedSeats={claimedSeats}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
