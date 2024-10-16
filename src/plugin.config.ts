import { createId } from '@paralleldrive/cuid2';

/**
 * Plugin configuration.
 */
export default {
	ce_prefix: createId(),
	identifier: 'cider.monochromish.nanoleaf',
	name: 'Nanoleaf',
	description: 'Integrate your Nanoleaf lights with Cider.',
	version: '0.0.1',
	author: 'Monochromish',
	repo: 'https://github.com/monochromish/nanoleaf',
	entry: {
		'plugin.js': {
			type: 'main',
		},
	},
};
