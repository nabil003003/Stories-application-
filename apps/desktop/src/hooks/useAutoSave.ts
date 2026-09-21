import { useEffect, useRef } from "react";
import { updateExistingProject, createNewProject } from "../services/projectService";
import { useStudioStore } from "../store/useStudioStore";

/**
 * StoryForge Studio — Production Autosave Hook
 * Automatically persists project modifications to SQLite every 5 seconds
 * and notifies the user with a subtle save toast.
 */
export function useAutoSave() {
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const storyTitle = useStudioStore((s) => s.storyTitle);
  const primaryLang = useStudioStore((s) => s.primaryLang);
  const storyMode = useStudioStore((s) => s.storyMode);
  const storySynopsis = useStudioStore((s) => s.storySynopsis);
  const backgroundTrack = useStudioStore((s) => s.backgroundTrack);
  const musicVolume = useStudioStore((s) => s.musicVolume);
  const lines = useStudioStore((s) => s.lines);
  const characters = useStudioStore((s) => s.characters);
  const setSaveStatusMessage = useStudioStore((s) => s.setSaveStatusMessage);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJsonRef = useRef<string>("");

  useEffect(() => {
    const payload = {
      title: storyTitle,
      language: primaryLang,
      story_mode: storyMode,
      synopsis: storySynopsis,
      background_track: backgroundTrack,
      music_volume: musicVolume,
      lines,
      characters,
    };

    const currentJson = JSON.stringify(payload);
    if (currentJson === lastSavedJsonRef.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        if (activeProjectId) {
          await updateExistingProject(activeProjectId, payload);
        } else if (lines.length > 0 && lines.some((l) => l.text.trim())) {
          const created = await createNewProject(payload);
          useStudioStore.getState().setActiveProjectId(created.id);
        }
        lastSavedJsonRef.current = currentJson;
        const timeStr = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setSaveStatusMessage(`Project saved at ${timeStr}`);
        setTimeout(() => {
          setSaveStatusMessage(null);
        }, 3500);
      } catch (err) {
        console.warn("[AutoSave] Failed to save project:", err);
      }
    }, 5_000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    activeProjectId,
    storyTitle,
    primaryLang,
    storyMode,
    storySynopsis,
    backgroundTrack,
    musicVolume,
    lines,
    characters,
    setSaveStatusMessage,
  ]);
}
