<script setup lang="ts">
import { ref, computed } from 'vue';
import { useConfig } from '../main';
import { mDNSDiscover } from '@ciderapp/pluginkit/mDNS';

const cfg = useConfig();
const searching = ref(false);
const auroraDevices = ref<AuroraDevice[]>([]);

interface AuroraDevice {
	name: string;
	address: string;
	port: number;
}

type NanoleafCredentials = {
	localIP: string | undefined;
	localPort: number | undefined;
	accessToken: string | undefined;
};

async function discoverAuroraDevices() {
	searching.value = true;

	try {
		const mdnsDevices = await mDNSDiscover({
			tcp_service: 'nanoleafapi',
			timeout: 2500,
		});

		const uniqueAddresses = new Set();
		auroraDevices.value = mdnsDevices
			.filter(device => {
				if (uniqueAddresses.has(device.addresses[0])) {
					return false;
				}
				uniqueAddresses.add(device.addresses[0]);
				return true;
			})
			.map(device => ({
				name: device.fullname,
				address: device.addresses[0],
				port: device.port,
			}));
	} catch (error) {
		console.error('Error discovering devices:', error);
	} finally {
		searching.value = false;
	}
}

function disconnectDevice(device: AuroraDevice) {
	const index = cfg.devices.findIndex(
		(d: NanoleafCredentials) =>
			d.localIP === device.address && d.localPort === device.port
	);

	if (index !== -1) {
		cfg.devices.splice(index, 1);
	}
}

async function connectToDevice(device: AuroraDevice) {
	const url = `http://${device.address}:${device.port}/api/v1/new`;

	try {
		const response = await fetch(url, { method: 'POST' });
		if (!response.ok) throw new Error('Failed to create access token');
		const data: { auth_token: string } = await response.json();

		const newCredential: NanoleafCredentials = {
			localIP: device.address,
			localPort: device.port,
			accessToken: data.auth_token,
		};

		cfg.devices.push(newCredential);
	} catch (error) {
		console.error('Access token request failed:', error);
	}
}

const isDeviceConnected = (device: AuroraDevice) => {
	return computed(() =>
		cfg.devices.some(
			(cred: NanoleafCredentials) =>
				cred.localIP === device.address && cred.localPort === device.port
		)
	);
};
</script>

<template>
	<div class="q-px-lg plugin-base">
		<div class="shelf-title">
			Nanoleaf Integration: Change color of your panels based on currently
			playing song
		</div>
		<div class="text-caption">
			Ensure the panels are connected to the same network as this device and is
			in discovery mode. Discovery mode allows this plugin to find your Nanoleaf
			devices on your local network. To put your Nanoleaf devices in discovery
			mode, press and hold the power button on the controller until the LED
			indicator starts blinking
		</div>
		<button
			class="full-width c-btn primary"
			:disabled="searching"
			@click="discoverAuroraDevices"
		>
			{{ searching ? 'Searching...' : 'Search' }}
		</button>
		<div
			v-for="device in auroraDevices"
			:key="device.address"
			class="device-item"
		>
			<div class="device-info">
				<h3 class="device-name">{{ device.name }}</h3>
				<p class="text-caption">{{ device.address }}</p>
			</div>
			<button
				flat
				color="primary"
				@click="
					isDeviceConnected(device).value
						? disconnectDevice(device)
						: connectToDevice(device)
				"
			>
				{{ isDeviceConnected(device).value ? 'Disconnect' : 'Connect' }}
			</button>
		</div>
	</div>
</template>

<style scoped>
div {
	margin: 10px 0;
}

.device-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16px;
	background-color: color-mix(in srgb, transparent 90%, var(--systemSecondary));
	border-radius: 8px;
	color: white;
}

.device-info {
	flex-grow: 1;
}

.device-name {
	font-size: 15px;
	font-weight: 500;
	margin: 0;
}

.connect-btn {
	padding: 8px 16px;
	background-color: #2ecc71;
	color: #ffffff;
	border: none;
	border-radius: 4px;
	font-size: 14px;
	cursor: pointer;
	transition: background-color 0.3s;
	display: flex;
	align-items: center;
}

.connect-btn:hover {
	background-color: #27ae60;
}

.connect-btn.connected {
	background-color: #e74c3c;
}

.connect-btn.connected:hover {
	background-color: #c0392b;
}
</style>
