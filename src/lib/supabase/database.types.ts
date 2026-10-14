
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
            "hardware_store_members": {
                  Row: {
                    "created_at": string,"hardware_store_id": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"hardware_store_id": string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"hardware_store_id"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "hardware_store_members_hardware_store_id_fkey"
      columns: ["hardware_store_id"]
isOneToOne: false
      referencedRelation: "hardware_stores"
      referencedColumns: ["id"]
    }
                  ]
                },"hardware_stores": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"name": string,"shopify_location_id": string | null,"shopify_vendor": string,"shopify_vendor_key": string | null,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"shopify_location_id"?: string | null,"shopify_vendor": string,"shopify_vendor_key"?: never,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"shopify_location_id"?: string | null,"shopify_vendor"?: string,"shopify_vendor_key"?: never,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"must_change_password": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"must_change_password"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"must_change_password"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"shopify_order_lines": {
                  Row: {
                    "created_at": string,"current_quantity": number,"delivery_method": Database["public"]['Enums']["delivery_method"] | null,"discounted_total": number,"discounted_unit_price": number,"fulfillment_order_gid": string | null,"fulfillment_order_line_item_gid": string | null,"gid": string,"hardware_store_id": string | null,"image_url": string | null,"location_gid": string | null,"order_id": number,"original_total": number,"original_unit_price": number,"product_gid": string | null,"quantity": number,"sku": string | null,"title": string,"unfulfilled_quantity": number,"updated_at": string,"variant_gid": string | null,"variant_title": string | null,"vendor": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_quantity": number,"delivery_method"?: Database["public"]['Enums']["delivery_method"] | null,"discounted_total": number,"discounted_unit_price": number,"fulfillment_order_gid"?: string | null,"fulfillment_order_line_item_gid"?: string | null,"gid": string,"hardware_store_id"?: string | null,"image_url"?: string | null,"location_gid"?: string | null,"order_id": number,"original_total": number,"original_unit_price": number,"product_gid"?: string | null,"quantity": number,"sku"?: string | null,"title": string,"unfulfilled_quantity": number,"updated_at"?: string,"variant_gid"?: string | null,"variant_title"?: string | null,"vendor"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"current_quantity"?: number,"delivery_method"?: Database["public"]['Enums']["delivery_method"] | null,"discounted_total"?: number,"discounted_unit_price"?: number,"fulfillment_order_gid"?: string | null,"fulfillment_order_line_item_gid"?: string | null,"gid"?: string,"hardware_store_id"?: string | null,"image_url"?: string | null,"location_gid"?: string | null,"order_id"?: number,"original_total"?: number,"original_unit_price"?: number,"product_gid"?: string | null,"quantity"?: number,"sku"?: string | null,"title"?: string,"unfulfilled_quantity"?: number,"updated_at"?: string,"variant_gid"?: string | null,"variant_title"?: string | null,"vendor"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopify_order_lines_hardware_store_id_fkey"
      columns: ["hardware_store_id"]
isOneToOne: false
      referencedRelation: "hardware_stores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopify_order_lines_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "shopify_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"shopify_orders": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"closed_at": string | null,"currency": string,"customer_display_name": string | null,"financial_status": string | null,"fulfillment_status": string | null,"gid": string,"id": number,"is_test": boolean,"name": string,"processed_at": string,"shopify_created_at": string,"shopify_updated_at": string,"source_name": string | null,"synced_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"closed_at"?: string | null,"currency"?: string,"customer_display_name"?: string | null,"financial_status"?: string | null,"fulfillment_status"?: string | null,"gid": string,"id": number,"is_test"?: boolean,"name": string,"processed_at": string,"shopify_created_at": string,"shopify_updated_at": string,"source_name"?: string | null,"synced_at"?: string
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"closed_at"?: string | null,"currency"?: string,"customer_display_name"?: string | null,"financial_status"?: string | null,"fulfillment_status"?: string | null,"gid"?: string,"id"?: number,"is_test"?: boolean,"name"?: string,"processed_at"?: string,"shopify_created_at"?: string,"shopify_updated_at"?: string,"source_name"?: string | null,"synced_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"shopify_sync_state": {
                  Row: {
                    "cursor": string | null,"key": string,"last_error": string | null,"last_run_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cursor"?: string | null,"key": string,"last_error"?: string | null,"last_run_at"?: string | null
                  }
                  Update: {
                    "cursor"?: string | null,"key"?: string,"last_error"?: string | null,"last_run_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"shopify_webhook_events": {
                  Row: {
                    "error": string | null,"event_id": string,"processed_at": string | null,"received_at": string,"resource_gid": string | null,"shop_domain": string,"status": string,"topic": string
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"event_id": string,"processed_at"?: string | null,"received_at"?: string,"resource_gid"?: string | null,"shop_domain": string,"status"?: string,"topic": string
                  }
                  Update: {
                    "error"?: string | null,"event_id"?: string,"processed_at"?: string | null,"received_at"?: string,"resource_gid"?: string | null,"shop_domain"?: string,"status"?: string,"topic"?: string
                  }
                  Relationships: [
                    
                  ]
                },"store_order_pickup_codes": {
                  Row: {
                    "code_hash": string | null,"created_at": string,"failed_attempts": number,"hardware_store_id": string,"last_send_error": string | null,"locked_at": string | null,"order_id": number,"override_reason": string | null,"send_count": number,"sent_at": string | null,"sent_to_masked": string | null,"updated_at": string,"verification_method": string | null,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code_hash"?: string | null,"created_at"?: string,"failed_attempts"?: number,"hardware_store_id": string,"last_send_error"?: string | null,"locked_at"?: string | null,"order_id": number,"override_reason"?: string | null,"send_count"?: number,"sent_at"?: string | null,"sent_to_masked"?: string | null,"updated_at"?: string,"verification_method"?: string | null,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "code_hash"?: string | null,"created_at"?: string,"failed_attempts"?: number,"hardware_store_id"?: string,"last_send_error"?: string | null,"locked_at"?: string | null,"order_id"?: number,"override_reason"?: string | null,"send_count"?: number,"sent_at"?: string | null,"sent_to_masked"?: string | null,"updated_at"?: string,"verification_method"?: string | null,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "store_order_pickup_codes_order_id_hardware_store_id_fkey"
      columns: ["order_id","hardware_store_id"]
isOneToOne: true
      referencedRelation: "store_orders"
      referencedColumns: ["order_id","hardware_store_id"]
    }
                  ]
                },"store_order_status_events": {
                  Row: {
                    "changed_by": string | null,"created_at": string,"from_status": Database["public"]['Enums']["preparation_status"] | null,"hardware_store_id": string,"id": number,"order_id": number,"source": string,"to_status": Database["public"]['Enums']["preparation_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["preparation_status"] | null,"hardware_store_id": string,"id"?: never,"order_id": number,"source": string,"to_status": Database["public"]['Enums']["preparation_status"]
                  }
                  Update: {
                    "changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["preparation_status"] | null,"hardware_store_id"?: string,"id"?: never,"order_id"?: number,"source"?: string,"to_status"?: Database["public"]['Enums']["preparation_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "store_order_status_events_order_id_hardware_store_id_fkey"
      columns: ["order_id","hardware_store_id"]
isOneToOne: false
      referencedRelation: "store_orders"
      referencedColumns: ["order_id","hardware_store_id"]
    }
                  ]
                },"store_orders": {
                  Row: {
                    "created_at": string,"currency": string,"customer_display_name": string | null,"delivery_method": Database["public"]['Enums']["delivery_method"],"discount_amount": number,"financial_status": string | null,"gross_amount": number,"hardware_store_id": string,"is_test": boolean,"lines_count": number,"net_amount": number,"order_cancelled_at": string | null,"order_id": number,"order_name": string,"processed_at": string,"refunded_amount": number,"shopify_push_error": string | null,"shopify_push_status": string | null,"status": Database["public"]['Enums']["preparation_status"],"status_changed_at": string | null,"status_changed_by": string | null,"units": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: string,"customer_display_name"?: string | null,"delivery_method": Database["public"]['Enums']["delivery_method"],"discount_amount"?: number,"financial_status"?: string | null,"gross_amount"?: number,"hardware_store_id": string,"is_test"?: boolean,"lines_count"?: number,"net_amount"?: number,"order_cancelled_at"?: string | null,"order_id": number,"order_name": string,"processed_at": string,"refunded_amount"?: number,"shopify_push_error"?: string | null,"shopify_push_status"?: string | null,"status"?: Database["public"]['Enums']["preparation_status"],"status_changed_at"?: string | null,"status_changed_by"?: string | null,"units"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"customer_display_name"?: string | null,"delivery_method"?: Database["public"]['Enums']["delivery_method"],"discount_amount"?: number,"financial_status"?: string | null,"gross_amount"?: number,"hardware_store_id"?: string,"is_test"?: boolean,"lines_count"?: number,"net_amount"?: number,"order_cancelled_at"?: string | null,"order_id"?: number,"order_name"?: string,"processed_at"?: string,"refunded_amount"?: number,"shopify_push_error"?: string | null,"shopify_push_status"?: string | null,"status"?: Database["public"]['Enums']["preparation_status"],"status_changed_at"?: string | null,"status_changed_by"?: string | null,"units"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "store_orders_hardware_store_id_fkey"
      columns: ["hardware_store_id"]
isOneToOne: false
      referencedRelation: "hardware_stores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "store_orders_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "shopify_orders"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "store_sales_summary":
{ Args: { "p_from": string,"p_include_test"?: boolean,"p_store_id": string,"p_to": string }; Returns: {
              "avg_ticket": number,"discount_amount": number,"gross_amount": number,"net_amount": number,"orders": number,"pending_payment_net": number,"pickup_net": number,"pickup_orders": number,"refunded_amount": number,"shipping_net": number,"shipping_orders": number,"units": number
            }[]
                           },
"store_sales_timeseries":
{ Args: { "p_bucket"?: string,"p_from": string,"p_include_test"?: boolean,"p_store_id": string,"p_to": string }; Returns: {
              "bucket": string,"net_amount": number,"orders": number,"pickup_net": number,"shipping_net": number
            }[]
                           },
"store_top_products":
{ Args: { "p_from": string,"p_include_test"?: boolean,"p_limit"?: number,"p_store_id": string,"p_to": string }; Returns: {
              "net_amount": number,"product_gid": string,"title": string,"units": number
            }[]
                           }
          }
          Enums: {
            "delivery_method": "pickup"|"shipping"|"local_delivery"|"pickup_point"|"retail"|"none","member_role": "owner"|"staff","preparation_status": "preparing"|"ready_for_pickup"|"ready_to_ship"|"completed"|"cancelled"
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
            "delivery_method": ["pickup", "shipping", "local_delivery", "pickup_point", "retail", "none"],"member_role": ["owner", "staff"],"preparation_status": ["preparing", "ready_for_pickup", "ready_to_ship", "completed", "cancelled"]
          }
        }
} as const
