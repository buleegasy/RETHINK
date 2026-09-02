import React from 'react';

interface Props {
  children: React.ReactNode;
  onFallbackClick?: () => void;
}

interface State {
  hasError: boolean;
}

export class VoiceErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Voice UI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-500/10 rounded-2xl border border-red-500/20 backdrop-blur-md">
          <div className="text-red-400 mb-2 font-medium">语音模块加载失败</div>
          <button 
            onClick={() => {
              this.setState({ hasError: false });
              if (this.props.onFallbackClick) this.props.onFallbackClick();
            }}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-full transition-colors text-sm"
          >
            返回文字模式
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
