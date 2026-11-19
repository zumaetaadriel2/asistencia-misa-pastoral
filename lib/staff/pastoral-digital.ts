// =============================================
// Entrar con Pastoral Digital ID
// =============================================
// Proveedor OIDC propio configurado en Supabase (Authentication → Providers). El nombre tiene que
// coincidir con el "identifier" de allí. El hook de Auth solo deja crear la cuenta si el correo
// está en `staff`, igual que con Google.

export const PROVEEDOR_PASTORAL_DIGITAL = "custom:pastoral-digital-id" as const;
