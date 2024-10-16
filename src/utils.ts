import { useCider } from '@ciderapp/pluginkit';
const CiderApp = useCider();

const storefrontId = localStorage.getItem('appleMusic.storefront') ?? 'auto';

/**
 * Fetches the full MediaItem for an album given its ID or a song's catalog ID (don't use this anywhere else, it works for me, but might fail at any time, ahhh)
 * @param id The ID of the album or the catalog ID of a song
 * @returns Promise<MusicKit.MediaItem> The full MediaItem for the album
 */
export async function getAlbumMediaItem(
	id: string,
	relationshipMode: boolean = false
): Promise<MusicKit.MediaItem> {
	try {
		let albumId = id;
		const isLibraryItem = id.startsWith('i.');
		let endpoint;

		if (relationshipMode === true) {
			endpoint = `/v1/catalog/${storefrontId}/albums/${albumId}`;
		} else {
			// If it's a song ID, we need to fetch the album ID first
			if (!isLibraryItem && !id.includes('l.')) {
				const songEndpoint = `/v1/catalog/${storefrontId}/songs/${id}`;
				const songResponse = await CiderApp.v3(songEndpoint, {
					fields: 'albums',
				});
				if (
					!songResponse.data?.data?.[0]?.relationships?.albums?.data?.[0]?.id
				) {
					throw new Error(
						'[Adaptive Accents Everywhere] Album not found for the given song'
					);
				}
				albumId = songResponse.data.data[0].relationships.albums.data[0].id;
			}

			// Now we have the album ID, so we can fetch the album data
			endpoint = isLibraryItem
				? `/v1/me/library/albums/${albumId}`
				: `/v1/catalog/${storefrontId}/albums/${albumId}`;
		}

		const response = await CiderApp.v3(endpoint, {
			include: 'tracks',
			fields:
				'artistName,artistUrl,artwork,contentRating,editorialArtwork,editorialNotes,name,playParams,releaseDate,trackCount,url',
		});

		if (!response.data?.data?.[0]) {
			throw new Error('[Adaptive Accents Everywhere] Album not found');
		}

		const mediaItem: MusicKit.MediaItem = response.data.data[0];

		// Ensure the href is set correctly
		if (!mediaItem.href) {
			mediaItem.href = `/v1/${isLibraryItem ? 'me/library' : `catalog/${storefrontId}`}/albums/${albumId}`;
		}

		return mediaItem;
	} catch (error) {
		console.error(
			'[Adaptive Accents Everywhere] Error fetching album MediaItem:',
			error
		);
		throw error;
	}
}

export function waitForMusicKit(): Promise<void> {
	return new Promise(resolve => {
		const interval = setInterval(() => {
			if (MusicKit.getInstance()) {
				clearInterval(interval);
				resolve();
			}
		}, 100);
	});
}

type HSBColor = {
	hue: number;
	saturation: number;
	brightness: number;
};
export function hexToHSB(hex: string): HSBColor {
	let r = 0,
		g = 0,
		b = 0;

	if (hex.startsWith('#')) {
		hex = hex.substring(1);
	}

	if (hex.length === 3) {
		r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
		g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
		b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
	} else if (hex.length === 6) {
		r = parseInt(hex.substring(0, 2), 16);
		g = parseInt(hex.substring(2, 4), 16);
		b = parseInt(hex.substring(4, 6), 16);
	} else {
		throw new Error('Invalid hex color format');
	}

	r /= 255;
	g /= 255;
	b /= 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	const d = max - min;
	const s = max === 0 ? 0 : d / max;
	const v = max;

	if (max !== min) {
		if (max === r) {
			h = (g - b) / d + (g < b ? 6 : 0);
		} else if (max === g) {
			h = (b - r) / d + 2;
		} else if (max === b) {
			h = (r - g) / d + 4;
		}
		h *= 60;
	}

	return {
		hue: Math.round(h),
		saturation: Math.round(s * 100),
		brightness: Math.round(v * 100),
	};
}

export async function modifyCiderEffect(
	ip: string,
	accessToken: string,
	colors: string[]
) {
	const url = `http://${ip}:16021/api/v1/${accessToken}/effects`;

	const hsbColors = colors.map(color => hexToHSB(color));

	const effect = {
		write: {
			command: 'add',
			version: '1.0',
			animName: 'cider',
			animType: 'flow',
			colorType: 'HSB',
			palette: hsbColors,
			pluginOptions: [
				{
					name: 'transTime',
					value: 1,
				},
				{
					name: 'direction',
					value: 'left',
				},
				{
					name: 'loop',
					value: true,
				},
			],
		},
	};

	try {
		const response = await fetch(url, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(effect),
		});

		if (!response.ok) {
			throw new Error(`Failed to create effect: ${response.status}`);
		}

		const result = await response.json();
		console.log(result);
	} catch (error) {
		console.error('Error creating effect:', error);
	}
}
