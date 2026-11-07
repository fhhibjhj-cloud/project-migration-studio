// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans" dir="rtl">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 text-center space-y-4 shadow-2xl backdrop-blur-md">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-lg font-black text-white">خطای غیرمنتظره در بارگذاری صفحه</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              مشکلی در اجرای برنامه رخ داد. جهت بازیابی بدون مشکل، با دکمه زیر به صفحه اصلی بازگردید.
            </p>

            <div className="pt-2 flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-600/30"
              >
                <Home className="w-4 h-4" />
                <span>بازگشت به صفحه اصلی</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 h-11 rounded-2xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>بارگذاری مجدد</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
