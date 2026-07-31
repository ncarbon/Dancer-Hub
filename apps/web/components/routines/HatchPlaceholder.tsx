export default function HatchPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-[#e2dccf] bg-[repeating-linear-gradient(45deg,#ddd7ca_0,#ddd7ca_1px,transparent_1px,transparent_10px)] ${className}`}
    />
  );
}
