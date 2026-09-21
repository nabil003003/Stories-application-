/**
 * StoryForge Studio — Story & Project Schema Specifications
 */

export interface ProjectManifest {
  schema_version: string;
  id: string;
  name: string;
  default_language: "ar" | "en" | "fr" | string;
  created_at: string;
  modified_at: string;
  app_version: string;
}
