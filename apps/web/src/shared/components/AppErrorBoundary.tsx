import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorId: string;
};

function createErrorId() {
  return globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now().toString(36);
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, errorId: '' };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true, errorId: createErrorId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const detail = {
      event: 'app.render_error',
      error_id: this.state.errorId,
      error_name: error.name,
      error_message: error.message,
      component_stack: info.componentStack,
    };
    console.error(JSON.stringify(detail));
    window.dispatchEvent(new CustomEvent('flirting:render-error', { detail }));
  }

  private retry = () => {
    this.setState({ hasError: false, errorId: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-shell">
          <section className="app-error-card" role="alert" aria-labelledby="app-error-title">
            <div className="app-error-mark" aria-hidden="true">!</div>
            <p className="home-kicker">플러팅</p>
            <h1 id="app-error-title">화면을 불러오지 못했어요</h1>
            <p className="app-error-copy">작성 중인 내용과 저장된 프로필은 그대로예요. 먼저 화면을 다시 시도해보고, 계속 문제가 생기면 앱을 새로고침해주세요.</p>
            <div className="app-error-actions">
              <button type="button" onClick={this.retry}>화면 다시 시도</button>
              <button className="app-error-secondary" type="button" onClick={() => window.location.reload()}>앱 새로고침</button>
            </div>
            <small className="app-error-code">오류 코드 {this.state.errorId}</small>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
