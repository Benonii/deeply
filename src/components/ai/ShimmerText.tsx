interface ShimmerTextProps {
  text: string;
}

export const ShimmerText = ({ text }: ShimmerTextProps) => <span className="ai-shimmer">{text}</span>;
