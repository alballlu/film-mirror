import { useMemo, useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { getPersonalityName, pickSharePosters } from '../utils/personalityEngine';
import { usePosterContext } from '../context/PosterContext';

const SITE_URL = 'https://ualbal0528-stack.github.io/film-mirror/';

// 拼贴布局：5 张海报的 (x%, y%, width%, height%, rotate, zIndex)
const COLLAGE_LAYOUT = [
  { x: 2,  y: 3,  w: 38, h: 56, rot: -3, z: 3 },
  { x: 42, y: 0,  w: 30, h: 44, rot: 2,  z: 2 },
  { x: 74, y: 6,  w: 24, h: 36, rot: -2, z: 1 },
  { x: 8,  y: 60, w: 32, h: 38, rot: 2,  z: 2 },
  { x: 46, y: 50, w: 48, h: 48, rot: -1, z: 4 },
];

function PosterTile({ movie, sources, layout }) {
  const [imgError, setImgError] = useState(0); // 重试了多少个源都没成功
  const [selectedSrc, setSelectedSrc] = useState(null);
  const char = movie.title?.charAt(0) || '?';
  // 哈希生成稳定的占位色
  let hash = 0;
  for (let i = 0; i < (movie.title || '').length; i++) {
    hash = (hash * 31 + movie.title.charCodeAt(i)) % 360;
  }
  const hue = hash;
  const bg = `linear-gradient(135deg, hsl(${hue}, 30%, 25%), hsl(${(hue + 30) % 360}, 35%, 15%))`;

  useEffect(() => {
    setImgError(0);
    setSelectedSrc(null);
  }, [sources?.length]);

  const canTry = sources && sources.length > 0;
  const allFailed = !canTry || imgError >= sources.length;
  const srcToUse = canTry ? sources[Math.min(imgError, sources.length - 1)] : '';

  const handleError = () => {
    if (imgError + 1 >= sources.length) {
      setImgError(sources.length); // 全部失败
    } else {
      setImgError(prev => prev + 1);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        width: `${layout.w}%`,
        height: `${layout.h}%`,
        transform: `rotate(${layout.rot}deg)`,
        zIndex: layout.z,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
        background: allFailed ? bg : '#1a1a1a',
      }}
    >
      {!allFailed && srcToUse ? (
        <img
          key={imgError}
          src={srcToUse}
          alt={movie.title}
          crossOrigin="anonymous"
          onError={handleError}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: 'rgba(245, 241, 234, 0.85)',
          fontFamily: "'Noto Serif SC', serif",
          padding: 4,
        }}>
          <div style={{ fontSize: 'clamp(28px, 6vw, 56px)', fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>
            {char}
          </div>
          <div style={{ fontSize: 'clamp(8px, 1.2vw, 11px)', textAlign: 'center', opacity: 0.85, lineHeight: 1.2 }}>
            {movie.title}
          </div>
          <div style={{ fontSize: 'clamp(6px, 0.9vw, 9px)', opacity: 0.6, marginTop: 2 }}>
            {movie.year}
          </div>
        </div>
      )}
    </div>
  );
}

function TicketStub() {
  // 票根左右的撕齿孔（小圆形）
  return (
    <>
      {[-1, 0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={`l-${i}`} style={{
          position: 'absolute', left: -6, top: `${10 + i * 10}%`,
          width: 12, height: 12, borderRadius: '50%',
          background: '#1c2230',
        }} />
      ))}
      {[-1, 0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={`r-${i}`} style={{
          position: 'absolute', right: -6, top: `${10 + i * 10}%`,
          width: 12, height: 12, borderRadius: '50%',
          background: '#1c2230',
        }} />
      ))}
    </>
  );
}

