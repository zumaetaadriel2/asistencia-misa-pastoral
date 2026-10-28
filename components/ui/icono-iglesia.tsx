/** Ícono de iglesia (trazo, Tabler "building-church"): los accesos a /misas */
export function IconoIglesia({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21h18" />
      <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
      <path d="M10 5h4" />
      <path d="M12 3v5" />
      <path d="M6 21v-7m-2 2 8-8 8 8m-2-2v7" />
    </svg>
  );
}
