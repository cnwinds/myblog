interface BackdropProps {
  grid?: boolean;
}

/** 页面顶部的极光色块与坐标网格。 */
export default function Backdrop({ grid = true }: BackdropProps) {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="aurora aurora-1" />
      <span className="aurora aurora-2" />
      <span className="aurora aurora-3" />
      {grid && <span className="backdrop-grid" />}
    </div>
  );
}
