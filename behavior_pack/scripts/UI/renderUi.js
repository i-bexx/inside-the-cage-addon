export function renderUnifiedUi(player, cache) {
    if (!cache) return;
    
    // Combine both strings to check if anything visually changed
    const combined = cache.titleString + "|" + cache.subtitleString;
    
    if (cache.lastRenderedUi !== combined) {
        cache.lastRenderedUi = combined;
        player.onScreenDisplay.setTitle(cache.titleString, {
            subtitle: cache.subtitleString,
            fadeInDuration: 0,
            stayDuration: 200, // Stays for 10 seconds to prevent fading out
            fadeOutDuration: 0
        });
    }
}
