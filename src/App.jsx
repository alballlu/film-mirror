import { Navigate, Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import HomePage from './components/HomePage';
import { enrichExternalMoviesBatch } from './services/tmdb';
import { getFlowElapsedSeconds, trackEvent, trackEventOnce, trackStepComplete } from './utils/analytics';

// 重型页面懒加载 — 减少首屏 JS 体积
const MovieSelection = lazy(() => import('./components/MovieSelection'));
const TagConfirmation = lazy(() => import('./components/TagConfirmation'));
const PersonalityProfile = lazy(() => import('./components/PersonalityProfile'));
const Recommendation = lazy(() => import('./components/Recommendation'));
const DailyContext = lazy(() => import('./components/DailyContext'));
const DailyResult = lazy(() => import('./components/DailyResult'));
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
  const [flowAData, setFlowAData] = useState(() => {
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
  const [flowBData, setFlowBData] = useState(() => {
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

  const updateFlowA = useCallback((partial) => {
    setFlowAData((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    sessionStorage.setItem('filmmirror_flow_a', JSON.stringify(flowAData));
  }, [flowAData]);

  useEffect(() => {
    if (flowBData) sessionStorage.setItem('filmmirror_flow_b', JSON.stringify(flowBData));
    else sessionStorage.removeItem('filmmirror_flow_b');
  }, [flowBData]);

  const startFlowA = () => navigate('/flow-a/step1');
  const startFlowB = () => {
    setFlowBData(null);
    navigate('/flow-b/step1');
  };
  const goHome = () => navigate('/');

  // Step1 → Step2：外部 TMDB 电影 keywords 异步 enrichment
  const handleMoviesSelected = useCallback((movies, externalMovies) => {
    updateFlowA({
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
          updateFlowA({ externalMovies: enriched });
          setEnriching(false);
        })
        .catch(() => setEnriching(false));
    }
  }, [navigate, updateFlowA]);

  return (
    <div className="app-container">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={<HomePage onDeepClick={startFlowA} onDailyClick={startFlowB} />}
          />
          <Route
            path="/flow-a/step1"
            element={
              <MovieSelection
                selectedMovies={flowAData.selectedMovies}
                onNext={handleMoviesSelected}
                onBack={goHome}
              />
            }
          />
          <Route
            path="/flow-a/step2"
            element={
              flowAData.selectedMovies.length >= 8 ? <TagConfirmation
                selectedMovieIds={flowAData.selectedMovies}
                externalMovies={flowAData.externalMovies}
                enriching={enriching}
                onNext={(tags) => {
                  updateFlowA({ tags, scores: null, profileVersion: PROFILE_ALGORITHM_VERSION });
                  trackEvent('input_complete', {
                    flow: 'a',
                    selected_movie_count: flowAData.selectedMovies.length,
                    external_movie_count: Object.keys(flowAData.externalMovies || {}).length,
                    tag_count: tags.length,
                    elapsed_seconds: getFlowElapsedSeconds('a'),
                  });
                  trackStepComplete('a', 'tags', {
                    selected_movie_count: flowAData.selectedMovies.length,
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
              flowAData.tags.length > 0 ? <PersonalityProfile
                tags={flowAData.tags}
                selectedMovieIds={flowAData.selectedMovies}
                externalMovies={flowAData.externalMovies}
                onNext={(scores) => {
                  updateFlowA({ scores });
                  navigate('/flow-a/step4');
                }}
                onBack={() => navigate('/flow-a/step2')}
              /> : <Navigate to="/flow-a/step2" replace />
            }
          />
          <Route
            path="/flow-a/step4"
            element={
              flowAData.scores ? <Recommendation
                selectedMovieIds={flowAData.selectedMovies}
                externalMovies={flowAData.externalMovies}
                tags={flowAData.tags}
                scores={flowAData.scores}
                onBack={() => navigate('/flow-a/step3')}
                onRestart={goHome}
              /> : <Navigate to="/flow-a/step3" replace />
            }
          />
          <Route
            path="/flow-b/step1"
            element={
              <DailyContext
                onNext={(data) => {
                  setFlowBData(data);
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
              flowBData ? <DailyResult
                data={flowBData}
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
