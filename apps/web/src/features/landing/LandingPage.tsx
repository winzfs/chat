import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import './LandingPage.css';

const valueCards = [
  {
    icon: '💬',
    title: '가벼운 대화',
    description: '부담 없이 이야기를 시작해요.',
  },
  {
    icon: '💕',
    title: '새로운 친구',
    description: '취향이 맞는 사람을 찾아요.',
  },
  {
    icon: '🛡️',
    title: '안전한 환경',
    description: '신고와 차단을 쉽게 사용할 수 있어요.',
  },
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <p className="landing-kicker">프렌들리 팝 감성의 채팅앱</p>
          <h1 id="landing-title">일상이 더 즐거워지는 대화</h1>
          <p className="landing-description">
            밝고 편안한 분위기에서 새로운 사람과 가볍게 이야기를 시작해보세요.
          </p>
          <div className="landing-actions">
            <Button>시작하기</Button>
            <Button variant="secondary">둘러보기</Button>
          </div>
        </div>

        <div className="hero-card" aria-label="채팅앱 미리보기">
          <div className="hero-logo">ChitChat</div>
          <div className="hero-bubble hero-bubble-left">안녕하세요! 오늘 날씨가 정말 좋네요 ☀️</div>
          <div className="hero-bubble hero-bubble-right">맞아요~ 산책하기 딱 좋은 날이에요 💗</div>
          <div className="hero-input">메시지를 입력하세요...</div>
        </div>
      </section>

      <section className="value-grid" aria-label="핵심 가치">
        {valueCards.map((card) => (
          <Card as="article" className="value-card" key={card.title}>
            <span className="value-icon" aria-hidden="true">{card.icon}</span>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
