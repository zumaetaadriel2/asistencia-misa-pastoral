
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ajustes": {
                  Row: {
                    "id": number,"permitir_login_correo": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"permitir_login_correo"?: boolean
                  }
                  Update: {
                    "id"?: number,"permitir_login_correo"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"alumnos": {
                  Row: {
                    "activo": boolean,"codigo": string,"comunidad_id": number,"creado_en": string,"id": number,"nombre_completo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"codigo"?: string,"comunidad_id": number,"creado_en"?: string,"id"?: never,"nombre_completo": string
                  }
                  Update: {
                    "activo"?: boolean,"codigo"?: string,"comunidad_id"?: number,"creado_en"?: string,"id"?: never,"nombre_completo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumnos_comunidad_id_fkey"
      columns: ["comunidad_id"]
isOneToOne: false
      referencedRelation: "comunidades"
      referencedColumns: ["id"]
    }
                  ]
                },"asistencias": {
                  Row: {
                    "actividad": Database["public"]['Enums']["actividad"],"actualizado_en": string,"alumno_id": number,"ciclo_id": number,"creado_en": string,"envio_actual_id": number | null,"estado": Database["public"]['Enums']["estado_asistencia"],"id": number,"motivo": string | null,"revisado_en": string | null,"revisado_por": number | null,"semana_numero": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actividad"?: Database["public"]['Enums']["actividad"],"actualizado_en"?: string,"alumno_id": number,"ciclo_id": number,"creado_en"?: string,"envio_actual_id"?: number | null,"estado": Database["public"]['Enums']["estado_asistencia"],"id"?: never,"motivo"?: string | null,"revisado_en"?: string | null,"revisado_por"?: number | null,"semana_numero": number
                  }
                  Update: {
                    "actividad"?: Database["public"]['Enums']["actividad"],"actualizado_en"?: string,"alumno_id"?: number,"ciclo_id"?: number,"creado_en"?: string,"envio_actual_id"?: number | null,"estado"?: Database["public"]['Enums']["estado_asistencia"],"id"?: never,"motivo"?: string | null,"revisado_en"?: string | null,"revisado_por"?: number | null,"semana_numero"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "asistencias_alumno_id_fkey"
      columns: ["alumno_id"]
isOneToOne: false
      referencedRelation: "alumnos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "asistencias_ciclo_id_fkey"
      columns: ["ciclo_id"]
isOneToOne: false
      referencedRelation: "ciclos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "asistencias_envio_actual_fk"
      columns: ["envio_actual_id"]
isOneToOne: false
      referencedRelation: "envios_foto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "asistencias_revisado_por_fkey"
      columns: ["revisado_por"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"ciclos": {
                  Row: {
                    "abierto_manual": boolean | null,"activo": boolean,"anio": number,"creado_en": string,"fecha_fin": string,"fecha_inicio": string,"id": number,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "abierto_manual"?: boolean | null,"activo"?: boolean,"anio": number,"creado_en"?: string,"fecha_fin": string,"fecha_inicio": string,"id"?: never,"nombre": string
                  }
                  Update: {
                    "abierto_manual"?: boolean | null,"activo"?: boolean,"anio"?: number,"creado_en"?: string,"fecha_fin"?: string,"fecha_inicio"?: string,"id"?: never,"nombre"?: string
                  }
                  Relationships: [
                    
                  ]
                },"comunidades": {
                  Row: {
                    "activa": boolean,"ciclo_id": number,"creado_en": string,"id": number,"nombre": string,"programa": Database["public"]['Enums']["programa"]
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"ciclo_id": number,"creado_en"?: string,"id"?: never,"nombre": string,"programa": Database["public"]['Enums']["programa"]
                  }
                  Update: {
                    "activa"?: boolean,"ciclo_id"?: number,"creado_en"?: string,"id"?: never,"nombre"?: string,"programa"?: Database["public"]['Enums']["programa"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "comunidades_ciclo_id_fkey"
      columns: ["ciclo_id"]
isOneToOne: false
      referencedRelation: "ciclos"
      referencedColumns: ["id"]
    }
                  ]
                },"envios_foto": {
                  Row: {
                    "actividad": Database["public"]['Enums']["actividad"],"alumno_id": number,"ciclo_id": number,"confirmado": boolean,"distancia_similar": number | null,"enviado_en": string,"fecha_exif": string | null,"foto_key": string,"huella": number | null,"id": number,"semana_numero": number,"similar_a_envio_id": number | null,"tamano_bytes": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actividad"?: Database["public"]['Enums']["actividad"],"alumno_id": number,"ciclo_id": number,"confirmado"?: boolean,"distancia_similar"?: number | null,"enviado_en"?: string,"fecha_exif"?: string | null,"foto_key": string,"huella"?: number | null,"id"?: never,"semana_numero": number,"similar_a_envio_id"?: number | null,"tamano_bytes"?: number | null
                  }
                  Update: {
                    "actividad"?: Database["public"]['Enums']["actividad"],"alumno_id"?: number,"ciclo_id"?: number,"confirmado"?: boolean,"distancia_similar"?: number | null,"enviado_en"?: string,"fecha_exif"?: string | null,"foto_key"?: string,"huella"?: number | null,"id"?: never,"semana_numero"?: number,"similar_a_envio_id"?: number | null,"tamano_bytes"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "envios_foto_alumno_id_fkey"
      columns: ["alumno_id"]
isOneToOne: false
      referencedRelation: "alumnos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "envios_foto_ciclo_id_fkey"
      columns: ["ciclo_id"]
isOneToOne: false
      referencedRelation: "ciclos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "envios_foto_similar_a_envio_id_fkey"
      columns: ["similar_a_envio_id"]
isOneToOne: false
      referencedRelation: "envios_foto"
      referencedColumns: ["id"]
    }
                  ]
                },"intentos_codigo": {
                  Row: {
                    "creado_en": string,"id": number,"ip": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"id"?: never,"ip": string
                  }
                  Update: {
                    "creado_en"?: string,"id"?: never,"ip"?: string
                  }
                  Relationships: [
                    
                  ]
                },"latido": {
                  Row: {
                    "id": number,"ultima_vez": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"ultima_vez"?: string
                  }
                  Update: {
                    "id"?: number,"ultima_vez"?: string
                  }
                  Relationships: [
                    
                  ]
                },"staff": {
                  Row: {
                    "activo": boolean,"creado_en": string,"email": string,"id": number,"nombre": string,"rol": Database["public"]['Enums']["rol_staff"]
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"creado_en"?: string,"email": string,"id"?: never,"nombre": string,"rol"?: Database["public"]['Enums']["rol_staff"]
                  }
                  Update: {
                    "activo"?: boolean,"creado_en"?: string,"email"?: string,"id"?: never,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_staff"]
                  }
                  Relationships: [
                    
                  ]
                },"staff_comunidades": {
                  Row: {
                    "comunidad_id": number,"staff_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "comunidad_id": number,"staff_id": number
                  }
                  Update: {
                    "comunidad_id"?: number,"staff_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_comunidades_comunidad_id_fkey"
      columns: ["comunidad_id"]
isOneToOne: false
      referencedRelation: "comunidades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_comunidades_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_buscar_alumno":
{ Args: { "p_codigo": string }; Returns: {
              "alumno_id": number,"ciclo_id": number,"comunidad": string,"comunidad_id": number,"nombre_completo": string,"programa": Database["public"]['Enums']["programa"]
            }[]
                           },
"_cerrar_semana":
{ Args: { "p_ciclo_id": number,"p_semana": number }; Returns: number
                           },
"_cerrar_semana_vencida":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"_fin_de_reenvio":
{ Args: { "p_fecha_inicio": string,"p_semana": number }; Returns: string
                           },
"_ip_cliente":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_limite_intentos_superado":
{ Args: { "p_ip": string }; Returns: boolean
                           },
"_nombre_corto":
{ Args: { "p_nombre": string }; Returns: string
                           },
"_registrar_intento_fallido":
{ Args: { "p_ip": string }; Returns: undefined
                           },
"activar_ciclo":
{ Args: { "p_ciclo_id": number }; Returns: undefined
                           },
"cerrar_semana":
{ Args: { "p_semana": number }; Returns: number
                           },
"cola_revision":
{ Args: Record<PropertyKey, never>; Returns: {
              "alumno": string,"alumno_id": number,"anterior_envio_id": number,"anterior_semana": number,"asistencia_id": number,"comunidad": string,"comunidad_id": number,"distancia_similar": number,"domingo": string,"enviado_en": string,"envio_id": number,"fecha_exif": string,"programa": Database["public"]['Enums']["programa"],"semana": number,"similar_alumno": string,"similar_envio_id": number,"similar_semana": number
            }[]
                           },
"confirmar_envio":
{ Args: { "p_codigo": string,"p_envio_id": number,"p_tamano_bytes": number }; Returns: Json
                           },
"copiar_comunidades":
{ Args: { "p_desde_ciclo_id": number,"p_hacia_ciclo_id": number }; Returns: number
                           },
"domingo_de_referencia":
{ Args: { "p_fecha": string }; Returns: string
                           },
"es_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"es_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"es_staff_de":
{ Args: { "p_comunidad_id": number }; Returns: boolean
                           },
"es_staff_de_alumno":
{ Args: { "p_alumno_id": number }; Returns: boolean
                           },
"estado_formulario":
{ Args: Record<PropertyKey, never>; Returns: {
              "abierto": boolean,"ciclo_id": number,"ciclo_nombre": string,"cierre_envio": string,"cierre_reenvio": string,"en_curso": boolean,"manual": boolean,"proxima_apertura": string,"reenvio_abierto": boolean,"semana": number
            }[]
                           },
"generar_codigo_alumno":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"hook_antes_de_crear_usuario":
{ Args: { "event": Json }; Returns: Json
                           },
"identificar_alumno":
{ Args: { "p_codigo": string }; Returns: Json
                           },
"importar_alumnos":
{ Args: { "p_comunidad_id": number,"p_nombres": (string)[] }; Returns: Json
                           },
"justificar_falta":
{ Args: { "p_alumno_id": number,"p_motivo": string,"p_semana": number }; Returns: number
                           },
"latido":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"mi_perfil_staff":
{ Args: Record<PropertyKey, never>; Returns: {
              "ciclo_nombre": string,"id": number,"nombre": string,"rol": Database["public"]['Enums']["rol_staff"],"semana_reciente": number
            }[]
                           },
"momento_actual":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"preparar_envio":
{ Args: { "p_codigo": string,"p_fecha_exif"?: string,"p_huella"?: number,"p_ip": string }; Returns: Json
                           },
"primer_domingo":
{ Args: { "p_fecha": string }; Returns: string
                           },
"reasignar_asistencia":
{ Args: { "p_alumno_destino_id": number,"p_asistencia_id": number }; Returns: undefined
                           },
"regenerar_codigo":
{ Args: { "p_alumno_id": number }; Returns: string
                           },
"resumen_semana":
{ Args: { "p_semana": number }; Returns: {
              "alumno": string,"alumno_id": number,"comunidad": string,"comunidad_id": number,"estado": string,"motivo": string,"programa": Database["public"]['Enums']["programa"]
            }[]
                           },
"revisar_asistencia":
{ Args: { "p_accion": string,"p_asistencia_id": number,"p_motivo"?: string }; Returns: Database["public"]['Enums']["estado_asistencia"]
                           },
"semana_de_domingo":
{ Args: { "p_domingo": string,"p_fecha_inicio": string }; Returns: number
                           },
"semana_reciente":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"staff_actual_id":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            "actividad": "misa"|"catequesis","estado_asistencia": "pendiente"|"validado"|"rechazado"|"inasistencia"|"justificada","programa": "confirmacion"|"primera_comunion","rol_staff": "admin"|"guia"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "actividad": ["misa", "catequesis"],"estado_asistencia": ["pendiente", "validado", "rechazado", "inasistencia", "justificada"],"programa": ["confirmacion", "primera_comunion"],"rol_staff": ["admin", "guia"]
          }
        }
} as const
