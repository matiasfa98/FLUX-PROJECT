// client/src/app/WorkspaceErrorBoundary.jsx
import React from "react";

/*
|--------------------------------------------------------------------------
| WORKSPACE ERROR BOUNDARY
|--------------------------------------------------------------------------
| Catches render crashes inside the workspace (e.g. terminal crashes,
| socket-driven re-renders) and shows an inline fallback instead of
| letting the whole app redirect to the lobby.
|
| The socket and workspace state are preserved because we don't
| unmount the whole tree.
|--------------------------------------------------------------------------
*/
export class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[WorkspaceErrorBoundary]", error);
    console.error("[WorkspaceErrorBoundary] componentStack:", info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "32px",
            backgroundColor: "var(--bg-main)",
            color: "var(--text-main)",
            fontFamily: "monospace",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 800,
              color: "var(--danger)",
            }}
          >
            WORKSPACE CRASHED
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              maxWidth: "480px",
              lineHeight: 1.5,
            }}
          >
            {this.state.error.message || "An unexpected error occurred."}
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "8px",
            }}
          >
            <button
              onClick={this.handleReset}
              style={{
                backgroundColor: "var(--accent)",
                border: "none",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default WorkspaceErrorBoundary;