import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarDisplayProps {
  videoFilename?: string;
  nextVideoFilename?: string; // Add next video to preload
  isAudioEnabled: boolean;
  onVideoLoaded?: () => void; // Callback when video is loaded
}

export function AvatarDisplay({
  videoFilename,
  nextVideoFilename,
  isAudioEnabled,
  onVideoLoaded,
}: AvatarDisplayProps) {
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const hasPlayedVideo = useRef<boolean>(false);
  const preloadCache = useRef<Set<string>>(new Set());
  const [primarySrc, setPrimarySrc] = useState<string>("");
  const [secondarySrc, setSecondarySrc] = useState<string>("");

  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const [secondaryVideoOpacity, setSecondaryVideoOpacity] = useState(0);

  // Handle video initialization and transitions with a single effect
  useEffect(() => {
    // Skip if no filename provided
    if (!videoFilename) return;

    // Generate the full path
    const newVideoPath = `/videos/${videoFilename}`;

    // Add to preload cache to track what we've loaded
    preloadCache.current.add(videoFilename);

    // Case 1: Initial load - set primary source directly
    if (!primarySrc) {
      console.log(
        "[AvatarDisplay] Setting initial video source:",
        videoFilename,
      );
      // Add cache-busting query parameter
      const timestamp = new Date().getTime();
      setPrimarySrc(`${newVideoPath}?t=${timestamp}`);
      return;
    }

    // Case 2: Same video - do nothing
    if (primarySrc === newVideoPath) {
      console.log("[AvatarDisplay] Video unchanged:", videoFilename);
      return;
    }

    // Case 3: Already transitioning - don't start another transition
    if (isTransitioning) {
      console.log("[AvatarDisplay] Ignoring video change during transition");
      return;
    }

    // Case 4: New video needs to be loaded - start transition
    console.log(
      `[AvatarDisplay] Video changing from ${primarySrc} to ${newVideoPath}`,
    );
    setIsTransitioning(true);

    // Load the new video in the secondary player
    // Add cache-busting query parameter
    const timestamp = new Date().getTime();
    setSecondarySrc(`${newVideoPath}?t=${timestamp}`);

    // Secondary video will handle the rest in its onLoadedData event
  }, [videoFilename, primarySrc, isTransitioning]);

  // Play video when audio is enabled
  useEffect(() => {
    // Skip if we don't have a video or audio is disabled
    if (!isAudioEnabled || !primaryVideoRef.current || !primarySrc) {
      return;
    }

    console.log(
      "[AvatarDisplay] Audio enabled, ensuring video plays with audio",
    );

    // Always ensure the primary video is not muted
    if (primaryVideoRef.current.muted) {
      console.log("[AvatarDisplay] Unmuting primary video");
      primaryVideoRef.current.muted = false;
    }

    // If it's first time playback, play the video
    if (!hasPlayedVideo.current) {
      console.log("[AvatarDisplay] Playing video for first time");
      hasPlayedVideo.current = true;
      primaryVideoRef.current
        .play()
        .catch((e) =>
          console.error("[AvatarDisplay] Initial autoplay failed:", e),
        );
    }
  }, [isAudioEnabled, primarySrc]);

  // Handle secondary video loaded event for crossfade
  useEffect(() => {
    if (!secondaryVideoRef.current || !secondarySrc || !isTransitioning) return;

    const handleSecondaryLoaded = () => {
      console.log("[AvatarDisplay] Secondary video loaded, starting crossfade");

      // Keep track of the current video elements to prevent race conditions
      const primaryVideo = primaryVideoRef.current;
      const secondaryVideo = secondaryVideoRef.current;

      if (!primaryVideo || !secondaryVideo) return;

      // Important: Completely mute the primary video immediately
      primaryVideo.muted = true;

      // Ensure secondary video starts from the beginning
      secondaryVideo.currentTime = 0;

      // Start playing with audio (not muted)
      secondaryVideo.muted = false;
      secondaryVideo
        .play()
        .catch((e) =>
          console.error("[AvatarDisplay] Secondary video autoplay failed:", e),
        );

      // Start crossfade animation
      setVideoOpacity(0);
      setSecondaryVideoOpacity(1);

      // Swap videos after transition completes
      setTimeout(() => {
        console.log(
          "[AvatarDisplay] Crossfade transition complete, cleaning up old video",
        );

        // Explicitly pause and unload the old primary video
        if (primaryVideo) {
          primaryVideo.pause();
          primaryVideo.src = "";
          primaryVideo.load();
        }

        // Now make the secondary video the primary one
        setPrimarySrc(secondarySrc);
        setSecondarySrc(""); // Clear secondary source to prevent double loading

        // Reset opacity for next transition
        setVideoOpacity(1);
        setSecondaryVideoOpacity(0);

        // End transition state
        setIsTransitioning(false);

        console.log(
          "[AvatarDisplay] Crossfade complete, new video is now primary",
        );
      }, 500);
    };

    // Add event listener for the loaded event - use once to prevent duplicates
    const secondaryVideo = secondaryVideoRef.current;
    secondaryVideo.addEventListener("loadeddata", handleSecondaryLoaded, {
      once: true,
    });

    // Cleanup
    return () => {
      if (secondaryVideo) {
        secondaryVideo.removeEventListener("loadeddata", handleSecondaryLoaded);
      }
    };
  }, [secondarySrc, isTransitioning]);

  // Preload next video using fetch API
  useEffect(() => {
    if (!nextVideoFilename || isTransitioning || !isAudioEnabled) return;

    // Skip if already preloaded
    if (preloadCache.current.has(nextVideoFilename)) {
      console.log(`[AvatarDisplay] Already preloaded: ${nextVideoFilename}`);
      return;
    }

    console.log(`[AvatarDisplay] Preloading next video: ${nextVideoFilename}`);
    preloadCache.current.add(nextVideoFilename);

    // Use fetch for preloading
    fetch(`/videos/${nextVideoFilename}`)
      .then((response) => {
        if (response.ok) {
          console.log(
            `[AvatarDisplay] Successfully preloaded: ${nextVideoFilename}`,
          );
        } else {
          console.error(
            `[AvatarDisplay] Failed to preload: ${nextVideoFilename}`,
          );
        }
      })
      .catch((error) => {
        console.error(
          `[AvatarDisplay] Error preloading: ${nextVideoFilename}`,
          error,
        );
      });
  }, [nextVideoFilename, isTransitioning, isAudioEnabled]);

  // Clear secondary video when it's no longer needed
  useEffect(() => {
    if (!isTransitioning && secondarySrc) {
      console.log("[AvatarDisplay] Clearing unused secondary video source");

      // Set a small timeout to ensure we're not in the middle of a transition
      const clearTimer = setTimeout(() => {
        if (secondaryVideoRef.current) {
          secondaryVideoRef.current.pause();
          secondaryVideoRef.current.src = "";
          secondaryVideoRef.current.load();
        }
        setSecondarySrc("");
      }, 100);

      return () => clearTimeout(clearTimer);
    }
  }, [isTransitioning, secondarySrc]);

  // Report when primary video is loaded
  useEffect(() => {
    if (!primaryVideoRef.current || !primarySrc) return;

    const handleVideoLoaded = () => {
      console.log("[AvatarDisplay] Primary video loaded successfully");
      setIsVideoLoaded(true);

      if (onVideoLoaded) {
        onVideoLoaded();
      }
    };

    // Add event listener
    primaryVideoRef.current.addEventListener("loadeddata", handleVideoLoaded, {
      once: true,
    });

    // Cleanup
    return () => {
      primaryVideoRef.current?.removeEventListener(
        "loadeddata",
        handleVideoLoaded,
      );
    };
  }, [primarySrc, onVideoLoaded]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (primaryVideoRef.current) {
        primaryVideoRef.current.pause();
        primaryVideoRef.current.removeAttribute("src");
      }
      if (secondaryVideoRef.current) {
        secondaryVideoRef.current.pause();
        secondaryVideoRef.current.removeAttribute("src");
      }
    };
  }, []);

  // Handle video loading errors
  const handleVideoError = (e: any) => {
    console.error(`[AvatarDisplay] Error loading video:`, e);
    // Try to reload the video after a short delay
    setTimeout(() => {
      if (primarySrc) {
        const timestamp = new Date().getTime();
        console.log(`[AvatarDisplay] Attempting to reload video with new timestamp`);
        // Add cache-busting query parameter
        const newSrc = `${primarySrc.split("?")[0]}?t=${timestamp}`;
        setPrimarySrc(newSrc);
      }
    }, 1000);
  };

  console.log("[AvatarDisplay] Rendering with props:", {
    videoFilename,
    nextVideoFilename,
    isAudioEnabled,
    isVideoLoaded,
    isTransitioning,
    primarySrc: primarySrc.split("/").pop(),
    secondarySrc: secondarySrc.split("/").pop(),
  });

  if (!videoFilename) {
    return <Skeleton className="w-full aspect-video rounded-lg" />;
  }

  if (!isAudioEnabled) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <p className="text-white">Please enable audio to watch the video</p>
      </Card>
    );
  }

  return (
    <Card className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
      {/* Primary video */}
      {primarySrc && (
        <video
          ref={primaryVideoRef}
          className="w-full h-full absolute inset-0 transition-opacity duration-500"
          style={{ opacity: videoOpacity }}
          autoPlay={isAudioEnabled}
          playsInline
          muted={false}
          preload="auto"
          src={
            primarySrc.startsWith("/videos")
              ? primarySrc
              : `/videos/${primarySrc.split("/").pop()}`
          }
          onError={handleVideoError} // Add error handler
          onLoadedData={() => {
            // Ensure video is not muted when loaded
            if (primaryVideoRef.current) {
              primaryVideoRef.current.muted = false;
              console.log(
                "[AvatarDisplay] Ensuring primary video is not muted on load",
              );
            }
          }}
        />
      )}

      {/* Secondary video for transitions */}
      {secondarySrc && (
        <video
          ref={secondaryVideoRef}
          className="w-full h-full absolute inset-0 transition-opacity duration-500"
          style={{ opacity: secondaryVideoOpacity }}
          playsInline
          muted={false}
          preload="auto"
          src={
            secondarySrc.startsWith("/videos")
              ? secondarySrc
              : `/videos/${secondarySrc.split("/").pop()}`
          }
          onError={handleVideoError} // Add error handler
        />
      )}
    </Card>
  );
}