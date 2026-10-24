// Lo que usamos de Google Identity Services (https://accounts.google.com/gsi/client)

interface CredencialGoogle {
  /** ID token (JWT) de la cuenta elegida */
  credential: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: {
          client_id: string;
          callback: (respuesta: CredencialGoogle) => void;
          /** SHA-256 del nonce que después recibe Supabase */
          nonce?: string;
          ux_mode?: "popup" | "redirect";
          context?: "signin" | "signup" | "use";
          itp_support?: boolean;
        }): void;
        renderButton(
          contenedor: HTMLElement,
          opciones: {
            type?: "standard" | "icon";
            theme?: "outline" | "filled_blue" | "filled_black";
            size?: "large" | "medium" | "small";
            text?: "signin_with" | "signup_with" | "continue_with" | "signin";
            shape?: "rectangular" | "pill" | "circle" | "square";
            logo_alignment?: "left" | "center";
            width?: number;
            locale?: string;
          }
        ): void;
      };
    };
  };
}
