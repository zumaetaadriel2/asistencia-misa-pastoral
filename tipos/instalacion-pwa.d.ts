// Instalación de la PWA: lo que no trae la librería estándar de TypeScript

/** Chrome y Edge (Android y escritorio) lo lanzan cuando la app se puede instalar */
interface BeforeInstallPromptEvent extends Event {
  /** Abre la ventana del sistema para instalar (se puede usar una sola vez) */
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
  appinstalled: Event;
}

interface Navigator {
  /** Safari en iPhone: true si se abrió desde la pantalla de inicio */
  standalone?: boolean;
}
