import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import ActivityLogs from './pages/ActivityLogs';

// Content Management
import DuasManagement from './pages/DuasManagement';
import DuaCategoriesManagement from './pages/DuaCategoriesManagement';
import DhikrCategoriesManagement from './pages/DhikrCategoriesManagement';
import DhikrTypesManagement from './pages/DhikrTypesManagement';
import ThasbeehsManagement from './pages/ThasbeehsManagement';
import FastingTypesManagement from './pages/FastingTypesManagement';
import QuranReadingContentPage from './pages/QuranReadingContentPage';
import QuranMemorizationContentPage from './pages/QuranMemorizationContentPage';
import VerseImportancePage from './pages/VerseImportancePage';
import DhikrImportancePage from './pages/DhikrImportancePage';
import DuaImportancePage from './pages/DuaImportancePage';
import LibraryPage from './pages/LibraryPage';
import LibraryEntriesPage from './pages/LibraryEntriesPage';
import SpecialModelsPage from './pages/SpecialModelsPage';
import SpecialEntriesPage from './pages/SpecialEntriesPage';
import DailyQuotesManagement from './pages/DailyQuotesManagement';
import FridayQuotesManagement from './pages/FridayQuotesManagement';
import HadeesManagement from './pages/HadeesManagement';
import HadeesCategoriesManagement from './pages/HadeesCategoriesManagement';
import NamesOfAllahManagement from './pages/NamesOfAllahManagement';
import LiveLinksManagement from './pages/LiveLinksManagement';
import RamadanManagement from './pages/RamadanManagement';
import BannersManagement from './pages/BannersManagement';

// Group Activities
import GroupActivitiesPage from './pages/GroupActivitiesPage';

// Leaderboard / Tracking Data
import DhikrTrackingPage from './pages/DhikrTrackingPage';
import DuaMemorizationPage from './pages/DuaMemorizationPage';
import FastingDaysPage from './pages/FastingDaysPage';
import PrayerTrackingPage from './pages/PrayerTrackingPage';
import QuranReadingPage from './pages/QuranReadingPage';
import QuranMemorizationPage from './pages/QuranMemorizationPage';
import QuranProgressPage from './pages/QuranProgressPage';
import StreaksPage from './pages/StreaksPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route index element={<Dashboard />} />
                      <Route path="users" element={<Users />} />
                      <Route path="users/:id" element={<UserDetail />} />
                      <Route path="groups" element={<Groups />} />
                      <Route path="groups/:id" element={<GroupDetail />} />
                      <Route path="activity-logs" element={<ActivityLogs />} />
                      <Route path="group-activities" element={<GroupActivitiesPage />} />

                      {/* Content Management */}
                      <Route path="content/duas" element={<DuasManagement />} />
                      <Route path="content/dua-categories" element={<DuaCategoriesManagement />} />
                      <Route path="content/dhikr-categories" element={<DhikrCategoriesManagement />} />
                      <Route path="content/dhikr-types" element={<DhikrTypesManagement />} />
                      <Route path="content/thasbeehs" element={<ThasbeehsManagement />} />
                      <Route path="content/fasting-types" element={<FastingTypesManagement />} />
                      <Route path="content/quran-reading-portions" element={<QuranReadingContentPage />} />
                      <Route path="content/quran-memorization-portions" element={<QuranMemorizationContentPage />} />
                      <Route path="content/verse-importance" element={<VerseImportancePage />} />
                      <Route path="content/dhikr-importance" element={<DhikrImportancePage />} />
                      <Route path="content/dua-importance" element={<DuaImportancePage />} />
                      <Route path="content/library" element={<LibraryPage />} />
                      <Route path="content/library/:categoryId" element={<LibraryEntriesPage />} />
                      <Route path="special-models" element={<SpecialModelsPage />} />
                      <Route path="special-models/:categoryId/entries" element={<SpecialEntriesPage />} />
                      <Route path="content/daily-quotes" element={<DailyQuotesManagement />} />
                      <Route path="content/friday-quotes" element={<FridayQuotesManagement />} />
                      <Route path="content/hadees" element={<HadeesManagement />} />
                      <Route path="content/hadees-categories" element={<HadeesCategoriesManagement />} />
                      <Route path="content/names-of-allah" element={<NamesOfAllahManagement />} />
                      <Route path="content/live-links" element={<LiveLinksManagement />} />
                      <Route path="content/ramadan" element={<RamadanManagement />} />
                      <Route path="content/banners" element={<BannersManagement />} />

                      {/* Tracking Data / Leaderboards */}
                      <Route path="tracking/dhikr" element={<DhikrTrackingPage />} />
                      <Route path="tracking/dua-memorization" element={<DuaMemorizationPage />} />
                      <Route path="tracking/fasting" element={<FastingDaysPage />} />
                      <Route path="tracking/prayers" element={<PrayerTrackingPage />} />
                      <Route path="tracking/quran-reading" element={<QuranReadingPage />} />
                      <Route path="tracking/quran-memorization" element={<QuranMemorizationPage />} />
                      <Route path="tracking/quran-progress" element={<QuranProgressPage />} />
                      <Route path="tracking/streaks" element={<StreaksPage />} />

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
