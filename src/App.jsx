import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useCallback, lazy, Suspense } from 'react';
import HomePage from './components/HomePage';
import TagConfirmation from './components/TagConfirmation';
import DailyContext from './components/DailyContext';
import DailyResult from './components/DailyResult';
import { enrichExternalMoviesBatch } from './services/tmdb';

// 重型页面懒加载 — 减少首屏 JS 体积
const MovieSelection = lazy(() => import('./components/MovieSelection'));
const PersonalityProfile = lazy(() => import('./components/PersonalityProfile'));
const Recommendation = lazy(() => import('./components/Recommendation'));

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
  const [flowAData, setFlowAData] = useState({
    selectedMovies: [],
    tags: [],
    scores: null,
    externalMovies: {},
  });
  const [flowBData, setFlowBData] = useState(null);
  const [enriching, setEnriching] = useState(false);

  const updateFlowA = useCallback((partial) => {
    setFlowAData((prev) => ({ ...prev, ...partial }));
  }, []);

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
              <TagConfirmation
                selectedMovieIds={flowAData.selectedMovies}
                externalMovies={flowAData.externalMovies}
                enriching={enriching}
                onNext={(tags) => {
                  updateFlowA({ tags });
                  navigate('/flow-a/step3');
                }}
                onBack={() => navigate('/flow-a/step1')}
              />
            }
          />
          <Route
            path="/flow-a/step3"
            element={
              <PersonalityProfile
                tags={flowAData.tags}
                selectedMovieIds={flowAData.selectedMovies}
                externalMovies={flowAData.externalMovies}
                onNext={(scores) => {
                  updateFlowA({ scores });
                  navigate('/flow-a/step4');
                }}
                onBack={() => navigate('/flow-a/step2')}
              />
            }
          />
          <Route
            path="/flow-a/step4"
            element={
              <Recommendation
                selectedMovieIds={flowAData.selectedMovies}
                externalMovies={flowAData.externalMovies}
                tags={flowAData.tags}
                scores={flowAData.scores}
                onBack={() => navigate('/flow-a/step3')}
                onRestart={goHome}
              />
            }
          />
          <Route
            path="/flow-b/step1"
            element={
              <DailyContext
                onNext={(data) => {
                  setFlowBData(data);
                  navigate('/flow-b/step2');
                }}
                onBack={goHome}
              />
            }
          />
          <Route
            path="/flow-b/step2"
            element={
              <DailyResult
                data={flowBData}
                onBack={() => navigate('/flow-b/step1')}
                onRestart={goHome}
              />
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}