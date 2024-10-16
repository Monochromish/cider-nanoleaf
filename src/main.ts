import { defineCustomElement } from 'vue';
import type { App } from 'vue';
import { createPinia } from 'pinia';
import { definePluginContext } from '@ciderapp/pluginkit';
import MySettings from './components/MySettings.vue';
import PluginConfig from './plugin.config';
import { getAlbumMediaItem, waitForMusicKit, modifyCiderEffect } from './utils';

/**
 * Initializing a Vue app instance so we can use things like Pinia.
 */
const pinia = createPinia();

/**
 * Function that configures the app instances of the custom elements
 */
function configureApp(app: App) {
	app.use(pinia);
}

/**
 * Custom Elements that will be registered in the app
 */
export const CustomElements = {
	settings: defineCustomElement(MySettings, {
		shadowRoot: false,
		configureApp,
	}),
};

/**
 * Defining the plugin context
 */
const { plugin, setupConfig, customElementName, goToPage, useCPlugin } =
	definePluginContext({
		...PluginConfig,
		CustomElements,
		SettingsElement: `${PluginConfig.ce_prefix}-settings`,
		setup() {
			/**
			 * Registering the custom elements in the app
			 */
			for (const [key, value] of Object.entries(CustomElements)) {
				const _key = key as keyof typeof CustomElements;
				customElements.define(customElementName(_key), value);
			}

			waitForMusicKit().then(() => {
				MusicKit.getInstance().addEventListener(
					'nowPlayingItemDidChange',
					async (event: any) => {
						if (!event.item) return;

						let fetchId: string | null = null;
						let relationshipMode = false;

						if (event.item.attributes?.playParams?.catalogId) {
							fetchId = event.item.attributes.playParams.catalogId;
						} else if (event.item.relationships?.albums?.data?.[0]?.id) {
							fetchId = event.item.relationships.albums.data[0].id;
							relationshipMode = true;
						} else if (event.item.attributes?.playParams?.id) {
							fetchId = event.item.attributes.playParams.id;
						} else {
							console.warn(
								'[Adaptive Accents Everywhere] No identifiable album or song ID.',
								event.item
							);
						}

						if (!fetchId) return;

						const albumMediaItem = await getAlbumMediaItem(
							fetchId,
							relationshipMode
						);

						if (cfg && cfg.value.devices.length > 0) {
							cfg.value.devices.forEach(
								async (credential: NanoleafCredentials) => {
									if (
										!credential.localIP ||
										!credential.localPort ||
										!credential.accessToken
									) {
										console.log('Try reconnecting your nanoleaf panels');
										return;
									}
									await modifyCiderEffect(
										credential.localIP,
										credential.accessToken,
										[
											albumMediaItem.attributes.artwork.textColor1,
											albumMediaItem.attributes.artwork.textColor2,
											albumMediaItem.attributes.artwork.textColor3,
											albumMediaItem.attributes.artwork.textColor4,
										]
									);
								}
							);
						}
					}
				);
			});
		},
	});

/**
 * Some boilerplate code for our own configuration
 */
type NanoleafCredentials = {
	localIP: string | undefined;
	localPort: number | undefined;
	accessToken: string | undefined;
};

export const cfg = setupConfig({
	devices: [] as NanoleafCredentials[],
});

export function useConfig() {
	return cfg.value;
}
/**
 * Exporting the plugin and functions
 */
export { setupConfig, customElementName, goToPage, useCPlugin };

/**
 * Exporting the plugin, Cider will use this to load the plugin
 */
export default plugin;
