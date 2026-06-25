import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { LanguageContext } from "../../i18n/LanguageContext";
import { translate } from "../../i18n/useTranslation";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <LanguageContext.Consumer>
            {(context) => {
              const language = context?.language ?? "zh-Hant";

              return (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <h2>{translate(language, "ui.errorBoundary.title")}</h2>
                  <p>{translate(language, "ui.errorBoundary.description")}</p>
                  <button
                    onClick={() => window.location.reload()}
                    style={{ marginTop: 16, padding: "8px 24px", fontSize: 16 }}
                    type="button"
                  >
                    {translate(language, "ui.errorBoundary.reload")}
                  </button>
                </div>
              );
            }}
          </LanguageContext.Consumer>
        )
      );
    }

    return this.props.children;
  }
}
