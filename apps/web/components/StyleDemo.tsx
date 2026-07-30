type Props = {
  countLabel: string;
};

/** Placeholder while licensed demo footage isn't available yet. */
export default function StyleDemo({ countLabel }: Props) {
  return (
    <div className="mt-3">
      <div className="relative overflow-hidden rounded-lg bg-gray-100 aspect-video">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Demo soon</p>
          <p className="text-lg font-semibold text-gray-600">{countLabel}</p>
        </div>
      </div>
    </div>
  );
}
