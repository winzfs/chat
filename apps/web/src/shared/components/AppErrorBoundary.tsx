import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected application render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="signup-shell">
          <section className="signup-card" role="alert">
            <p className="home-kicker">플러팅</p>
            <h1>화면을 불러오지 못했어요</h1>
            <p className="signup-copy">저장된 정보는 유지돼요. 앱을 다시 불러와주세요.</p>
            <button type="button" onClick={() => window.location.reload()}>다시 불러오기</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
