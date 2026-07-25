import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import HomePage from './components/HomePage';
import MovieSelection from './components/MovieSelection';
import TagConfirmation from './components/TagConfirmation';
import PersonalityProfile from './components/PersonalityProfile';
import Recommendation from './components/Recommendation';
import DailyContext from './components/DailyContext';
import DailyResult from './components/DailyResult';

export default function App() {
  const navigate = useNavigate();
  const [flowAData, setFlowAData] = useState({
    selectedMovies: [],
    tags: [],
    scores: null,
  });
  const [flowBData, setFlowBData] = useState(null);

  const updateFlowA = useCallback((partial) => {
    setFlowAData((prev) => ({ ...prev, ...partial }));
  }, []);

  const startFlowA = () => navigate('/flow-a/step1');
  const startFlowB = () => {
    setFlowBData(null);
    navigate('/flow-b/step1');
  };
  const goHome = () => navigate('/');

  return (
    <div className="app-container">
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
              onNext={(movies) => {
                updateFlowA({ selectedMovies: movies });
                navigate('/flow-a/step2');
              }}
              onBack={goHome}
            />
          }
        />
        <Route
          path="/flow-a/step2"
          element={
            <TagConfirmation
              selectedMovieIds={flowAData.selectedMovies}
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
    </div>
  );
}