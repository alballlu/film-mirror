import { Navigate, Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import HomePage from './components/HomePage';
import { enrichExternalMoviesBatch } from './services/tmdb';
import { getFlowElapsedSeconds, trackEvent, trackEventOnce, trackStepComplete } from './utils/analytics';

// 重型页面懒加载 — 减少首屏 JS 体积
const PreferenceMoviePicker = lazy(() => import('./components/PreferenceMoviePicker'));
const PreferenceTagReview = lazy(() => import('./components/PreferenceTagReview'));
const MoviePersonalityProfile = lazy(() => import('./components/MoviePersonalityProfile'));
const ProfileRecommendationResult = lazy(() => import('./components/ProfileRecommendationResult'));
const WatchContextForm = lazy(() => import('./components/WatchContextForm'));
const InstantRecommendationResult = lazy(() => import('./components/InstantRecommendationResult'));
const PROFILE_ALGORITHM_VERSION = 2;

// 路由级 loading fallback
function PageLoader() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '60vh', color: 'var(--text-muted)', fontSize: '0.95rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
        加载中…
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [profileJourneyState, setProfileJourneyState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('filmmirror_flow_a');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.profileVersion === PROFILE_ALGORITHM_VERSION
          ? parsed
          : { ...parsed, scores: null, profileVersion: PROFILE_ALGORITHM_VERSION };
      }
    } catch {}
    return { selectedMovies: [], tags: [], scores: null, externalMovies: {}, profileVersion: PROFILE_ALGORITHM_VERSION };
  });
  const [instantPickState, setInstantPickState] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('filmmirror_flow_b')) || null;
    } catch {
      return null;
    }
  });
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    trackEventOnce('visit', {}, 'visit');
  }, []);

  const updateProfileJourney = useCallback((partial) => {
    setProfileJourneyState((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    sessionStorage.setItem('filmmirror_flow_a', JSON.stringify(profileJourneyState));
  }, [profileJourneyState]);

  useEffect(() => {
    if (instantPickState) sessionStorage.setItem('filmmirror_flow_b', JSON.stringify(instantPickState));
    else sessionStorage.removeItem('filmmirror_flow_b');
  }, [instantPickState]);

  const startProfileJourney = () => navigate('/flow-a/step1');
  const startInstantPick = () => {
    setInstantPickState(null);
    navigate('/flow-b/step1');
  };
  const goHome = () => navigate('/');

  // Step1 → Step2：外部 TMDB 电影 keywords 异步 enrichment
  const handleMoviesSelected = useCallback((movies, externalMovies) => {
    updateProfileJourney({
      selectedMovies: movies,
      externalMovies: externalMovies || {},
    });
    navigate('/flow-a/step2');
    trackStepComplete('a', 'movies', {
      selected_movie_count: movies.length,
      external_movie_count: Object.keys(externalMovies || {}).length,
    });

    // 后台异步：keyword enrichment
    const tmdbCount = Object.keys(externalMovies || {}).length;
    if (tmdbCount > 0) {
      setEnriching(true);
      enrichExternalMoviesBatch(externalMovies)
        .then((enriched) => {
          updateProfileJourney({ externalMovies: enriched });
          setEnriching(false);
        })
        .catch(() => setEnriching(false));
    }
  }, [navigate, updateProfileJourney]);

  return (
    <div className="app-container">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={<HomePage onDeepClick={startProfileJourney} onDailyClick={startInstantPick} />}
          />
          <Route
            path="/flow-a/step1"
            element={
              <PreferenceMoviePicker
                selectedMovies={profileJourneyState.selectedMovies}
                onNext={handleMoviesSelected}
                onBack={goHome}
              />
            }
          />
          <Route
            path="/flow-a/step2"
            element={
              profileJourneyState.selectedMovies.length >= 8 ? <PreferenceTagReview
                selectedMovieIds={profileJourneyState.selectedMovies}
                externalMovies={profileJourneyState.externalMovies}
                enriching={enriching}
                onNext={(tags) => {
                  updateProfileJourney({ tags, scores: null, profileVersion: PROFILE_ALGORITHM_VERSION });
                  trackEvent('input_complete', {
                    flow: 'a',
                    selected_movie_count: profileJourneyState.selectedMovies.length,
                    external_movie_count: Object.keys(profileJourneyState.externalMovies || {}).length,
                    tag_count: tags.length,
                    elapsed_seconds: getFlowElapsedSeconds('a'),
                  });
                  trackStepComplete('a', 'tags', {
                    selected_movie_count: profileJourneyState.selectedMovies.length,
                    tag_count: tags.length,
                  });
                  navigate('/flow-a/step3');
                }}
                onBack={() => navigate('/flow-a/step1')}
              /> : <Navigate to="/flow-a/step1" replace />
            }
          />
          <Route
            path="/flow-a/step3"
            element={
              profileJourneyState.tags.length > 0 ? <MoviePersonalityProfile
                tags={profileJourneyState.tags}
                selectedMovieIds={profileJourneyState.selectedMovies}
                externalMovies={profileJourneyState.externalMovies}
                onNext={(scores) => {
                  updateProfileJourney({ scores });
                  navigate('/flow-a/step4');
                }}
                onBack={() => navigate('/flow-a/step2')}
              /> : <Navigate to="/flow-a/step2" replace />
            }
          />
          <Route
            path="/flow-a/step4"
            element={
              profileJourneyState.scores ? <ProfileRecommendationResult
                selectedMovieIds={profileJourneyState.selectedMovies}
                externalMovies={profileJourneyState.externalMovies}
                tags={profileJourneyState.tags}
                scores={profileJourneyState.scores}
                onBack={() => navigate('/flow-a/step3')}
                onRestart={goHome}
              /> : <Navigate to="/flow-a/step3" replace />
            }
          />
          <Route
            path="/flow-b/step1"
            element={
              <WatchContextForm
                onNext={(data) => {
                  setInstantPickState(data);
                  trackEvent('input_complete', {
                    flow: 'b',
                    genre_count: data.genres?.length || 0,
                    avoidance_count: data.avoidances?.length || 0,
                    session: data.session,
                    elapsed_seconds: getFlowElapsedSeconds('b'),
                  });
                  trackStepComplete('b', 'context', {
                    genre_count: data.genres?.length || 0,
                    avoidance_count: data.avoidances?.length || 0,
                    session: data.session,
                  });
                  navigate('/flow-b/step2');
                }}
                onBack={goHome}
              />
            }
          />
          <Route
            path="/flow-b/step2"
            element={
              instantPickState ? <InstantRecommendationResult
                data={instantPickState}
                onBack={() => navigate('/flow-b/step1')}
                onRestart={goHome}
              /> : <Navigate to="/flow-b/step1" replace />
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}
