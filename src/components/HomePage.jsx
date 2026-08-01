export default function HomePage({ onDeepClick, onDailyClick }) {
  const handleKeyboardActivate = (event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const startDeepFlow = () => {
    if (window.umami) window.umami.track('flow_a_start');
    onDeepClick();
  };

  const startDailyFlow = () => {
    if (window.umami) window.umami.track('flow_b_start');
    onDailyClick();
  };

  return (
    <div className="home-page-container">
      {/* Background orbs */}
      <div className="home-orb-top-left" />
      <div className="home-orb-bottom-right" />

      {/* Title */}
      <h1 className="home-title">FilmMirror</h1>

      {/* Subtitle */}
      <p className="home-subtitle">电影镜像 · 通过电影读懂自己</p>

      {/* Cards */}
      <div className="home-cards">
        {/* Deep Experience Card */}
        <div
          className="home-card"
          role="button"
          tabIndex={0}
          onClick={startDeepFlow}
          onKeyDown={(event) => handleKeyboardActivate(event, startDeepFlow)}
        >
          <div className="card-symbol">PROFILE</div>
          <h2 className="card-title">探索你的电影性格</h2>
          <p className="card-desc">
            选出 8–12 部你喜欢的电影，让我们从中读懂你的性格密码。
            得到专属的六维性格雷达图与职场关联建议。
          </p>
          <div className="card-meta">深度体验 · 约 3 分钟</div>
        </div>

        {/* Daily Card */}
        <div
          className="home-card"
          role="button"
          tabIndex={0}
          onClick={startDailyFlow}
          onKeyDown={(event) => handleKeyboardActivate(event, startDailyFlow)}
        >
          <div className="card-symbol">TODAY</div>
          <h2 className="card-title">今天该看什么？</h2>
          <p className="card-desc">
            根据你此刻的心情、天气、感情状态，为你推荐一部属于今天的电影。
          </p>
          <div className="card-meta">快速体验 · 约 30 秒</div>
        </div>
      </div>

      {/* Footer Quote */}
      <p className="home-footer-quote">
        你喜欢的电影，藏着真实的你自己
      </p>
    </div>
  );
}