export default function ShareCard({ scores, selectedMovieIds }) {
  const cardRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const { posterSources } = usePosterContext();

  const personality = useMemo(() => getPersonalityName(scores), [scores]);
  const sharePosters = useMemo(
    () => pickSharePosters(scores, selectedMovieIds || [], 5),
    [scores, selectedMovieIds]
  );

  // 票号（确定性，基于 scores）
  const ticketNo = useMemo(() => {
    let h = 0;
    const s = Object.values(scores).join('');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffff;
    return `FM${h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
  }, [scores]);

  const seatNo = useMemo(() => {
    const row = String.fromCharCode(65 + (ticketNo.charCodeAt(2) % 8));
    const col = (ticketNo.charCodeAt(3) % 16) + 1;
    return `${row}${col}`;
  }, [ticketNo]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    if (window.umami) window.umami.track('share_card_download');
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F5F1EA',
        logging: false,
        width: 360,
        height: 640,
        windowWidth: 360,
      });
      const link = document.createElement('a');
      link.download = `FilmMirror_${personality.code}_${ticketNo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Share card generation failed', e);
    }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#F5F1EA',
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(139, 111, 71, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(139, 111, 71, 0.03) 0%, transparent 50%),
            repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139, 111, 71, 0.015) 3px, rgba(139, 111, 71, 0.015) 4px)
          `,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Noto Serif SC', 'Cormorant Garamond', serif",
          color: '#2D2D2D',
        }}
      >
        <TicketStub />

        {/* 顶部 Header：FilmMirror + 票号 */}
        <div style={{
          padding: '14px 20px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px dashed #8B6F47',
          margin: '0 14px',
        }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: '#2D2D2D', letterSpacing: 3 }}>
              FILMMIRROR
            </div>
            <div style={{ fontSize: 8, color: '#8B6F47', letterSpacing: 2, marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
              FILM · PERSONALITY
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'SF Mono', monospace", fontSize: 9, color: '#8B6F47' }}>
              TICKET NO.
            </div>
            <div style={{ fontFamily: "'SF Mono', monospace", fontSize: 12, fontWeight: 700, color: '#2D2D2D', letterSpacing: 1 }}>
              {ticketNo}
            </div>
          </div>
        </div>

        {/* 类型主标题区 — 变体为视觉主角 */}
        <div style={{ padding: '16px 20px 8px', textAlign: 'center' }}>
          <div style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#2D2D2D',
            lineHeight: 1.15,
            marginBottom: personality.isFallback ? 16 : 6,
            fontFamily: "'Noto Serif SC', serif",
          }}>
            {personality.variant}
          </div>
          {!personality.isFallback && (
            <div style={{
              fontSize: 13,
              color: '#8B6F47',
              marginBottom: 12,
              fontFamily: "'Noto Serif SC', serif",
              fontWeight: 500,
              letterSpacing: 1,
            }}>
              {personality.primary} · {personality.keywords.slice(0, 2).join(' / ')}
            </div>
          )}
          <div style={{
            display: 'inline-block',
            fontSize: 10,
            fontFamily: "'SF Mono', monospace",
            color: '#8B6F47',
            background: '#FFFFFF',
            border: '1px solid #D5CFC2',
            padding: '2px 10px',
            borderRadius: 2,
            marginBottom: 10,
          }}>
            CODE · {personality.code}
          </div>
        </div>

        {/* 宣言 */}
        <div style={{
          padding: '0 24px',
          textAlign: 'center',
          fontSize: 14,
          color: '#2D2D2D',
          lineHeight: 1.6,
          fontStyle: 'italic',
          fontFamily: "'Noto Serif SC', serif",
          marginBottom: 10,
        }}>
          "{personality.declaration}"
        </div>

        {/* 关键词 chips */}
        <div style={{
          padding: '0 18px',
          display: 'flex',
          justifyContent: 'center',
          gap: 5,
          flexWrap: 'wrap',
          marginBottom: 8,
        }}>
          {personality.keywords.slice(0, 5).map((kw) => (
            <span key={kw} style={{
              fontSize: 10,
              padding: '3px 9px',
              background: '#2D2D2D',
              color: '#F5F1EA',
              borderRadius: 11,
              fontFamily: "'Noto Sans SC', sans-serif",
              fontWeight: 500,
              letterSpacing: 0.5,
            }}>
              # {kw}
            </span>
          ))}
        </div>

        {/* 虚线分割 */}
        <div style={{
          margin: '6px 14px 0',
          borderTop: '1px dashed #8B6F47',
          position: 'relative',
          height: 1,
        }} />

        {/* 场次信息条 */}
        <div style={{
          padding: '6px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 9,
          color: '#8B6F47',
          fontFamily: "'SF Mono', monospace",
          letterSpacing: 1,
        }}>
          <span>HALL · 7号厅</span>
          <span>SHOWTIME · 23:59</span>
          <span>SEAT · {seatNo}</span>
        </div>

        {/* 海报拼贴区 */}
        <div style={{
          margin: '4px 14px 0',
          height: 250,
          position: 'relative',
          background: 'rgba(139, 111, 71, 0.04)',
          borderRadius: 2,
        }}>
          {sharePosters.map((movie, i) => (
            <PosterTile
              key={movie.id}
              movie={movie}
              sources={posterSources[movie.id]}
              layout={COLLAGE_LAYOUT[i]}
            />
          ))}
        </div>

        {/* 底部 QR + 网址 */}
        <div style={{
          position: 'absolute',
          bottom: 14,
          left: 20,
          right: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          <div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#2D2D2D',
              letterSpacing: 1,
              marginBottom: 2,
            }}>
              film-mirror
            </div>
            <div style={{ fontSize: 8, color: '#8B6F47', fontFamily: "'Noto Sans SC', sans-serif" }}>
              扫码测你的电影人格 →
            </div>
          </div>
          <div style={{
            background: '#FFFFFF',
            padding: 3,
            border: '1px solid #2D2D2D',
            borderRadius: 2,
          }}>
            <QRCodeSVG value={SITE_URL} size={48} bgColor="#FFFFFF" fgColor="#2D2D2D" level="M" />
          </div>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={saving}
        style={{
          padding: '12px 32px',
          background: '#2D2D2D',
          color: '#F5F1EA',
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "'Noto Sans SC', sans-serif",
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
          letterSpacing: 2,
        }}
      >
        {saving ? '正在生成...' : '保存分享卡'}
      </button>
    </div>
  );
}
