export default function Marquee({ items }: { items: string[] }) {
  const track = (hidden: boolean) => (
    <ul className="marquee-track" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li
          key={item}
          className="hud-label flex items-center gap-6 pr-6 whitespace-nowrap text-muted"
        >
          {item}
          <span className="size-1 bg-accent" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="marquee">
      {track(false)}
      {track(true)}
    </div>
  );
}
