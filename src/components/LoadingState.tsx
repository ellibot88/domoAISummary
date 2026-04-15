interface Props {
  generating?: boolean;
}

export default function LoadingState({ generating }: Props) {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p className="loading-text">
        {generating
          ? 'Analyzing dashboard data and generating your personalized summary...'
          : 'Loading dashboard context...'}
      </p>
    </div>
  );
}
