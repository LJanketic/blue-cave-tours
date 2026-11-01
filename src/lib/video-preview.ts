/**
 * Labels for the homepage video preview (spec §6.1.4, §11.11). Pure, so the
 * wording is unit-tested without rendering the component.
 */

function assertDuration(seconds: number): void {
	if (!Number.isInteger(seconds) || seconds <= 0) {
		throw new Error(`Video duration must be a whole number of seconds above 0, got ${seconds}`);
	}
}

/** "0:22", "1:05": the on-screen meta. */
export function formatVideoDuration(seconds: number): string {
	assertDuration(seconds);
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

/** "22 seconds", "1 minute", "1 minute 5 seconds": the spoken length. */
export function spokenVideoDuration(seconds: number): string {
	assertDuration(seconds);
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	const parts: string[] = [];
	if (m) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
	if (s) parts.push(`${s} ${s === 1 ? 'second' : 'seconds'}`);
	return parts.join(' ');
}

/** The play button's accessible name. */
export function videoPlayLabel(seconds: number): string {
	return `Play the tour preview video, ${spokenVideoDuration(seconds)}, no sound`;
}

/** The meta line over the poster. */
export function videoMetaText(seconds: number): string {
	return `${formatVideoDuration(seconds)} · A day on the water`;
}

/**
 * Checks the config before it ships: a self-hosted MP4 under /media/ (CSP is
 * media-src 'self'; §3.4) and a real description (§11.11).
 */
export function assertHomeVideo(video: { src: string; durationSeconds: number; description: string }): void {
	if (!/^\/media\/[\w.-]+\.mp4$/.test(video.src)) {
		throw new Error(`HOME_VIDEO.src must be a self-hosted MP4 under /media/, got "${video.src}"`);
	}
	assertDuration(video.durationSeconds);
	if (!video.description.trim()) throw new Error('HOME_VIDEO.description must describe the footage');
}
